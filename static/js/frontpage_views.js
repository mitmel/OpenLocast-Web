/*** CONTROLLER ***/

var frontpage_app = null;
var current_view = null;
var active_user_id = null;

$(function() {
frontpage_app = $.sammy('#main-content', function() {
    this.get('#!cast/:id/', function(context) { activate_view(context, cast_single_view) });
    this.get('#!collection/:id/', function(context) { activate_view(context, collection_single_view) });
    this.get('#!user/:id/', function(context) { activate_view(context, user_single_view) });
    this.get('#!tag/:tag/', function(context) { activate_view(context, tag_view) });

    this.get('#!home', function(context) { activate_view(context, home_view) });
    this.get('#!', function(context) { activate_view(context, all_casts_view) });
});
});

function activate_view(context, view) {
    deactivate_current_view();
    current_view = view;

    // In traveler.js 
    update_auth_redirects();
    if ( 'activate' in view ) {
        view.activate(context);
    }
}

function deactivate_current_view() {
    if ( current_view ) { 
        if ( 'deactivate' in current_view ) {
            current_view.deactivate(); 
        }
    }
}

/*** VIEWS ***/

var home_view = {
    activate: function(context) {
        $('#intro-page-container').fadeIn();
    },
    deactivate: function() {
        $('#intro-page-container').fadeOut();
    }
}

var all_casts_view = {
    activate: function(context) {
        $('#current-map h4').html(gettext('All Casts'));
        clear_cast_filters();
        map_refresh(); 
    },
    deactivate: function() {}
}

/********
 * CAST *
 ********/

function cast_comment_refresh(cast_id) {
    // refresh the comments
    $.ajax({
        url: CAST_API_URL + cast_id + '/comments/', 
        type: 'GET',
        success: function(data) { 
            var comment_data = {
                comments: data
            }

            var context = '#comments-cast_' + cast_id;

            var html = render_to_string('castComments.js.html', comment_data);
            $(context).html(html)

            format_date($('.date', context), true);

            $('a.flag-comment', context).click(function() {
                var _parent = $(this).parent();

                var comment_id = _parent.attr('id').split('_')[1];
                var url = CAST_API_URL + cast_id + '/comments/' + comment_id + '/flag/';

                $.ajax({
                    url: url,
                    data: null,
                    type: 'POST',
                    success: function(data) {
                        _parent.html('<p class="locast-help">' + gettext('flagged') + '</p>');
                    }
                });
                
                return false;
            });
        }
    });
}

function cast_fade_in() {
    $('#content-details').fadeIn(function(){
        cast_container_size_update();
        $('#content-details img').each(function(){
            if(this.height > this.width) {
                $(this).addClass('portrait');
            }
        });
    });

    $('#map-cast-list-title')
        .add('#map-title')
        .add('#map-info-container')
        .add('#map-controls-container')
        .add('#add-cast-button-container')
        .add('#tooltip') 
        .add('#map-layer-switcher')
        .add('#map-list')
        .add('#search-bar')
        .fadeOut();

    $('#comments-minimize').click(function(){
        $('.cast-comments').toggleClass('closed', 100);
        var text = $(this).text();
        text = (text == gettext('Show Comments'))?gettext('Hide Comments'):gettext('Show Comments') ;
        $(this).text(text);  
        return false;
    });   

    if (COLL_ID_FILTER) {
        $('#collection-info').fadeOut();
    } 
}

// This is a separate function in order to allow editing / comment posting
// to refresh the "window"

