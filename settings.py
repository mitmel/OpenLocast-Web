#Django settings for the open locast project.

# All variables indicated as "settings_local" should be overriden
# within a deployment specific settings_local.py file

# settings_local
DEBUG = False
TEMPLATE_DEBUG = DEBUG

# settings_local
ADMINS = None
MANAGERS = None

# Set this in settings_local.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': '',                      # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.

# This should always be UTC. All timezone conversion should happen on the client side.
# TODO: Make use of Django 1.4 timezone magic
TIME_ZONE = 'UTC'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html

# settings_local
LANGUAGE_CODE = 'en-us'
LANGUAGES = None

# settings_local
SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = False

# The host address of this installation, i.e. http://locast.mit.edu
# settings_local
HOST = ''

# The absolute URL of the application, i.e. /civicmedia
# settings_local
BASE_URL = ''

# Generally, FULL_BASE_URL = HOST + BASE_URL
# settings_local
FULL_BASE_URL = ''

# Set below, after settings_local import
LOGIN_REDIRECT_URL = ''

LOGIN_URL = ''

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"

# settings_local
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"

# settings_local
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"

# settings_local
STATIC_URL = ''

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = ''

AUTHENTICATION_BACKENDS = (
    'locast.auth.backends.LocastEmailBackend',
    'locast.auth.backends.LocastUsernameBackend',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.contrib.auth.context_processors.auth',
    'django.contrib.messages.context_processors.messages',
    'locast.context_processors.settings_variables'
)

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    #'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'locast.middleware.LocastMiddleware',
)

ROOT_URLCONF = 'urls'

import os
BASE_PATH = os.path.split(__file__)[0]

TEMPLATE_DIRS = (
    # necessary for the admin template override to work
    '%s/traveler/templates' % BASE_PATH,
)

LOCALE_PATHS = (
    '%s/locale' % BASE_PATH,
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.gis',
    'locast',
    'south',
    'sorl.thumbnail',
    'traveler',
)

### LOCAST SETTINGS ###

APP_LABEL = 'traveler'

USER_MODEL = 'traveler.LocastUser'

AUTH_PROFILE_MODULE = 'traveler.LocastUserProfile'

# Types of user actions, used for UserActivity logging
USER_ACTIONS = (
    'joined',
    'created',
    'commented',
)

# The title of the site
SITE_TITLE = 'Open Locast'

# The theme to use
THEME = 'default'

# Default privacy value of newly created PrivatelyAuthorable models
DEFAULT_PRIVACY = 2

# settings_local
DEFAULT_LON = 0.0
DEFAULT_LAT = 0.0
DEFAULT_ZOOM = 0

GOOGLE_API_KEY = ''

# Flowplayer swf
FLOWPLAYER_SWF = 'http://releases.flowplayer.org/swf/flowplayer-3.2.8.swf'

# Enables google analytics
GOOGLE_ANALYTICS_ID = None

# Allows arbitrary settings variables to be exposed to templates
CONTEXT_VARIABLES = (
    'HOST',
    'BASE_URL',
    'FULL_BASE_URL',
    'THEME_URL',
    'GOOGLE_API_KEY',
    'GOOGLE_ANALYTICS_ID',
    'FACEBOOK_APP_ID',
    'FLOWPLAYER_SWF',
    'DEFAULT_LON',
    'DEFAULT_LAT',
    'DEFAULT_ZOOM',
    'SITE_TITLE',
)

# import settings_local
try: from settings_local import *
except ImportError: raise 'Cannot find settings_local.py!'

# These rely on settings_local variables. Don't change anything below this line!

# Sets up the URL to load theme resources. Only needs to be overriden
# if the theme is not in the default location
THEME_URL = STATIC_URL + 'themes/' + THEME + '/'

LOGIN_REDIRECT_URL = BASE_URL + '/'
LOGIN_URL = BASE_URL + '/login/'

