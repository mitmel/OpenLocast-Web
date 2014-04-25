import settings

from django.contrib.admin import widgets
from django.contrib.gis import admin
from django.utils.translation import ugettext_lazy as _

from locast.admin import UserActivityAdmin, FlagAdmin
from locast.auth.admin import LocastUserAdmin

from traveler import models 

# Use this with locatable models
class MapAdmin(admin.OSMGeoAdmin):
    default_lon = settings.DEFAULT_LON
    default_lat = settings.DEFAULT_LAT
    default_zoom = settings.DEFAULT_ZOOM + 6 


class TagSelect(widgets.FilteredSelectMultiple):
    def __init__(self, *args, **kwargs):
        super(TagSelect, self).__init__(verbose_name=_('Tags'), is_stacked=False, *args, **kwargs)


### CAST ###

class MediaInline(admin.TabularInline):
    pass


class VideoMediaInline(MediaInline):
    extra = 1
    model = models.VideoMedia
    fields = ('file', 'caption')


class ImageMediaInline(MediaInline):
    extra = 1
    model = models.ImageMedia
    fields = ('file', 'caption')


class LinkedMediaInline(MediaInline):
    extra = 1
    model = models.LinkedMedia
    fields = ('url',)


class CastAdmin(MapAdmin): 
    inlines = [VideoMediaInline, ImageMediaInline, LinkedMediaInline]

    fields = ('title', 'description', 'privacy', 'datetime', 'location', 'tags')
    list_display = ('title', 'author', 'created', 'modified', 'privacy')
    list_filter = ('privacy',)
    search_fields = ('title',)

    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name == 'tags':
            kwargs['widget'] = TagSelect

        return super(CastAdmin,self).formfield_for_dbfield(db_field,**kwargs)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)

        # Auto save the cast with the author set to the current user
        for instance in instances:
            if isinstance(instance, models.Media): #Check if it is the correct type of inline
                if request.user.is_authenticated():
                    if (not hasattr(instance, 'author')) or (not instance.author):
                        instance.author = request.user
                try:
                    instance.save()
                except models.Media.InvalidMimeType:
                    # TODO: throw a real error or something
                    pass

    def save_model(self, request, obj, form, change):
        if not change:
            if request.user.is_authenticated():
                obj.author = request.user

        obj.save()


class CastSelect(widgets.FilteredSelectMultiple):
    def __init__(self, *args, **kwargs):
        super(CastSelect, self).__init__(verbose_name='Casts', is_stacked=False, *args, **kwargs)


### COLLECTION ###

class CollectionAdmin(MapAdmin):
    fields = ('title', 'description', 'path', 'related_casts', 'tags', 'preview_image')
    list_display = ('title', 'description', 'created', 'modified')

    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name == 'tags':
            kwargs['widget'] = TagSelect

        elif db_field.name == 'related_casts':
            kwargs['widget'] = CastSelect

        return super(CollectionAdmin,self).formfield_for_dbfield(db_field,**kwargs)

    def save_model(self, request, obj, form, change):
        if not change:
            if request.user.is_authenticated():
                obj.author = request.user

        obj.save()


### OTHERS. ###

class CommentAdmin(admin.ModelAdmin):
    list_display = ('body', 'author', 'created')


class LocastUserAdmin(MapAdmin, LocastUserAdmin): pass

class LocastUserProfileAdmin(admin.ModelAdmin):
    list_display = ('user',)


class VideoMediaAdmin(MapAdmin):
    fields = ('cast', 'author', 'caption', 'capture_time', 'location', 'file')


class ImageMediaAdmin(MapAdmin):
    fields = ('cast', 'author', 'caption', 'capture_time', 'location', 'file')


class LinkedMediaAdmin(MapAdmin):
    fields = ('cast', 'author', 'url', 'content_provider', 'video_id')


admin.site.register(models.Tag, admin.ModelAdmin)
admin.site.register(models.Flag, FlagAdmin)

admin.site.register(models.UserActivity, UserActivityAdmin)

if 'locast.userconfirmation' in settings.INSTALLED_APPS:
    from locast.userconfirmation.models import UserConfirmation
    from locast.userconfirmation.admin import UserConfirmationAdmin
    admin.site.register(UserConfirmation, UserConfirmationAdmin)

admin.site.register(models.Boundary, MapAdmin)
admin.site.register(models.MapPlace, MapAdmin)

admin.site.register(models.Comment, CommentAdmin)

admin.site.register(models.LocastUser, LocastUserAdmin)
admin.site.register(models.LocastUserProfile, LocastUserProfileAdmin)
admin.site.register(models.Cast, CastAdmin)
admin.site.register(models.Collection, CollectionAdmin)

admin.site.register(models.VideoMedia, VideoMediaAdmin)
admin.site.register(models.ImageMedia, ImageMediaAdmin)
admin.site.register(models.LinkedMedia, LinkedMediaAdmin)