function cast_info_refresh(cast_id, callback) {
$.ajax({ url: CAST_API_URL + cast_id + '.html/', dataType: 'html', success: function(cast_html) {
    var cast_url = CAST_API_URL + cast_id + '/';
    var media_url = cast_url + 'media/';
    var context = '#open-cast_' + cast_id;

    // refresh the html
    $('#content-details').html(cast_html);

    // refresh the comments.
    cast_comment_refresh(cast_id);

    // Urlize the description urls
    var desc = $('p', '#description-cast_' + cast_id);
    desc.urlize('');

    // make dates pretty
    format_date($('.cast-date', context), true);

    activate_favorite_button('cast', cast_id, cast_url + 'favorite/');

    // activate flag button
    if ( TRAVELS_USER ) {
        $('#flag-cast_' + cast_id).click(function() {
            var html = '<h4 class="locast-instruction">';
            html += gettext('Are you sure you want to flag this cast as inappropriate ?') + '</h4>';
            html += '<a id="flag-yes-cast_' + cast_id + '" class="locast-button" href="#">yes</a>';
            html += '<a class="locast-button" id="flag-no-cast_' + cast_id + '" href="#">no</a>';

            $('#flag-confirm-cast_' + cast_id).html(html);
            
            $('#flag-confirm-cast_' + cast_id).show();

            $('#flag-yes-cast_' + cast_id).click(function() {
                $.ajax({
                    url: cast_url + 'flag/', 
                    type: 'POST',
                    success: function(result) { 
                        $('#flag-cast_' + cast_id).parent().html('<h6 class="flagged">flagged</h6>');
                         $('#flag-confirm-cast_' + cast_id).hide();
                    }
                });
                return false;
            });
            
            $('#flag-no-cast_' + cast_id).click(function() {
                $('#flag-confirm-cast_' + cast_id).html('');
                 $('#flag-confirm-cast_' + cast_id).hide();
                return false;
            });

            return false;
        });
    }
    else {
        $('#flag-cast_' + cast_id).click(function() {
            prompt_login();
            return false;
        });
    }

    // activate cast delete button
    $('#delete-cast_' + cast_id).click(function() {
        var delete_prompt = $(".delete-cast-prompt");
        delete_prompt.fadeIn();
       
        $('.delete', delete_prompt).click(function(){
                $.ajax({
                    url: cast_url,
                    type: 'DELETE',
                    success: function(cast) {
                        frontpage_app.setLocation('#!');
                        map_refresh();
                    }
                });
                return false;
        });
        $('.cancel', delete_prompt).click(function(){
               delete_prompt.fadeOut();
               return false;
        });

        return false;
    });

    // activate commenting
    var comment_form = $('#content-form-cast_' + cast_id)
    comment_form.submit(function(event) {
        var data = form_to_json(comment_form);
        
        $.ajax({
            url: cast_url + 'comments/', 
            data: data,
            contentType: 'application/json; charset=utf-8',
            type: 'POST',
            success: function(cast) { 
                comment_form[0].reset();
                cast_comment_refresh(cast_id);
            }
        });
            
        event.returnValue = false;
        return false;
    });
    
    //activate title updating
    var title_form = $('#title-form-cast_' + cast_id);

    $('.cast-info .edit-toggle', '#open-cast_' + cast_id).click(function (){
        $('.cast-title',   '#open-cast_' + cast_id).fadeOut(0);   
        title_form.fadeIn();
        on_resize();
        return false;
    });

    title_form.submit(function(event) {
        var data = form_to_json(title_form);

        $.ajax({
            url: cast_url,
            data: data,
            contentType: 'application/json; charset=utf-8',
            type: 'PUT',
            success: function(cast) {
                title_form[0].reset();
                cast_info_refresh(cast_id);
            }
        });

        event.returnValue = false;
        return false;
    });
        
    //activate description updating
    var desc_form = $('#description-form-cast_' + cast_id);

    $('.cast-description .description .edit-toggle', '#open-cast_' + cast_id).click(function (){
        $('.cast-description .description', '#open-cast_' + cast_id).fadeOut(0);
        desc_form.fadeIn();
        on_resize();
        return false;
    });

    desc_form.submit(function(event) {
        var data = form_to_json(desc_form);

        $.ajax({
            url: cast_url,
            data: data,
            contentType: 'application/json; charset=utf-8',
            type: 'PUT',
            success: function(cast) {
                desc_form[0].reset();
                cast_info_refresh(cast_id);
            }
        });

        event.returnValue = false;
        return false;
    });

    // tag updating
    var update_tags = function(event) {
        var data = tag_form.serializeObject();

        $('a.cast-tag', '#tag-list-cast_' + cast_id).each(function(index) {
            data['tags'] = data['tags'] + ',' + $(this).html();
        });

        data['tags'] = data['tags'];

        data = JSON.stringify(data,null,2);

        $.ajax({
            url: cast_url,
            contentType: 'application/json; charset=utf-8',
            data: data,
            type: 'PUT',
            success: function(cast) {
                tag_form[0].reset();
                cast_info_refresh(cast_id);
            }
        });

        // if its called from a submit on a form
        if ( event ) {
            event.returnValue = false;
        }
        return false;
    }

    // activate tag updating
    var tag_form = $('#tag-form-cast_' + cast_id)
    tag_form.submit(update_tags);
    
    // dhtml
    $('.cast-tags .edit-toggle', '#open-cast_' + cast_id ).click(function(){
        $(this).fadeOut(0);
        tag_form.fadeIn();
        on_resize();
    });  

    $('.delete-tag', '#tag-list-cast_' + cast_id).click(function() {
        $(this).parent().remove();
        update_tags();
    });

    // activate location updating
    $('#change-location-cast_' + cast_id).click(function() {

        $('#content-details').fadeOut();
        $('#map-controls-container')
            .add('#change-location-container').fadeIn();

        main_map.addCastControl.activate();

        var html = '<h4 class="locast-instruction" >'+gettext('Choose a New Location for This Cast by Clicking the Map')+'</h4>';
        html += '<div class="cleared" id="change-location-buttons">'
        html += '<a href="#" id="change-location-cancel-cast_'+ cast_id +'" class="locast-button">'+ gettext('Cancel')+'</a>';
        html += '<a href="#" class="locast-button"  id="change-location-finish-cast_' + cast_id + '">'+gettext('Save New Location')+'</a>';
        html += '</div>';

        $('#change-location-container').html(html);       

        // Click cancel
        $('#change-location-cancel-cast_' + cast_id).click(function() {
            main_map.addCastControl.deactivate();
            
            if ( main_map.addCastPoint ) {
                main_map.addCastPoint.destroy();	
                main_map.addCastPoint = null;
            }

            $('#content-details').fadeIn();
            $('#map-controls-container')
                .add('#change-location-container').fadeOut();

            return false;
        });

        // Click save new location
        $('#change-location-finish-cast_' + cast_id).click(function() {
            if ( main_map.addCastPoint ) {
                var x = main_map.addCastPoint.geometry.x;
                var y = main_map.addCastPoint.geometry.y;
                var ll = main_map.get_disp_ll(x,y);

                main_map.addCastControl.deactivate();
                $('#change-location-container').fadeOut();

                var data = JSON.stringify({'location': [ll.lon, ll.lat]}, null, 2);

                frontpage_app.setLocation('#!');

                $.ajax({
                    url: cast_url,
                    data: data,
                    type: 'PUT',
                    success: function(cast) {
                        if ( main_map.addCastPoint ) {
                            main_map.addCastPoint.destroy();
                            $('#change-location-container').html('');
                            map_refresh();
                        }
                        frontpage_app.setLocation('#!cast/' + cast.id + '/');
                    }
                });
            }
            else {
                alert(gettext('Select a new location!'));
            }
            
            return false;
        });
        
        return false; 
    });

    // active facebok like button, if facebook is enabled
    // http://fbexchange.net/questions/19/how-can-i-use-jquery-to-dynamically-load-serverfbml-content-into-my-iframe-app-pa
    var fb = $('#facebook-share-cast_' + cast_id)[0];
    if ( fb ) {
        FB.XFBML.parse(fb);
    }

    // activate the link poster 
    var link_form = $('#link-post-form-cast_' + cast_id);
    link_form.submit(function(event) {
        var data = form_to_json(link_form);

        $.ajax({
            url: media_url, 
            data: data,
            contentType: 'application/json; charset=utf-8',
            type: 'POST',
            success: function(media) { 
                link_form[0].reset();
                cast_info_refresh(cast_id);
            }
        });
            
        event.returnValue = false;
        return false;
    });

    var media_list_context = '#media-list-cast_' + cast_id;

    // photos
    $('.photo a.cast-photo', media_list_context).fancybox({titlePosition:'inside'});

    // vimeo videos
    $('a.vimeocom', media_list_context).click(function() {
        $.fancybox({
            'padding'       : 0,
            'autoScale'     : false,
            'title'         : this.title,
            'width'         : 400,
            'height'        : 265,
            'href'          : this.href.replace(new RegExp("([0-9])","i"),'moogaloop.swf?clip_id=$1'),
            'type'          : 'swf'
        });
        return false;
    });

    // youtube videos
    $('a.youtubecom', media_list_context).click(function() {
        $.fancybox({
            'titleShow' : false,
            'href'      : this.href.replace(new RegExp("watch\\?v=", "i"), 'v/'),
            'type'      : 'swf',
            'swf'       : {'wmode':'transparent','allowfullscreen':'true'}
        });
        return false;
    });

    // hosted videos
    $('.web-stream-file', media_list_context).click(function() {
        $('#flowplayer-container').removeClass('hidden');

        $f('flowplayer-player', FLOWPLAYER_SWF, {
            clip: {
                url: this.href,
                autoPlay: true,
                scaling:'fit'
            }
        });

        return false;
    });

    $('.web-stream.file', media_list_context).flowplayer(FLOWPLAYER_SWF);

    // activate the cast gallery
    $(media_list_context).xfade({
        speed:600,
        interval:10000,
        autoplay:false,
        total_num:$('#total-media'),
        index_num:$('#current-media'),
        next_button:$('#media-next'),
        prev_button:$('#media-last')
    });

    // activate media deleting
    $('.delete-media', media_list_context).click(function() {
        var delete_prompt = $('.delete-media-prompt');
        var media_id = $(this).attr('id').split('_')[1];
        var m_delete_url = media_url + media_id + '/';
        
        delete_prompt.fadeIn();
       
         $('.delete' , delete_prompt).click(function(){
                $.ajax({
                    url: m_delete_url,
                    type: 'DELETE',
                    success: function(cast) {
                        cast_info_refresh(cast_id);
                    }
                });
                return false;
        });
            
        $('.cancel', delete_prompt).click(function(){
            delete_prompt.fadeOut();
            media_id = '';
            m_delete_url = '';
            return false;
        });
    });

    // media adding
    $('#add-media-button-cast_' + cast_id).click(function() {
        var add_media_window = $('#add-media-cast_' + cast_id);
        add_media_window.fadeIn();

        // close button
        $('#add-media-close-cast_' + cast_id).click(function() {
            cast_info_refresh(cast_id);
            add_media_window.fadeOut();
        });

        // Pluploader for some reason can't activate choosers
        // unless they are already visible
        
        // activate uploaders

        var photo_uploader = create_uploader('photo-uploader-cast_' + cast_id, 'imagemedia', '',
            function(){cast_info_refresh(cast_id)});

        activate_upload_form('photo-upload-form-cast_' + cast_id, media_url, photo_uploader);

        var vid_uploader = create_uploader('video-uploader-cast_' + cast_id, 'videomedia', '',
            function(){cast_info_refresh(cast_id)});

        activate_upload_form('video-upload-form-cast_' + cast_id, media_url, vid_uploader);
    });

    // CALLBACK
    if ( callback ) {
        callback(cast_id, cast_html);
    }
}});
}

