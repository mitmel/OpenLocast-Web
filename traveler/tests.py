"""
This file demonstrates two different styles of tests (one doctest and one
unittest). These will both pass when you run "manage.py test".

Replace these with more appropriate tests for your application.
"""

from django.test import TestCase
from django.test.client import Client
import json
import urlparse
import uuid

# hard-coded paths
p_cast = 'cast/'
p_collection = 'collection/'
p_user = 'user/'
p_search = 'search/'
p_geofeatures = 'geofeatures/'

# these are all the known top-level paths
known_paths = [ p_cast, p_collection, p_user, p_search, p_geofeatures ]
# these paths are known to represent a list of things
# this implies that path/1/ is a valid identifier and will
# return an individual item
dir_paths = [ p_cast, p_collection, p_user ]

class ApiError(Exception):
    pass

class ApiClient(Client):
    """A basic Locast API client"""

    baseurl='/api/'

    def raise_for_status(self, res):
        if res.status_code != 201 and res.status_code != 200:
            message = ""
            if len(res.content) > 0 and len(res.content) < 512:
                message = ": %s" % res.content

            raise ApiError("received status code %d%s" % (res.status_code, message))

    def new(self, path, content):
        """Creates a new content item at the given path

        Returns the created item, as returned by the server"""

        if not isinstance(content, dict):
            raise Exception("Illegal content type. Must be a dict")
        if 'uuid' not in content:
            content['uuid'] = str(uuid.uuid4())
        res = self.post(self.get_full_url(path), data=json.dumps(content), content_type="application/json")
        try:
            self.raise_for_status(res)
        except ApiError, e:
            raise e
        return self.asJson(res)

    def delete(self, path):
        """Deletes the given item from the server"""
        r = super(ApiClient, self).delete(self.get_full_url(path))
        self.raise_for_status(r)

    def get_full_url(self, path):
        """Resolves the path based on the provided base URL"""
        return urlparse.urljoin(self.baseurl, path)

    def getJson(self, path):
        res = self.get(self.get_full_url(path))
        return self.asJson(res)

    def asJson(self, response):
        if not response['Content-Type'].startswith('application/json'):
            raise ApiError("Was expecting JSON content type but received %s" % response['Content-Type'])

        return json.loads(response.content)

    def get_index(self):
        paths = self.getJson('')
        return paths

class ApiTestCase(TestCase):
    fixtures = ['api_test.json']

    def setUp(self):
        self.c = ApiClient()
        self.full_urls = map(lambda path: self.c.get_full_url(path), known_paths)

    def login(self):
        logged_in = self.c.login(username='test', password='12345')
        self.assertTrue(logged_in)
        self.profile = self.getItem(p_user + 'me')
        self.assertIn('uri', self.profile)

    def assertHasSyncFields(self, item):
        self.assertIn('uri', item)
        self.assertIn('uuid', item)
        self.assertIn('created', item)
        self.assertIn('modified', item)

    def getItem(self, path):
        res = self.c.getJson(path)
        self.assertIsInstance(res, dict)
        return res

    def getDir(self, path):
        res = self.c.getJson(path)
        self.assertIsInstance(res, list)
        return res

    def assertNotFound(self, res):
        self.assertEquals(res.status_code, 404)

class ApiTestBasic(ApiTestCase):
    def test_casts(self):
        casts = self.getDir(p_cast)
        # one defined in the fixture
        self.assertEquals(len(casts), 1)
        cast1 = casts[0]
        self.assertIn('id', cast1)
        self.assertHasSyncFields(cast1)

    def test_cast1(self):
        cast1 = self.getItem(p_cast+ '1/')
        self.assertHasSyncFields(cast1)

    def test_index(self):
        index = self.c.get_index()
        print type(index)
        self.assertIsInstance(index, dict)
        resources = index['resources']
        self.assertIsInstance(resources, list)
        for entry in resources:
            self.assertIn(self.c.get_full_url(entry['uri']), self.full_urls)

    def test_types(self):
        for path in dir_paths:
            self.assertIsInstance(self.c.getJson(path), list)

    def test_failures(self):
        self.c.get(p_cast + 'snth/')
        # really invalid cast IDs
        for path in known_paths:
            res = self.c.get(path + 'snth/')
            self.assertNotFound(res)
        for path in dir_paths:
            # invalid numerical IDs
            res = self.c.get(path + '0/')
            self.assertNotFound(res)
            res = self.c.get(path + '-1/')
            self.assertNotFound(res)

class ApiTestBasicAuthenticated(ApiTestCase):
    def setUp(self):
        super(ApiTestBasicAuthenticated, self).setUp()
        self.login()

    def test_casts(self):
        casts = self.getDir('cast/')
        # one defined in the fixture
        self.assertEquals(len(casts), 1)
        cast1 = casts[0]
        self.assertIn('id', cast1)
        self.assertHasSyncFields(cast1)

    def test_cast1(self):
        cast1 = self.getItem(p_cast + '1/')
        self.assertHasSyncFields(cast1)

    def test_user(self):
        maybeme = self.getItem(self.profile['uri'])
        self.assertEquals(maybeme['display_name'], 'Test U.')
        self.assertEquals(maybeme['id'], 1)
        self.assertEquals(maybeme['uri'], self.profile['uri'])

class ApiTestCreation(ApiTestCase):
    def setUp(self):
        super(ApiTestCreation, self).setUp()
        self.login()

    def test_create_cast(self):
        cast_in = {"title": "second test cast"}
        cast = self.c.new(p_cast, cast_in)

        self.assertHasSyncFields(cast)
        self.c.delete(cast['uri'])

        res = self.c.get(cast['uri'])
        self.assertNotFound(res)

# temporarily disabled until collection creation is permitted
#    def test_create_collection(self):
#        coll_in = {"title": "my pragmatically-generated collection"}
#        coll = self.c.new(p_collection, coll_in)
#
#        self.assertHasSyncFields(coll)
#        self.c.delete(coll['uri'])
#
#        res = self.c.get(coll['uri'])
#        self.assertNotFound(res)
#
