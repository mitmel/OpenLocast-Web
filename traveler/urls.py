from django.conf.urls.defaults import *
from django.contrib import admin

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog'),
)

urlpatterns += patterns('traveler.views',
    url(r'^$', 'frontpage', name='frontpage'),
    url(r'^register/$', 'register', name='register'),
)

urlpatterns += patterns('traveler.views',
    url(r'^traveler.js', 'traveler_js', name='traveler_js'), 
    url(r'^templates.js$', 'templates_js', name='templates_js'),
)

urlpatterns += patterns('locast.i18n.views',
    url(r'^setlang/$', 'set_language', name='set_language'),
)

urlpatterns += patterns('locast.auth.views',
    url(r'^login/$', 'login', name='login'),
    url(r'^logout/$', 'logout', name='logout')
)

urlpatterns += patterns('',
    url(r'^api/', include('traveler.api.urls')), 
)

