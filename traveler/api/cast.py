from django.contrib.gis.geos import Point
from django.db.models import Count, Q
from django.http import HttpResponse
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils import translation
from django.views.decorators.csrf import csrf_exempt

from locast.api import APIResponseOK, APIResponseCreated, api_serialize, comment as comment_api,  exceptions, form_validate, \
    geojson_serialize, get_json, get_object, get_param, paginate, rest, qstranslate
from locast.auth.decorators import require_http_auth, optional_http_auth

from traveler import models, forms

ruleset = {
    # Authorable
    'author'        :    { 'type' : 'int' },
    'title'         :    { 'type' : 'string' },
    'description'   :    { 'type' : 'string' },
    'created'       :    { 'type' : 'datetime' },
    'modified'      :    { 'type' : 'datetime' },

    # Privately Authorable
    'privacy'       :    { 'type' : 'int' },

    # Taggable
    'tags'          :    { 'type' : 'list' },

    # Locatable
    'dist'          :    { 'type': 'geo_distance', 'alias' : 'location__distance_lte' },
    'within'        :    { 'type': 'geo_polygon', 'alias' : 'location__within' },

    # Favoritable
    'favorited_by'  :    { 'type': 'int' },

    # traveler cast
    'collection'     :    { 'type' : 'int' },
    'datetime'       :    { 'type' : 'datetime' },
}

@csrf_exempt
class CastAPI(rest.ResourceView):

    @optional_http_auth
    def get(request, cast_id=None, coll_id=None, format='.json'):

        # single cast
        if cast_id:
            if coll_id: check_collection(cast_id, coll_id)
            cast = get_object(models.Cast, id=cast_id)

            if not cast.allowed_access(request.user):
                raise exceptions.APIForbidden
                
            if format == '.json':
                cast_dict = api_serialize(cast, request)
                return APIResponseOK(content=cast_dict, total=1)
                
            if format == '.html':
                is_flagged = cast.is_flagged_by(request.user)
                is_favorited = cast.is_favorited_by(request.user)
                allowed_edit = cast.allowed_edit(request.user)
                    
                content = render_to_string('ajax/cast_frontpage.django.html', locals(), context_instance = RequestContext(request))
                resp = HttpResponse(content=content)
                return resp
            
            else:
                raise exceptions.APIBadRequest('Invalid response format')

        # multiple casts
        else:
            base_query = models.Cast.get_privacy_q(request)

            if coll_id:
                get_object(models.Collection, id=coll_id)
                base_query = base_query & Q(collection=coll_id)

            q = qstranslate.QueryTranslator(models.Cast, ruleset, base_query)
            query = request.GET.copy()

            # Need to do some magic to order by popularity, so remove from
            # the query that will be sent to qstranslate
            popularity_order = False
            if 'orderby' in query and query['orderby'] == 'popularity':
                popularity_order = True
                del query['orderby']

            objs = total = pg = None
            try:
                objs = q.filter(query)

                # popularity magic!
                if popularity_order:
                    objs = objs.annotate(popularity=Count('favorited_by')).order_by('-popularity')

                objs, total, pg = paginate(objs, request.GET)
            except qstranslate.InvalidParameterException, e:
                raise exceptions.APIBadRequest(e.message)

            cast_arr = []
            for c in objs:
                cast_arr.append(api_serialize(c, request))

            return APIResponseOK(content=cast_arr, total=total, pg=pg)


    @require_http_auth
    def post(request, cast_id=None, coll_id=None):

        if cast_id:
            raise exceptions.APIBadRequest('Attempting to post with a cast id specified')

        coll = None
        if coll_id:
            coll = get_object(models.Collection, coll_id)

        cast = cast_from_post(request)

        if coll:
            coll.related_casts.add(cast)

        cast.save()
        models.UserActivity.objects.create_activity(request.user, cast, 'created')

        return APIResponseCreated(content=api_serialize(cast, request), location=cast.get_api_uri())


    @require_http_auth
    def put(request, cast_id, coll_id=None):

        if coll_id: check_collection(cast_id, coll_id)
        cast = get_object(models.Cast, cast_id)

        if not cast.allowed_edit(request.user):
            raise exceptions.APIForbidden

        cast = cast_from_post(request, cast)
        cast.save()

        return APIResponseOK(content=api_serialize(cast, request))


    @require_http_auth
    def delete(request, cast_id, coll_id=None):

        if coll_id: check_collection(cast_id, coll_id)
        cast = get_object(models.Cast, cast_id)

        if not cast.allowed_edit(request.user):
            raise exceptions.APIForbidden

        cast.delete()

        return APIResponseOK(content='success')


    @optional_http_auth
    def get_media(request, cast_id):
        cast = get_object(models.Cast, cast_id)

        if not cast.allowed_access(request.user):
            raise exceptions.APIForbidden

        media_dicts = []
        for m in cast.media_set.all():
            media_dicts.append(api_serialize(m, request))

        return APIResponseOK(content=media_dicts)


    @require_http_auth
    def post_media(request, cast_id):
        data = get_json(request.body)
        cast = get_object(models.Cast, cast_id)
        
        if not cast.allowed_edit(request.user):
            raise exceptions.APIForbidden

        if 'content_type' in data:
            content_type = data['content_type'] 
            del data['content_type']

        else:
            raise exceptions.APIBadRequest('missing "content_type"')

        data['language'] = translation.get_language()
        data['author'] = request.user.id

        form_model = None
        if content_type == 'videomedia':
            form_model = forms.VideoMediaForm
            
        elif content_type == 'imagemedia':
            form_model = forms.ImageMediaForm

        elif content_type == 'linkedmedia':
            form_model = forms.LinkedMediaForm

        media = form_validate(form_model, data)
        cast.media_set.add(media)

        models.UserActivity.objects.create_activity(request.user, media, 'created')

        # this is needed as for some odd reason, it doesn't return an object with author, modified, etc.
        # TODO investigate why this is needed, perhaps it can be fixed by using media.content
        media = get_object(models.Media, media.id)

        return APIResponseCreated(content=api_serialize(media, request), location=media.get_api_uri())


    @require_http_auth
    def delete_media_content(request, cast_id, media_id):
        media = get_object(models.Media, media_id)
        cast = check_cast_media(media_id, cast_id)

        if not cast.allowed_edit(request.user):
            raise exceptions.APIForbidden

        media.delete()

        return APIResponseOK(content='success')


    @optional_http_auth
    def get_media_content(request, cast_id, media_id):
        media = get_object(models.Media, media_id)
        cast = check_cast_media(media_id, cast_id)

        if not cast.allowed_access(request.user):
            raise exceptions.APIForbidden
            
        media_dict = api_serialize(media, request)
        return APIResponseOK(content=media_dict, total=1)


    @require_http_auth
    def post_media_content(request, cast_id, media_id):
        get_object(models.Cast, cast_id)
        media = get_object(models.Media, media_id)

        if not media.author == request.user:
            raise exceptions.APIForbidden

        content_type = get_param(request.META, 'CONTENT_TYPE')
        mime_type = content_type.split(';')[0]

        # Form upload
        if mime_type == 'multipart/form-data':
            # multipart/form-data; boundary=----pluploadboundaryp15s131vjl18tdnlk1sj11min19p42

            file = get_param(request.FILES, 'file')

            if not file:
                #TODO: perhaps if there is no file, and there is an error, delete the original?
                raise exceptions.APIBadRequest('Error uploading file!')

            media.content.file.save(file.name, file, save=True)
            mime_type = media.path_to_mimetype(file.name, media.content.MIME_TYPES)

        else:
            media.content.create_file_from_data(request.body, mime_type)

        if not mime_type:
            raise exceptions.APIBadRequest('Invalid file type!')

        # media is the generic holder, media.content is the specific
        # content model (ImageMedia, VideoMedia etc.).

        media.content.mime_type = mime_type
        media.content.content_state = models.Media.STATE_COMPLETE
        media.content.save()

        return APIResponseOK(content=api_serialize(media, request))


    @optional_http_auth
    def get_comments(request, cast_id, comment_id=None):
        cast = get_object(models.Cast, id=cast_id)

        if not cast.allowed_access(request.user):
            raise exceptions.APIForbidden

        return comment_api.get_comments(request, cast, comment_id)


    @require_http_auth
    def post_comments_flag(request, cast_id, comment_id):
        cast = get_object(models.Cast, id=cast_id)

        comment = comment_api.check_comment(cast, comment_id)
        comment.flag(request.user)

        return APIResponseOK(content='success')


    @require_http_auth
    def post_comments(request, cast_id):
        cast = get_object(models.Cast, id=cast_id)
        models.UserActivity.objects.create_activity(request.user, cast, 'commented')

        return comment_api.post_comment(request, cast)


    @require_http_auth
    def post_favorite(request, cast_id):
        cast = get_object(models.Cast, id=cast_id)
        favorite = get_param(request.POST, 'favorite')

        return favorite_api.post_favorite(request, cast)


    @require_http_auth
    def post_flag(request, cast_id):
        cast = get_object(models.Cast, id=cast_id)
        cast.flag(request.user)

        return APIResponseOK(content='success')


    def get_geofeature(request, cast_id):
        cast = get_object(models.Cast, id=cast_id)

        if not cast.allowed_access(request.user):
            raise exceptions.APIForbidden

        if cast.location:
            geojson = geojson_serialize(cast, cast.location, request)
            return APIResponseOK(content=geojson)
        else:
            raise exceptions.APINotFound('No location')

