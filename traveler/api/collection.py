from django.views.decorators.csrf import csrf_exempt

from locast.api import APIResponseOK, api_serialize, get_object, get_param, paginate
from locast.api.decorators import jsonp_support
from locast.api.exceptions import APIBadRequest
from locast.api.qstranslate import QueryTranslator, InvalidParameterException
from locast.api.rest import ResourceView
from locast.auth.decorators import require_http_auth, optional_http_auth

from traveler.models import Collection

ruleset = {
    # Authorable
    'title'         :    { 'type' : 'string' },
    'description'   :    { 'type' : 'string' },

    # Taggable
    'tags'          :    { 'type' : 'list' },

    # Favoritable
    'favorited_by'  :    { 'type': 'int' },

    # Collection
    'within'        :    { 'type': 'geo_polygon', 'alias' : 'path__intersects' },
}

@csrf_exempt
class CollectionAPI(ResourceView):

    @jsonp_support()
    @optional_http_auth
    def get(request, coll_id = None):

        if coll_id:
            collection = get_object(Collection, id=coll_id)
            collection_dict = api_serialize(collection, request)
            
            return APIResponseOK(content=collection_dict, total=1)

        else:
            query = request.GET.copy()
            q = QueryTranslator(Collection, ruleset)
            try:
                objs = q.filter(query)
            except InvalidParameterException, e:
                raise APIBadRequest(e)

            objs, total, pg = paginate(objs, query)

            collection_arr = []
            for i in objs:
                collection_arr.append(api_serialize(i, request))

            return APIResponseOK(content=collection_arr, total=total, pg=pg)

    @require_http_auth
    def post_favorite(request, coll_id):
        coll = get_object(Collection, id=coll_id)
        favorite = get_param(request.POST, 'favorite')

        if favorite:
            coll.favorite(request.user)
        else:
            coll.unfavorite(request.user)

        return APIResponseOK(content='success')
