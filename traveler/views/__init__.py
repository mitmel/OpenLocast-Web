import codecs
import facebook
import settings
import sys

from django.contrib.auth import authenticate, login, REDIRECT_FIELD_NAME
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils import simplejson

from locast import get_model

from traveler import forms, models


def frontpage(request):
    fragment = request.GET.get('_escaped_fragment_')
    if fragment:
        return content_page(request, fragment)

    login_form = AuthenticationForm(request)
    register_form = forms.RegisterForm()

    return render_to_response('frontpage.django.html', locals(), context_instance = RequestContext(request))


def content_page(request, fragment):
    fragment = fragment.split('/');
    if len(fragment) < 2:
        raise Http404

    model = get_model(fragment[0])
    if not model or (not model == models.Cast):
        raise Http404

    try:
        id = int(fragment[1])
    except ValueError:
        raise Http404

    cast = get_object_or_404(model, id=id)

    return render_to_response('cast_view.django.html', locals(), context_instance = RequestContext(request))


def register(request):
    form = None

    if request.method == 'POST':
        form = forms.RegisterForm(request.POST)
        if form.is_valid():
            u = form.save()

            user_image = request.FILES.get('user_image', None)
            if user_image:
                u.user_image.save(user_image.name, user_image, save=True)

            models.UserActivity.objects.create_activity(u, u, 'joined')

            return HttpResponseRedirect(settings.FULL_BASE_URL)

    elif request.method == 'GET':
        form = forms.RegisterForm()

    return render_to_response('registration/register.django.html', locals(), context_instance = RequestContext(request))

# This view will not be accessible if there is no FACEBOOK_APP_ID in settings (see urls.py)
def facebook_login(request,
        redirect_field_name = REDIRECT_FIELD_NAME): 

    redirect_to = request.REQUEST.get(redirect_field_name, '')

    # START of code taken from django.auth.views.login

    # Light security check -- make sure redirect_to isn't garbage.
    if not redirect_to or ' ' in redirect_to:
        redirect_to = settings.LOGIN_REDIRECT_URL
    
    # Heavier security check -- redirects to http://example.com should 
    # not be allowed, but things like /view/?param=http://example.com 
    # should be allowed. This regex checks if there is a '//' *before* a
    # question mark.

    elif '//' in redirect_to and re.match(r'[^\?]*//', redirect_to):
        redirect_to = settings.LOGIN_REDIRECT_URL

    # END of code from django.auth.views.login

    user = authenticate(request=request)

    # new user from facebook
    if not user:

        # load data from the profile to put into facebook
        # how to get more data:
        # http://developers.facebook.com/docs/authentication/permissions

        fb_info = facebook.get_user_from_cookie(request.COOKIES, 
            settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET)

        if fb_info:
            graph = facebook.GraphAPI(fb_info['access_token'])
            profile = graph.get_object('me')

            user, created = models.LocastUser.objects.get_or_create(facebook_id=profile['id'])
            if not created:
                # TODO: error
                pass

            user.set_unusable_password()

            user.username = 'fb_' + str(user.id)
            user.first_name=profile['first_name']
            user.last_name=profile['last_name']

            user.save()

            models.UserActivity.objects.create_activity(user, user, 'joined')

            user = authenticate(request=request)

    if user and user.is_active:
        login(request, user)
        return HttpResponseRedirect(redirect_to)

    else:
        return HttpResponse(content='Invalid facebook credentials', status=400, mimetype='text/plain')


def traveler_js(request):
    boundry_obj = models.Boundry.objects.get_default_boundry()
    boundry = 'null';

    if boundry_obj:
        boundry = boundry_obj.bounds.geojson

    return render_to_response('traveler.django.js', locals(), 
        context_instance = RequestContext(request), mimetype='text/javascript')


def templates_js(request):

    # TODO: Do this in a not terrible way
    template_dir = settings.MEDIA_ROOT + 'js/templates/'

    template_files = [
        'castAddForm.js.html',
        'castClusterPopup.js.html',
        'castComments.js.html',
        'castHeaderList.js.html',
        'castPopup.js.html',
        'collectionHeaderList.js.html',
        'collectionPopup.js.html',
        'mapCastList.js.html',
        'searchResults.js.html',
        'userOpen.js.html'
    ]

    templates = {}
    for tf in template_files:
        try:
            ofile = codecs.open(template_dir + tf, encoding='utf8')
            templates[tf] = ofile.read()
        except IOError:
            pass
        
    content = 'var templates = ' + simplejson.dumps(templates);

    return HttpResponse(status=200, mimetype='application/json; charset=utf-8', content=content)

