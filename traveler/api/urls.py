from django.conf.urls.defaults import *

urlpatterns = patterns('traveler.api',

    # CAST
    url(r'^cast/(?P<cast_id>\d+)/media/(?P<media_id>\d+)/$', 'cast.CastAPI', name='cast_media_api_single', kwargs={'method':'media_content'}),
    url(r'^cast/(?P<cast_id>\d+)/media/$', 'cast.CastAPI', name='cast_media_api', kwargs={'method':'media'}),

    # comments
    url(r'^cast/(?P<cast_id>\d+)/comments/(?P<comment_id>\d+)/flag/$', 'cast.CastAPI', name='cast_comments_api_single', kwargs={'method':'comments_flag'}),
    url(r'^cast/(?P<cast_id>\d+)/comments/(?P<comment_id>\d+)/$', 'cast.CastAPI', name='cast_comments_api_single', kwargs={'method':'comments'}),
    url(r'^cast/(?P<cast_id>\d+)/comments/$', 'cast.CastAPI', name='cast_comments_api', kwargs={'method':'comments'}),
    
    url(r'^cast/(?P<cast_id>\d+)/favorite/$', 'cast.CastAPI', kwargs={'method':'favorite'}),
    url(r'^cast/(?P<cast_id>\d+)/flag/$', 'cast.CastAPI', kwargs={'method':'flag'}),

    url(r'^cast/(?P<cast_id>\d+)/geofeature/$', 'cast.CastAPI', kwargs={'method':'geofeature'}),

    url(r'^cast/(?P<cast_id>\d+)(?P<format>\.\w*)/$', 'cast.CastAPI'),
    url(r'^cast/(?P<cast_id>\d+)/$', 'cast.CastAPI', name='cast_api_single'),
    url(r'^cast/$', 'cast.CastAPI', name='cast_api'),

    # USER
    url(r'^user/(?P<user_id>\d+)/$', 'user.UserAPI', name='user_api_single'),
    url(r'^user/me$', 'user.UserAPI', kwargs={'method':'me'}),
    url(r'^user/$', 'user.UserAPI', name='user_api'),

    # COLLECTION
    url(r'^collection/(?P<coll_id>\d+)/favorite/$', 'collection.CollectionAPI', kwargs={'method':'favorite'}),

    url(r'^collection/(?P<coll_id>\d+)/cast/(?P<cast_id>\d+)/$', 'cast.CastAPI', name='collection_api_cast_single'),
    url(r'^collection/(?P<coll_id>\d+)/cast/$', 'cast.CastAPI', name='collection_cast_api'),

    url(r'^collection/(?P<coll_id>\d+)/$', 'collection.CollectionAPI', name='collection_api_single'),
    url(r'^collection/$', 'collection.CollectionAPI', name='collection_api'),

    # SEARCH
    url(r'^search/$', 'search.unified_search_api', name='search_api'),

    # get_features
    url(r'^geofeatures/$', 'geofeatures.get_geofeatures', name='geofeatures_api'),
)
