from locast.api import rest
from django.core.urlresolvers import reverse
from locast.api import APIResponseOK

class APIIndex(rest.ResourceView):
    """Lists the top-level paths of the API in a human- and machine-readable form"""

    def get(request, fmt='.json', index=None):
        # adds a description field automatically based on the verbose name of a model
        for url in index:
            if 'description' not in url:
                if 'model' in url:
                    url['description'] = str(url['model']._meta.verbose_name_plural.title())
                else:
                    url['description'] = url['view']


        urls = map(lambda url: { 'description': url['description'],
                        'uri': reverse(url['view'])}, index)
        if '.json' == fmt:
            return APIResponseOK(content=urls)


