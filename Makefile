../open_locast.tar.gz:
	tar --exclude proj/*.egg-info --exclude proj/build --exclude proj/.git* --exclude proj/dist --exclude \*\~ -C ../ -zcvf $@ proj