// Update open cast position on window resize so it stays aligned with the feature

var cast_marker_id = null;
var last_marker_x = 0;
var last_marker_y = 0;

var cast_position_update = function(){  
    // get the element marking the position of the cast on the map
    var elem = $(document.getElementById(cast_marker_id));

    // if the element is off the screen its offset is null
    if(elem.offset() == null){return;}
    
    var cast =  $('#content-details .casts');
    var cast_offset_x = parseInt(cast.css('padding-left'));
    var cast_offset_y = parseInt(cast.css('padding-top'));
    
    var indicator = $('#content-details .indicator');
    var indicator_offset_x = parseInt(indicator.css('left'));
    var indicator_offset_y = parseInt(indicator.css('top'));
 
    // subtract the change in the element position from the open cast's top and left padding
    var dx =(last_marker_x-elem.offset().left);
    var dy = (last_marker_y-elem.offset().top) ;

    last_marker_x = elem.offset().left;
    last_marker_y = elem.offset().top; 
    
    // update open cast padding
    cast.css('padding-left',cast_offset_x - dx).css('padding-top', cast_offset_y - dy);
    indicator.css('left',indicator_offset_x - dx ).css('top',indicator_offset_y - dy)
    cast_container_size_update();
 }

var cast_container_size_update = function(){
    // update open cast container size so it fits in browser
    var height = $(window).height();
    var width = $(window).width();
    var castHeight = $('#content-details .casts').height();
    $('#content-details .content-details-close').height(castHeight+150);
    $('#content-details').height(height-$('#footer').height()).width(width);
}

