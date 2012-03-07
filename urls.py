import settings

from django.conf.urls.defaults import *

urlpatterns = patterns('',
    url(r'^', include('traveler.urls')),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        url(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}))

