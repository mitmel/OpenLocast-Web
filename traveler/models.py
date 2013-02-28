import cgi
import httplib
import settings
import urllib
import urlparse


from django.core.urlresolvers import reverse
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from django.contrib.gis.db import models as gismodels
from django.contrib.gis.db.models.manager import GeoManager
from django.core.exceptions import ObjectDoesNotExist
from django.utils import simplejson, timezone
from django.utils.translation import ugettext_lazy as _

from locast.api import cache, datetostr
from locast.models import interfaces, modelbases, managers
from locast.models import ModelBase

from sorl.thumbnail import get_thumbnail
from sorl.thumbnail.helpers import ThumbnailError

def l_get_thumbnail(*args, **kwargs):
    try:
        return get_thumbnail(*args, **kwargs)
    except (IOError, ThumbnailError):
        return None

# DEPENDENCIES

class Tag(modelbases.Tag): pass

class Comment(modelbases.Comment,
        interfaces.Flaggable): 

    # TODO: this should be more generic incase anything else becomes commentable
    @models.permalink
    def get_api_uri(self):
        return ('cast_comments_api_single', [self.content_object.id, self.id])

    def get_absolute_url(self):
        return self.content_object.get_absolute_url()

class Flag(modelbases.Flag): pass

class UserActivity(modelbases.UserActivity): pass

class Boundry(modelbases.Boundry): pass

# MAIN MODELS

class LocastUserManager(GeoManager, 
        managers.LocastUserManager): pass


class LocastUser(modelbases.LocastUser, 
        interfaces.Locatable):

    @models.permalink
    def get_api_uri(self):
        return ('user_api_single', [str(self.id)])

    def __unicode__(self):
        if self.email:
            return u'%s' % self.email
        else:
            return u'%s' % self.username

    def api_serialize(self, request):
        d = {'joined' : datetostr(self.date_joined)}
        profile = None
        try:
            profile = self.get_profile()
        except ObjectDoesNotExist:
            pass

        if ( profile ):
            d['profile'] = profile.api_serialize(request)

        return d