var cast_single_view = {};

cast_single_view['activate'] = function(context) {
cast_info_refresh(context.params['id'], function(cast_id) {
    var loc_arr = $('#' + 'location-cast_' + cast_id).html().split(',');

    var pnt = new OpenLayers.Geometry.Point(parseFloat(loc_arr[0]), parseFloat(loc_arr[1]));
    pnt.transform(main_map.displayProjection, main_map.projection);
    var feature = new OpenLayers.Feature.Vector(pnt);

    main_map.openCastLayer.addFeatures([feature]);

    var ll = main_map.get_ll(feature.geometry.x, feature.geometry.y);
    var bounds = main_map.map.calculateBounds();

    if ( !bounds.containsLonLat(ll) ) {
        main_map.map.setCenter(ll);
    }

    main_map.clearPopups();

    // deselect the cast
    main_map.selectCast.unselectAll();

    cast_marker_id = feature.geometry.id;

    var elem = $(document.getElementById(feature.geometry.id));
    var dx = 0;
    var dy = 0;

    // randomly sometimes elem doesn't exist
    if ( elem && elem.offset() ) {
        // offset from left of window
        var xpad = 134;

        // offset from top of window 
        var ypad = 240;

        // init these values to calculate on window resize
        last_marker_x = xpad;
        last_marker_y = ypad;
        var dx = elem.offset().left - xpad;
        var dy = elem.offset().top - ypad;
    }

    if ( dx != 0 && dy != 0 ) {
        // pan the map, and then fade the cast in.

        // (hackish) this will actually fade in the cast in the moveend map listener
        // this is because its slow as hell to fade in and pan simultaneously
        // This boolean is checked in onmap move or something.
        CAST_FADE_IN = true;
        main_map.map.pan(dx, dy);
    }
    else { 
        cast_fade_in();
    }

    // set up close button
    $('#close-cast_' + cast_id).click(function() {
        if (TAG_FILTER){
            frontpage_app.setLocation('#!tag/'+TAG_FILTER+'/');
        }
        if (COLL_ID_FILTER) {
            frontpage_app.setLocation('#!collection/'+COLL_ID_FILTER+'/');
        }
        if (AUTHOR_FILTER){
            frontpage_app.setLocation('#!user/'+active_user_id+'/');
        }
        if(!AUTHOR_FILTER && !COLL_ID_FILTER && !TAG_FILTER) {
            frontpage_app.setLocation('#!');
        }
        return false;
    });

    // attach handler to reposition open cast on window resize
    $(window).resize(cast_position_update); 
    
});
}

