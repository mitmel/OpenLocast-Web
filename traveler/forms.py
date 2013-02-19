import uuid

from django import forms
from django.forms import widgets
from django.utils.translation import ugettext_lazy as _

from traveler import models

# Used in the API to validate input
class CastAPIForm(forms.ModelForm):
    class Meta: 
        model = models.Cast
        fields = ('uuid', 'author', 'title', 'description', 'privacy')


class VideoMediaForm(forms.ModelForm):
    class Meta: 
        model = models.VideoMedia
        fields = ('uuid', 'author', 'title', 'language')
        

class ImageMediaForm(forms.ModelForm):
    class Meta: 
        model = models.ImageMedia
        fields = ('uuid', 'author', 'title', 'language')


class LinkedMediaForm(forms.ModelForm):
    class Meta: 
        model = models.LinkedMedia
        fields = ('uuid', 'author', 'url',)


class RegisterForm(forms.Form):

    def clean(self):
        cleaned_data = self.cleaned_data
        password = cleaned_data.get('password')
        password_verify = cleaned_data.get('password_verify')

        if not password == password_verify:
            msg = _('Passwords did not match!')
            self._errors['password'] = self.error_class([msg])

            del self.cleaned_data['password']
            del self.cleaned_data['password_verify']

        if 'email' in self.cleaned_data:
            if len(models.LocastUser.objects.filter(email=self.cleaned_data['email'])):
                self._errors['email'] = self.error_class([_('email has already been registered!')])
                
        return cleaned_data

    def save(self):
        cleaned_data = self.cleaned_data
        u = models.LocastUser()

        u.username = uuid.uuid4().hex[:30]
        u.email = cleaned_data.get('email')

        u.first_name = cleaned_data.get('first_name')
        u.last_name = cleaned_data.get('last_name')

        u.set_password(cleaned_data.get('password'))

        u.save()

        # lc stands for locast!!
        u.username = 'lc_' + str(u.id)
        u.save()
        return u

    email = forms.EmailField(label=_('Email'))

    first_name = forms.CharField(max_length=32, label=_('First Name'))
    last_name = forms.CharField(max_length=32, label=_('Last Name'))

    password = forms.CharField(widget=forms.PasswordInput(render_value=False), 
        label=_('Password'))

    password_verify = forms.CharField(widget=forms.PasswordInput(render_value=False), 
        label=_('Verify Password'))


# Used when registering
class RegisterProfileForm(forms.ModelForm):
    class Meta:
        model = models.LocastUserProfile
        exclude = ('user',)

    bio = forms.CharField(required=False, label=_('Short Bio'), widget=widgets.Textarea())
    personal_url = forms.URLField(required=False, label=_('Your Website'))
    user_image = forms.ImageField(required=False, label=_('Profile Picture'))
    hometown = forms.CharField(required=False, label=_('Where are you from?'))


# TODO: this should probably subclass Django's built in password change form
# django.contrib.auth.forms
class EditProfileForm(forms.Form):

    def __init__(self, user=None, *args, **kwargs):
        super(EditProfileForm, self).__init__(*args, **kwargs)
        self._user = user

    def clean(self):
        cleaned_data = self.cleaned_data
        password = cleaned_data.get('password')
        password_verify = cleaned_data.get('password_verify')

        if not password == password_verify:
            msg = _('Passwords did not match!')
            self._errors['password'] = self.error_class([msg])

            del self.cleaned_data['password']
            del self.cleaned_data['password_verify']

        return cleaned_data

    def save(self):
        cleaned_data = self.cleaned_data
        self._user.set_password(cleaned_data.get('password'))
		
        self._user.save()

    password = forms.CharField(required=False,widget=forms.PasswordInput(render_value=False), 
        label=_('New Password'))

    password_verify = forms.CharField(required=False,widget=forms.PasswordInput(render_value=False), 
        label=_('Verify New Password'))
