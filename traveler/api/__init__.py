from locast.api import rest
from locast.api import APIResponseOK
from django.contrib.sites.models import get_current_site
from django.core.urlresolvers import reverse

from _version import __version__


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

        site = get_current_site(request)

        resp_index = { 
            'openlocast_version': __version__, 
            'site_name': site.name,
            'resources': urls }

        if '.json' == fmt:
            return APIResponseOK(content=resp_index)
