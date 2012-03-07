#!/usr/bin/python

from traveler.models import LocastUser

users = LocastUser.objects.all()

if not users:
    print "please create a user. The first user created will be made a superuser."
else:
    u = users[0]
    print "making first user found, %s, a superuser" % u
    u.is_staff=True
    u.is_superuser=True
    u.is_admin=True
    u.save()