# End cast API


# Helpers

def check_collection(cast_id, coll_id):
    coll = get_object(models.Collection, id=coll_id)
    try:
        coll.related_casts.get(id=cast_id)
    except models.Cast.DoesNotExist:
        raise exceptions.APIBadRequest('Cast is not part of collection')
    return coll


def check_cast_media(media_id, cast_id):
    cast = get_object(models.Cast, id=cast_id)
    try:
        cast.media_set.get(id=media_id)
    except models.Media.DoesNotExist:
        raise exceptions.APIBadRequest('Media object is not part of cast')
    return cast


def cast_from_post(request, cast = None):

    data = {}

    # this allows PUT operations to only send the data they
    # are interested in updating
    if cast:
        data = api_serialize(cast)

    data.update(get_json(request.body))

    if not cast:
        data['author'] = request.user.id
    else:
        data['author'] = cast.author.id

    # Tags won't validate correctly, so store them to set later
    tags = None
    if 'tags' in data:
        tags = data['tags']
        del data['tags']

    # Location needs to be set manually
    location = None
    if 'location' in data:
        location = data['location']

        # check to make sure its within
        boundry = models.Boundry.objects.get_default_boundry()
        if boundry and (not Point(location[0], location[1]).within(boundry.bounds)):
            raise exceptions.APIBadRequest('{"location":"outside default boundry"}')

        del data['location']

    # Modified and created cannot be set
    if 'modified' in data: del data['modified']
    if 'created' in data: del data['created']

    # Maps privacy names to values
    if 'privacy' in data: 
        data['privacy'] = models.Cast.get_privacy_value(data['privacy'])

    cast = form_validate(forms.CastAPIForm, data, instance = cast)

    if not tags == None:
        # Clear all tags
        if tags == "":
            cast.tags.all().delete()
        cast.set_tags(tags)

    if location:
        cast.set_location(location[0], location[1])

    cast.save()

    return cast
