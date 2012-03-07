import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

from datetime import datetime, timedelta

from locast.models.modelbases import LocastContent

from traveler import models

def process_casts():

    videomedias = models.VideoMedia.objects.filter(content_state=LocastContent.STATE_COMPLETE)

    for v in videomedias:
        # This is done in order to make sure the object is up to date with the database
        videomedia = models.VideoMedia.objects.get(id=v.id)
        if videomedia.content_state == LocastContent.STATE_COMPLETE:
            videomedia.process(verbose=True, force_update=True)

if __name__ == '__main__':
    print str(datetime.now()) + ' =======  running process_casts ======'
    process_casts()