class LocastUserProfile(ModelBase):
    user = models.OneToOneField(LocastUser)

    user_image = models.ImageField(upload_to='user_images/%Y/%m/', null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    personal_url = models.URLField(null=True, blank=True)
    hometown = models.CharField(max_length=128, null=True, blank=True)

    @property
    def user_image_small(self):
        if self.user_image:
            return l_get_thumbnail(self.user_image, '150', quality=75)

    def api_serialize(self, request):
        d = {}
        if self.user_image:
            d['user_image'] = self.user_image.url
        
        if self.user_image_small:
            d['user_image_small'] = self.user_image_small.url

        if self.bio:
            d['bio'] = self.bio

        if self.personal_url:
            d['personal_url'] = self.personal_url

        if self.hometown:
            d['hometown'] = self.hometown

        return d


# A collection of casts
class Collection(ModelBase,
        interfaces.Authorable,
        interfaces.Titled,
        interfaces.Taggable, 
        interfaces.Favoritable):

    @models.permalink
    def get_api_uri(self):
        return ('collection_api_single', [str(self.id)])

    class Meta:
        verbose_name = _('collection')
        verbose_name_plural = _('collections')

    def __unicode__(self):
        return u'(id: %s) %s' % (str(self.id), self.title)

    def api_serialize(self, request):
        d = {}
        if self.path:
            d['path'] = self.path.coords
        d['casts'] = reverse('collection_cast_api', kwargs={'coll_id':self.id})

        d['casts_count'] = self.related_casts.count()

        if self.preview_image:
            d['preview_image'] = self.preview_image.url

        if self.thumbnail:
            d['thumbnail'] = self.thumbnail.url

        return d

    def geojson_properties(self, request):
        d = {}
        d['id'] = self.id
        d['title'] = self.title
        d['casts_count'] = self.related_casts.count()
        d['favorites'] = self.favorited_by.count()

        if self.preview_image:
            d['preview_image'] = self.preview_image.url

        if self.thumbnail:
            d['thumbnail'] = self.thumbnail.url

        return d

    objects = GeoManager() 

    related_casts = models.ManyToManyField('Cast', null=True, blank=True)
    
    path = gismodels.LineStringField(null=True,blank=True,srid=4326)  

    preview_image = models.ImageField(upload_to='content_images', null=True, blank=True)

    @property
    def thumbnail(self):
        return l_get_thumbnail(self.preview_image, '600', quality=75)


class Cast(ModelBase,
        interfaces.PrivatelyAuthorable, 
        interfaces.Titled, 
        interfaces.Commentable,
        interfaces.Favoritable,
        interfaces.Flaggable, 
        interfaces.Locatable, 
        interfaces.Taggable):

    @models.permalink
    def get_api_uri(self):
        return ('cast_api_single', [str(self.id)])

    def get_absolute_url(self):
        return reverse('frontpage') + '#!cast/' + str(self.id) + '/'

    class Meta:
        verbose_name = _('cast')

    def __unicode__(self):
        return u'%s (id: %s)' % (self.title, str(self.id))

    datetime = models.DateTimeField('Date and Time', default = timezone.now, null=True, blank=True)

    objects = GeoManager()

    def api_serialize(self, request):
        d = {}

        d['collections'] = []
        for i in self.collection_set.all():
            d['collections'].append(i.get_api_uri())

        if self.datetime:
            d['datetime'] = datetostr(self.datetime)

        d['media'] = reverse('cast_media_api', kwargs={'cast_id':self.id})
        d['comments'] = reverse('cast_comments_api', kwargs={'cast_id':self.id})

        if self.preview_image:
            d['preview_image'] = self.preview_image

        return d

    def geojson_properties(self, request):
        d = {}
        d['id'] = self.id
        d['title'] = self.title
        d['author'] = {'id' : self.author.id, 'display_name' : self.author.display_name }

        if self.datetime:
            d['datetime'] = datetostr(self.datetime)
        
        if self.preview_image:
            d['preview_image'] = self.preview_image

        if self.thumbnail:
            d['thumbnail'] = self.thumbnail.url

        d['favorites'] = self.favorited_by.count()

        return d

    # Returns the url of the preview image
    @property
    def preview_image(self):
        if len(self.imagemedia):
            image = self.imagemedia[0].content
            if image and image.file and image.medium_file:
                return image.medium_file.url

        elif len(self.videomedia):
            vid = self.videomedia[0].content
            if vid and vid.screenshot:
                return vid.screenshot.url

        elif len(self.linkedmedia):
            vid = self.linkedmedia[0].content
            if vid and vid.screenshot:
                return vid.screenshot

        return None

    @property
    def thumbnail(self):
        if self.preview_image:
            return l_get_thumbnail(self.preview_image, '150', quality=75)

        return None

    @property
    def videomedia(self):
        return self.media_set.filter(content_type_model='videomedia')

    @property
    def imagemedia(self):
        return self.media_set.filter(content_type_model='imagemedia')

    @property
    def linkedmedia(self):
        return self.media_set.filter(content_type_model='linkedmedia')

CAST_GEO_GROUP = 'cast_geo'

@receiver(signals.post_save, sender=Cast)
@receiver(signals.post_delete, sender=Cast)
def _clear_cast_geo_cache(sender, **kwargs):
    cache.incr_group(CAST_GEO_GROUP)


class Media(modelbases.LocastContent,
        interfaces.Authorable,
        interfaces.Locatable):

    @models.permalink
    def get_api_uri(self):
        return ('cast_media_api_single', [str(self.cast.id), str(self.id)])

    def api_serialize(self, request):
        d = {}
        d['language'] = self.language

        if self.caption:
            d['caption'] = self.caption

        if self.capture_time:
            d['capture_time'] = datetostr(self.capture_time)

        if self.cast:
            d['cast'] = self.cast.get_api_uri()

        return d 

    objects = GeoManager()

    # Caption length borrowed from pinterest.
    caption = models.CharField(max_length=500, null=True, blank=True)

    language = models.CharField(max_length=90,choices=settings.LANGUAGES, default='en')

    cast = models.ForeignKey(Cast, null=True, blank=True)
    
    capture_time = models.DateTimeField('date and time captured', null=True, blank=True)

    
class VideoMedia(Media, 
        modelbases.VideoContent):

    class Meta:
        verbose_name = _('video')

    def __unicode__(self):
        un = u'id: %s' % self.id
        if self.cast:
            un = un + u' (cast: %s)' % str(self.cast.id)

        return un

    def pre_save(self):
        if self.content_state == Media.STATE_INCOMPLETE:

            # If a file exists, that is good enough to be complete
            if self.file and self.file.size:
                self.content_state = Media.STATE_COMPLETE

    def process(self, force_update=False, verbose=False):

        # If the video is complete, start generating things.
        if self.content_state == Media.STATE_COMPLETE or force_update:
            self.content_state = Media.STATE_PROCESSING
            self.generate_screenshot(force_update=force_update, verbose=verbose)
            self.generate_web_stream(force_update=force_update, verbose=verbose)
            self.make_mobile_streamable()
            self.content_state = Media.STATE_FINISHED
            self.save()


class ImageMedia(Media, 
        modelbases.ImageContent):
    
    class Meta:
        verbose_name = _('photo')

    def __unicode__(self):
        un = u'id: %s' % self.id
        if self.cast:
            un = un + u' (cast: %s)' % str(self.cast.id)

    # Overwrite the ImageContent.content_api_serialize method to provide
    # thumbnails
    def content_api_serialize(self, request=None):
        d = {}
        if self.file:
            d['resources'] = {}
            d['resources']['primary'] = self.serialize_resource(self.file.url)

            if self.medium_file:
                d['resources']['medium'] = self.serialize_resource(self.medium_file.url)

            if self.thumbnail:
                d['resources']['thumbnail'] = self.serialize_resource(self.thumbnail.url)

        return d
    
    @property
    def thumbnail(self):
        return l_get_thumbnail(self.file, '150', quality=75)

    @property
    def medium_file(self):
        return l_get_thumbnail(self.file, '600', quality=75)

    def process(self):
        pass


CONTENT_PROVIDERS = (
    ('youtube.com', 'YouTube'),
    ('vimeo.com', 'Vimeo')
)

class LinkedMedia(Media):

    class Meta:
        verbose_name = _('link')

    url = models.URLField(verify_exists=True)

    screenshot = models.URLField(verify_exists=True, null=True, blank=True)

    content_provider = models.CharField(max_length=32, choices=CONTENT_PROVIDERS)

    video_id = models.CharField(max_length=32)
    
    def content_api_serialize(self, request=None):
        d = dict(url=self.url)

        if self.screenshot:
            d['resources'] = {
                'screenshot' : self.serialize_resource(self.screenshot)
            }

        if self.content_provider:
            d['content_provider'] = self.content_provider

        return d

    def pre_save(self):
        if self.url and not self.video_id:
            self.process()

    def process(self):

        # Check if the link exists
        url_data = urlparse.urlparse(self.url)
        conn = httplib.HTTPConnection(url_data.hostname)

        full_path = url_data.path
        if url_data.query:
            full_path += '?' + url_data.query

        conn.request('HEAD', full_path)
        r1 = conn.getresponse()
        conn.close()

        # it exists! (302 is a redirect for sharing links i.e. youtu.be)
        if r1.status == 200 or r1.status == 302:
            self.content_provider = url_data.hostname.lstrip('www.')
            query = cgi.parse_qs(url_data.query)

            # youtube
            if self.content_provider == 'youtube.com' or self.content_provider == 'youtu.be':
                if self.content_provider == 'youtube.com':
                    self.video_id = query['v'][0]

                else:
                    self.video_id = self.url.split('/').pop()
                    self.content_provider = 'youtube.com'
                    self.url = 'http://www.youtube.com/watch?v=' + self.video_id

                data_url = 'http://gdata.youtube.com/feeds/api/videos/' + self.video_id + '?v=2&alt=json'
                youtube_data = simplejson.load(urllib.urlopen(data_url))

                thumbs = youtube_data['entry']['media$group']['media$thumbnail']
                if len(thumbs) > 1:
                    self.screenshot = thumbs[1]['url']
                elif len(thumbs):
                    self.screenshot = thumbs[0]['url']

                self.caption = youtube_data['entry']['title']['$t']

            # vimeo
            elif self.content_provider == 'vimeo.com':
                self.video_id = url_data.path.lstrip('/')
                data_url = 'http://vimeo.com/api/v2/video/' + self.video_id + '.json'
                vimeo_data = simplejson.load(urllib.urlopen(data_url))

                self.screenshot = vimeo_data[0]['thumbnail_large']
                self.caption = vimeo_data[0]['title']
