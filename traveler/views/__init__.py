import codecs
import settings
import StringIO

from django.contrib.auth.forms import AuthenticationForm
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.contrib.sites.models import get_current_site
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.utils import simplejson

from locast import get_model

from traveler.forms import EditProfileForm, RegisterForm, RegisterProfileForm
from traveler.models import Cast, UserActivity, Boundry

def frontpage(request):
    fragment = request.GET.get('_escaped_fragment_')
    if fragment:
        return content_page(request, fragment)

    login_form = AuthenticationForm(request)
    edit_profile_form = None
    if request.user.is_authenticated:
        edit_profile_form = EditProfileForm(user = request.user)

    return render_to_response('frontpage.django.html', locals(), context_instance = RequestContext(request))


def content_page(request, fragment):
    fragment = fragment.split('/');
    if len(fragment) < 2:
        raise Http404

    model = get_model(fragment[0])
    if not model or (not model == Cast):
        raise Http404

    try:
        id = int(fragment[1])
    except ValueError:
        raise Http404

    cast = get_object_or_404(model, id=id)

    return render_to_response('cast_content_page.django.html', locals(), context_instance = RequestContext(request))


def register(request):
    form = None
    profile_form = None

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        profile_form = RegisterProfileForm(request.POST)
        if form.is_valid() and profile_form.is_valid():

            # Create the user
            user = form.save()
            user.save()

            # Create a UserActivity
            UserActivity.objects.create_activity(user, user, 'joined')

            # Create a profile
            profile = profile_form.save(commit = False)
            profile.user = user
            profile.save()

            uc = None
            # Send confirmation email
            if 'locast.userconfirmation' in settings.INSTALLED_APPS:
                from locast.userconfirmation.models import UserConfirmation
                user.is_active = False
                user.save()
                uc = UserConfirmation.objects.create_confirmation(user)
                site_name = get_current_site(request).name
                uc.send_confirmation_email('Welcome to ' + site_name + '!')

            user_image = request.FILES.get('user_image', None)
            if user_image:
                profile.user_image.save(user_image.name, user_image, save=True)
            
            profile.save()

            # If user confirmation is off, redirect to the login url
            if not uc:
                return HttpResponseRedirect(settings.LOGIN_URL)

    elif request.method == 'GET':
        form = RegisterForm()
        profile_form = RegisterProfileForm

    return render_to_response('registration/register.django.html', locals(), context_instance = RequestContext(request))


def edit_profile(request):
    form = None
    success = False

    if request.method == 'POST': # If the form has been submitted...
        form = EditProfileForm(data = request.POST, user = request.user) # A form bound to the POST data
        if form.is_valid():
            form.save()
            success = True
            #return HttpResponseRedirect(settings.FULL_BASE_URL)

    elif request.method == 'GET':
        form = EditProfileForm()

    return render_to_response('registration/edit_profile.django.html', locals(), context_instance = RequestContext(request))


def traveler_js(request):
    boundry_obj = Boundry.objects.get_default_boundry()
    boundry = 'null';

    if boundry_obj:
        boundry = boundry_obj.bounds.geojson

    return render_to_response('traveler.django.js', locals(), 
        context_instance = RequestContext(request), mimetype='text/javascript')


def templates_js(request):

    # TODO: Do this in a not terrible way, and a way that keeps themes in mind
    template_dir = settings.STATIC_ROOT + 'js/templates/'

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


def sync_code_png(request):
    import qrcode
    data = settings.HOST + reverse('api_index')

    # If there is an authenticated user, append their email
    # OR username to the url to help prefil login info
    if request.user.is_authenticated():
        user = request.user
        if user.email:
            data = data + '?email=' + user.email
        else:
            data = data + '?username=' + user.username

    # make the code
    # img = qrcode.make(data)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=5,
        border=4,
    )

    qr.add_data(data)
    img = qr.make_image()

    # write it to temp string
    img_io = StringIO.StringIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)

    return HttpResponse(status=200, mimetype='image/png;', content=img_io)
