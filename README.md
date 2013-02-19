Open Locast Web
===============

This is the web frontend for the [Open Locast][locast] framework. This also
provides a public API which is used by the [mobile app][locastandroid] and can
be used by other external services.

This project builds on top of [GeoDjango][geodjango] to provide a generalized
platform for creating, publishing, collaborating on, and displaying geo-tagged
content.

Requirements
------------

 * [Postgresql][postgresql] or other spatial DB supported by GeoDjango
 * Python 2.5 or greater
 * [Locast Web Core][locastwebcore]
 * Django 1.4+
 * [PIL][pil]
 * ffmpeg
 * virtualenv (optional)
 * git (optional)

All the Python libraries mentioned here can be installed using pip or easy\_install.

Installation
------------

Please see our [online documentation][docs] for a complete walk-through of how
to install Open Locast Web.

License
-------
Open Locast Web  
Copyright 2010-2013 [MIT Mobile Experience Lab][mel]

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
version 2 as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

[locast]: http://locast.mit.edu/
[locastwebcore]: https://github.com/mitmel/Locast-Web-Core/
[locastandroid]: https://github.com/mitmel/Locast-Core-Android-Example
[postgresql]: http://www.postgresql.org/
[geodjango]: http://geodjango.org/
[pil]: http://www.pythonware.com/products/pil/
[docs]: http://locast.mit.edu/documentation/
