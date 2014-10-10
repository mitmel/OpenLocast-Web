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

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

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

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

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
    'djangobower.finders.BowerFinder',
    'compressor.finders.CompressorFinder',
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
    'locast.context_processors.settings_variables',
    'locast.context_processors.site_name'
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
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'locast.middleware.LocastMiddleware',
)

ROOT_URLCONF = 'urls'

import os
PROJECT_PATH = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."),)

LOCALE_PATHS = (
    '%s/locale' % PROJECT_PATH,
)

LOCAL_APPS = ()
INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'south',
    'compressor',
    'djangobower',
    'sorl.thumbnail',
    'locast',
    'traveler',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

BOWER_PATH = '%s/node_modules/bower/bin/bower' % PROJECT_ROOT_PATH

BOWER_COMPONENTS_ROOT = '%s/components/' % PROJECT_ROOT_PATH

BOWER_INSTALLED_APPS = (
    'mustache#~0.8.2',
    'sammy#~0.7.6',
    'moment#~2.8.2',
    'openlayers#release-2.11',
    'fancybox#~2.1.5',
    'plupload#~2.1.2'
)

### LOCAST CORE SETTINGS ###

APP_LABEL = 'traveler'

AUTH_USER_MODEL = 'traveler.LocastUser'

AUTH_PROFILE_MODULE = 'traveler.LocastUserProfile'

# Types of user actions, used for UserActivity logging
USER_ACTIONS = (
    'joined',
    'created',
    'commented',
)

# Default privacy value of newly created PrivatelyAuthorable models
DEFAULT_PRIVACY = 2

### OPEN LOCAST SETTINGS ###

# The theme to use
THEME = 'default'

# Map settings
DEFAULT_LON = 0.0
DEFAULT_LAT = 0.0
DEFAULT_ZOOM = 0

MAX_ZOOM = 17
MIN_ZOOM = 7

# Uploader settings (client side)
# This string can be in the following formats 100b, 10kb, 10mb.
MAX_VIDEO_SIZE = '100mb'
MAX_PHOTO_SIZE = '1mb'

# Allows arbitrary settings variables to be exposed to templates
CONTEXT_VARIABLES = (
    'HOST',
    'BASE_URL',
    'FULL_BASE_URL',
    'THEME_STATIC_URL',
    'FLOWPLAYER_SWF',
    'DEFAULT_LON',
    'DEFAULT_LAT',
    'DEFAULT_ZOOM',
    'MAX_ZOOM',
    'MIN_ZOOM',
    'MAX_VIDEO_SIZE',
    'MAX_PHOTO_SIZE',
)

# import settings_local
try: from settings_local import *
except ImportError: raise 'Cannot find settings_local.py!'

# --- These rely on settings_local variables. Be careful when changing anything below this line! ---

# Sets up the URL to load theme resources. Only needs to be overriden
# if the theme is not in the default location
THEME_STATIC_URL = STATIC_URL + 'themes/' + THEME + '/'

TEMPLATE_DIRS = (
    STATIC_ROOT + 'themes/' + THEME + '/templates/',
)

LOGIN_REDIRECT_URL = BASE_URL + '/'
LOGIN_URL = BASE_URL + '/login/'

INSTALLED_APPS += LOCAL_APPS
