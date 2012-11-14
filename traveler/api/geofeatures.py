from locast.api import * 
from locast.api import qstranslate

from django.contrib.gis.geos import Polygon
from django.db.models import Q

from traveler import models
from traveler.api.cast import ruleset as cast_ruleset

def get_geofeatures(request):
    bounds_param = get_param(request.GET, 'within')
    query = request.GET.copy()
    base_query = Q()
    
    if bounds_param:
        pnts = bounds_param.split(',')

        bbox = (float(pnts[0]), float(pnts[1]), 
                float(pnts[2]), float(pnts[3]))

        poly = Polygon.from_bbox(bbox)
        poly.set_srid(4326)

        del query['within']

        base_query = base_query & Q(location__within=poly)

    # cast within bounds
    cast_base_query = models.Cast.get_privacy_q(request) & base_query

    q = qstranslate.QueryTranslator(models.Cast, cast_ruleset, cast_base_query)
    casts = q.filter(query)

    cast_arr = []
    for c in casts:
        if c.location:
            cast_arr.append(geojson_serialize(c, c.location, request))

    # collection intersects bounds
    if bounds_param:
        base_query = Q(path__intersects = poly)

    colls = models.Collection.objects.filter(base_query)

    coll_arr = []
    for i in colls:
        # only add collections if they have a path
        if i.path:
            coll_arr.append(geojson_serialize(i, i.path, request))

    features_dict = {}
    features_dict['casts'] = dict(type='FeatureCollection', features=cast_arr)
    features_dict['collections'] = dict(type='FeatureCollection', features=coll_arr)
    
    return APIResponseOK(content=features_dict)
