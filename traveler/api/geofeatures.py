from locast.api import * 
from locast.api import qstranslate
from locast.api.cache import request_cache_key, get_cache, set_cache

from django.contrib.gis.geos import Polygon
from django.db.models import Q

from traveler.models import Cast, Collection, CAST_GEO_GROUP
from traveler.api.cast import ruleset as cast_ruleset

def get_geofeatures(request):
    bounds_param = get_param(request.GET, 'within')
    base_query = Q()
    
    if bounds_param:
        pnts = bounds_param.split(',')

        bbox = (float(pnts[0]), float(pnts[1]), 
                float(pnts[2]), float(pnts[3]))

        poly = Polygon.from_bbox(bbox)
        poly.set_srid(4326)

        del query['within']

        base_query = base_query & Q(location__within=poly)

    # PUBLIC cast within bounds
    cast_base_query = Q(privacy__lt=3) & base_query
    q = qstranslate.QueryTranslator(Cast, cast_ruleset, cast_base_query)
    public_casts = q.filter(request.GET).order_by('-created')

    cache_key = request_cache_key(request, ignore_params=['_'])
    cast_arr = get_cache(cache_key, cache_group=CAST_GEO_GROUP)

    if not cast_arr:
        cast_arr = []
        for c in public_casts:
            if c.location:
                cast_arr.append(geojson_serialize(c, c.location, request))

        set_cache(cache_key, cast_arr, cache_group=CAST_GEO_GROUP)

    # casts that ONLY THIS user can see. Superusers can see all casts, logged in users can see any casts they authored.
    if request.user.is_authenticated():
        if request.user.is_superuser:
            cast_base_query = Q(privacy=3) & base_query
        else:
            cast_base_query = Q(privacy=3) & Q(author=request.user) & base_query
        
        q = qstranslate.QueryTranslator(Cast, cast_ruleset, cast_base_query)
        user_casts = q.filter(request.GET).order_by('-created')
        for c in user_casts:
            if c.location:
                cast_arr.append(geojson_serialize(c, c.location, request))

    # collection intersects bounds
    if bounds_param:
        base_query = Q(path__intersects = poly)

    colls = Collection.objects.filter(base_query).order_by('-created')

    coll_arr = []
    for i in colls:
        # only add collections if they have a path
        if i.path:
            coll_arr.append(geojson_serialize(i, i.path, request))

    features_dict = {}
    features_dict['casts'] = dict(type='FeatureCollection', features=cast_arr)
    features_dict['collections'] = dict(type='FeatureCollection', features=coll_arr)
    
    return APIResponseOK(content=features_dict)
