/*
 * JavaScript Pretty Date
 * Copyright (c) 2008 John Resig (jquery.com)
 * Licensed under the MIT license.
 *
 * Modified 2011 by MIT Mobile Experience Lab
 * 
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time, date_str){
	var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
		diff = (((new Date()).getTime() - date.getTime()) / 1000),
                day_diff = Math.floor(diff / 86400);
			
	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
            return $.datepicker.formatDate(date_str, date);

	return day_diff == 0 && (
			diff < 60 && gettext( "just now") ||
			diff < 120 && gettext("1 minute ago") ||
			diff < 3600 && Math.floor( diff / 60 ) + gettext(" minutes ago") ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + gettext(" hours ago")) ||
		day_diff == 1 && gettext("Yesterday") ||
		day_diff < 7 && day_diff + gettext(" days ago") ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + gettext(" weeks ago");
}

// If jQuery is included in the page, adds a jQuery plugin to handle it as well
if ( typeof jQuery != "undefined" )
	jQuery.fn.prettyDate = function(date_str){
		return this.each(function(){
			var date = prettyDate(this.title,date_str);
                        if ( date ){
                            jQuery(this).text( date );
                        }
		});
};