cast_single_view['deactivate'] = function() {
    $('#content-details').fadeOut();
    $('#content-details').html('');
     
    $('#map-cast-list-title')
        .add('#map-title') 
        .add('#map-controls-container') 
        .add('#search-bar')
        .add('#map-layer-switcher')  
        .fadeIn(function(){
            //in case window has been resized while cast was open
            on_resize();
        });
    
    $('#add-cast-button-container').hide();

    var viewIsList = $('#view-switch-list').hasClass('selected');
    if(viewIsList){
        $('#view-switch-map').removeClass('selected');
        $('#view-switch-list').addClass('selected');
        $('#map-info-container').fadeIn(100);
    }else{
        $('#view-switch-map').addClass('selected');
        $('#view-switch-list').removeClass('selected');
        $('#map-info-container').fadeOut(100);
    }

    // this clears the invisible feature that was added
    main_map.openCastLayer.removeAllFeatures();
    
    //remove handler to adjust open cast position on resize
    $(window).unbind('resize',cast_position_update);
} // end deactivate
 
/**************
 * COLLECTION *
 **************/

var collection_single_view = {}; 

collection_single_view['activate'] = function(context) {
    var id = context.params['id'];

    context.load(COLLECTION_API_URL + id + '/').then(function(coll) {

        // show only casts in this collection
        clear_cast_filters();
        COLL_ID_FILTER = coll.id;
        map_refresh();

        // setup map
        highlightCollection(coll.id);
        main_map.clearPopups();
        
        var coll_feature = main_map.collectionLayer.getFeatureByFid(coll.id)
        if (coll_feature && !coll_feature.onScreen()) {
            main_map.panTo(coll.path[0][0], coll.path[0][1]);
        }
        
        $('#current-map h4').html(coll.title);

        // DHTML
        activate_favorite_button('collection', coll.id, COLLECTION_API_URL + coll.id + '/favorite/');
    });  
}

collection_single_view['deactivate'] = function() {}

/********
 * USER *
 ********/

var user_single_view = {

activate : function(context) {
    var user_id = context.params['id'];
    context.load(USER_API_URL + user_id + '/').then(function(user) { 
        clear_cast_filters();
        AUTHOR_FILTER = 'author=' + user_id;
        $('#current-map h4').html(gettext('Casts Created by') + ' ' + user.display_name);
        map_refresh();
    });
    },

    deactivate : function() { }
}

/*******
 * TAG *
 *******/

tag_view = {
    activate : function(context) {
        clear_cast_filters();
        TAG_FILTER = context.params['tag'];
        $('#current-map h4').html(gettext('Casts Tagged') + ' ' + TAG_FILTER + '</h4>');
        map_refresh();
    },
    // needs to be deactivated manually clear_open_tag
    deactivate : function() { }
}

