from django.conf.urls.defaults import patterns, url, include
from django.contrib import admin

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog'),
)

urlpatterns += patterns('traveler.views',
    url(r'^$', 'frontpage', name='frontpage'),
    url(r'^register/$', 'register', name='register'),
    url(r'^edit_profile/$', 'edit_profile', name='edit_profile'),
)

urlpatterns += patterns('traveler.views',
    url(r'^traveler.js', 'traveler_js', name='traveler_js'),
    url(r'^templates.js$', 'templates_js', name='templates_js'),
    url(r'^sync_code.png$', 'sync_code_png', name='sync_code_png'),
)

urlpatterns += patterns('locast.i18n.views',
    url(r'^setlang/$', 'set_language', name='set_language'),
)

urlpatterns += patterns('django.contrib.auth.views',
    url(r'^login/$', 'login', name='login'),
    url(r'^logout/$', 'logout', name='logout'),
)

urlpatterns += patterns('locast.userconfirmation.views',
    url(r'^confirm_user/$', 'confirm_user', name='confirm_user'),
)

urlpatterns += patterns('',
    url(r'^api/', include('traveler.api.urls')),
)
