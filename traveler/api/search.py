from locast.api import *

from django.db.models import Q

from traveler import models

# Returns casts, collections and users based on a keyword
def unified_search_api(request):

    content = {}

    keyword = request.GET.get('q')

    # short or empty keyword
    if not keyword or len(keyword) < 2:
        return APIResponseOK(content=content, total=0, pg=1)

    ## CASTS ##

    fields = ('title', 'description', 'title', 'description', 'author__display_name')

    casts = search(models.Cast, fields, keyword)
    casts, total, pg = paginate(casts, request.GET)

    cast_arr = []
    for c in casts:
        cast_arr.append(api_serialize(c, request))

    ## COLLECTION ##

    fields = ('title', 'description', 'title', 'description', 'author__display_name')

    colls = search(models.Collection, fields, keyword)
    colls, total, pg = paginate(colls, request.GET)

    coll_arr = []
    for i in colls:
        coll_arr.append(api_serialize(i, request))

    ## USERS ##

    fields = ('first_name', 'last_name', 'email')

    users = search(models.LocastUser, fields, keyword)
    users, total, pg = paginate(users, request.GET)

    user_arr = []
    for u in users:
        user_arr.append(api_serialize(u, request))

    # Put it all together!
    content['casts'] = cast_arr
    content['collections'] = coll_arr
    content['users'] = user_arr

    return APIResponseOK(content=content, total=total, pg=pg)


def search(ctype, fields, keyword):
    q = Q()

    for field in fields: 
        q = q | Q(**{field + '__icontains': keyword})

    return ctype.objects.filter(q)

