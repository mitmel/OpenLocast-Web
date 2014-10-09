var main_map = null;

/********/
/* INIT */
/********/

$(function() {
    // map
    on_resize();
    setup_map();
    collection_list_refresh();
    map_refresh();

    // dhtml
    activateDHTML();
    fix_openlayers_zoombar();

    // from frontpage_views.js
    frontpage_app.run(); 

    // If no URL is specified, redirect to home
    if (location.hash == '') { frontpage_app.setLocation('#!home'); }
});

function on_resize() {

    var height = $(window).height();
    var width = $(window).width(); 

    //if we are on a static form then make the page the height of the form so that scrolling works on mobile
    if($('#main-content .static-form').length == 0) {
         $('#main-map').add('#content-details').height(height);
    }
    else {
        $('#footer').add('#fdbk_tab').addClass('form');
        var min_height = height
            - parseInt($('#main-content .static-form').css('margin-top')) 
            - $('#header').height()
            - 10;
        $('#main-content .static-form').css('min-height',min_height);    
        $('body').height($('#main-content .static-form').height()).css('overflow', 'auto');
    }

    $('#main-map').width(width);
    $('#map-list').height(height-100);
    map_cast_list_height();
}

$(window).resize(on_resize);

function map_cast_list_height() {
    var height = $(window).height - parseInt( $('#footer').height());
    $('#map-info-container').height(height);
}

function activateDHTML(){

    activate_search_bar();

    // map reset button
    $('#map-reset').click(function() {
        reset_map();
    });

    //view switcher
    $('#map-info-container').click(function(e){
        if($(e.target).is('#map-cast-list-title a')||$(e.target).is('#map-cast-list-title li')){
            return;
        }     
        $('#view-switch-map').addClass('selected');
        $('#view-switch-list').removeClass('selected');
        $('#map-info-container').fadeOut(100);
    });

    $('#view-switcher a').click(function(e){
        var isMap = $(this).hasClass('map');
        if(isMap) {
            $('#view-switch-map').addClass('selected');
            $('#view-switch-list').removeClass('selected');
            $('#map-info-container').fadeOut(100);
        }
        else {
            $('#view-switch-map').removeClass('selected');
            $('#view-switch-list').addClass('selected');
            $('#map-info-container').fadeIn(100);
        }
        return false;
    });

    $('#add-cast-button').click(function() {
        if (!TRAVELER_USER) {
            prompt_login();
        }
        else {
            activate_cast_add();
        }
    });

    // activate login button at top
    $('#login-link').add('#login-container-close').click(function() {
        $('#login-container').toggleClass('hidden');
        return false;
    });

    $('#edit-profile-link').click(function() {
        $('#edit-profile-container').fadeIn();
        $('#edit-profile-close').click(function() {
            $('#edit-profile-container').fadeOut();
            return false;
        }); 
        return false;
    });

    // orderby switchers
    $('#cast-list-sort a').click(function() {
        $(this).siblings('.selected').removeClass('selected');
        $(this).addClass('selected');
        map_cast_list_refresh();
    });
}    

/*******
 * MAP *
 *******/

function setup_map() {
    main_map = new Map(MAP_DEFAULTS);
    main_map.init('main-map');
    main_map.map.events.on({'moveend' : on_map_move });
    
    //checkbox for osm
    $('#osm-checkbox').click(function(){
        var is_checked = $(this).attr('checked');
        if(is_checked == 'checked'){
            main_map.osmLayerSwitcher(true);
        }else{
            main_map.osmLayerSwitcher(false);
        } 
    });
}

function reset_map() {
    var center = MAP_DEFAULTS['center'];
    main_map.setCenter(center[0], center[1]);
    main_map.map.zoomTo(MAP_DEFAULTS['zoom']);
}

CAST_FADE_IN = false;
function on_map_move() {
    if ( CAST_FADE_IN ) {
        // see: frontpage_views.cast_single_view
        cast_fade_in();
        CAST_FADE_IN = false;
    }
}

// if the map itself is currently being refreshed
MAP_REFRESH_ACTIVE = false;

// If the cast list is currently being refreshed
CAST_LIST_REFRESH_ACTIVE = false;

function check_map_loader() {
    if ( MAP_REFRESH_ACTIVE || CAST_LIST_REFRESH_ACTIVE ) {
        $('#map-loader').fadeIn();
    }
    else {
        $('#map-loader').fadeOut();
    }
}

function map_refresh() {
    main_map.clearPopups();    

    var query = get_cast_filter_query();

    MAP_REFRESH_ACTIVE = true;
    check_map_loader();

    // refresh the map
    $.ajax({
        async: true,
        cache: false,
        url: FEATURES_API_URL + query,
        success: map_refresh_cb
    })
    
    map_cast_list_refresh();
}

function map_refresh_cb(data) {
    main_map.reloadFeatures(data);

    if ( CAST_FILTER['collection'] ) {
        highlightCollection( CAST_FILTER['collection'] );
    }

    MAP_REFRESH_ACTIVE = false;
    check_map_loader();
}

var map_cast_list_page = 1;
var pagesize = 9;

function map_cast_list_refresh(maintain_page) {
    if ( !maintain_page ) {
        map_cast_list_page = 1;
    }

    var query = get_cast_filter_query();
    var orderby = $('.selected', '#cast-list-sort')
        .attr('id').split('_')[1];

    if ( query ) { query += '&'; }
    query += 'page=' + map_cast_list_page + '&pagesize=' + pagesize + '&orderby=' + orderby;

    CAST_LIST_REFRESH_ACTIVE = true;
    check_map_loader();
   
    var resp = $.ajax({
        url: CAST_API_URL + query,
        cache: false,
        success: function(data) {
            var page = resp.getResponseHeader('X-Page-Number');
            var total = 
                Math.ceil(resp.getResponseHeader('X-Object-Total')/pagesize);

            map_cast_list_cb(data, page, total);
        }
    });
}

function map_cast_list_cb(data, page, total) {
    var ca_data = {
        casts: data
    }

    $('#map-cast-list-pager').pager({ 
        pagenumber: page,
        pagecount: total,
        buttonClickCallback: function (pgnum) {
            map_cast_list_page = pgnum;
            map_cast_list_refresh(true);
        }
    });

    var html = '<h3 class="alert">' + gettext('No Casts on Map') + '</h3>';
    //if there are no casts then insert some html 
    if( ca_data['casts'].length > 0 ) {
        html = render_to_string('mapCastList.js.html', ca_data);
    }

    $('#map-cast-list .list-content').html(html);
    map_cast_list_height();
    $('#map-cast-list').hide().fadeIn(200);
   
    CAST_LIST_REFRESH_ACTIVE = false;
    check_map_loader();
}


/**********
 * HEADER *
 **********/

// called when something is done that requires login
function prompt_login() {
    $('#login-container').removeClass('hidden');
    $('#login-alert').fadeIn(300);
    $('#login-alert').delay(2000).fadeOut(300);
}

function collection_list_refresh() {
    $.ajax({
        url:  BASE_URL + '/api/collection/', 
        success: collection_list_cb
    });
}

function collection_list_cb(data) { 
    var it_data={
        collections: data    
    } 

    var html = render_to_string('collectionHeaderList.js.html', it_data);
    $('#map-list').add('#intro-map-list').html(html); 

    //map list reveal 
    $('#current-map').add('#map-list').click(function(){
        $('#map-list').slideToggle(100);
        var right = $('#current-map .arrow').hasClass('right');
        if(right){ 
            $('#current-map .arrow').removeClass('right').addClass('down');
        }else{
             $('#current-map .arrow').removeClass('down').addClass('right');
        }
    }); 
}

/* SEARCH BAR */

function activate_search_bar() {
    var default_val = gettext('search for maps, casts or people');
    var search_input = $('#search-input');
    var search_results = $('#search-results');    
   
    // keep track if search is active
    var search_active = false;

    search_input.val(default_val);

    var reset_search = function(){
        search_input.val(default_val);
        search_active = false;
        search_results.fadeOut();
    };
   
    //fade out results when they lose focus
    search_results.attr('tabindex', -1).focusout( function(e){ 
        search_results.fadeOut();
    });
    
    //on keypress return focus to search input
    search_results.keydown(function(e){
         if(e.keyCode == 13 || e.keyCode == 8){
            e.preventDefault();
            return false;
        } else{
            search_input.focus();
        }
    });
 
    //set timeout to reset search input when it loses focus
    search_input.focusout(function(e){ 
        var reset = setTimeout(reset_search, 300);
        $(search_input).data('timer', reset);
    });

    //remove timeout and clear search input when it gains focus
    search_input.focusin(function() { 
        clearTimeout($(search_input).data('timer'));
        if(search_active == false){
            $(this).val('');
            search_active = true;
        }
    });

    //execute search on pressing enter
    search_input.keydown(function(e) {
        if(e.keyCode == 13){
            e.preventDefault();
            universal_search(search_input.val());
            return false;
        }   
    });

    search_input.keyup(function() {
        clearTimeout($(search_input).data('timer'));

        var do_search = function() {
            universal_search(search_input.val());
        }

        var wait = setTimeout(do_search, 500);
        $(search_input).data('timer', wait);
    });
}

var last_search = '';

function universal_search(keyword) {
    if ( keyword.length && !(keyword == last_search) ) {
        last_search = keyword;
        $.ajax({
            url: SEARCH_API_URL,
            data: {q:keyword},
            type: 'GET',
            success: function(result) { 
                var html = render_to_string('searchResults.js.html', result);
                $('#search-results').fadeIn(15).html(html);
            }
        });
    }
}

/****************
 * CAST FILTER *
 ***************/

var CAST_FILTER = {}
CAST_FILTER['collection'] = null;
CAST_FILTER['author'] = null;
CAST_FILTER['tag'] = null;

// { 'author' : 1, 'collection' : 1 }

function set_cast_filter(new_filter) {
    var changed = false;

    // Iterate through the possible cast filters. If
    // its not in new_filter, default to null
    for ( var filter in CAST_FILTER ) {
        var val = null; 
        if (filter in new_filter) {
            val = new_filter[filter]
        }
        if ( CAST_FILTER[filter] != val ) {
            CAST_FILTER[filter] = val;
            changed = true; 
        }
    }

    if ( changed ) {
        map_refresh(); 
    }
}

function clear_cast_filter() {
    set_cast_filter({});
}

function get_cast_filter_query() {
    var query = '';

    if ( CAST_FILTER['collection'] ) {
        if ( query ) { query += '&'; }
        query += 'collection=' + CAST_FILTER['collection'];
    }

    if ( CAST_FILTER['author'] ) {
        if ( query ) { query += '&'; }
        query += 'author=' + CAST_FILTER['author'];
    }

    if ( CAST_FILTER['tag'] ) {
        if ( query ) { query += '&'; }
        query += 'tags=' + CAST_FILTER['tag'];
    }

    query = '?' + query;
    return query;
}

/***********
 * HELPERS *
 ***********/

function activate_cast_add() {
    var cast_add_container = $('#cast-add-container');
    var cast_add_html = render_to_string('castAddForm.js.html');
    cast_add_container.html(cast_add_html);

    var action = CAST_API_URL;

    // If there is an active collection, assume we are adding it to that.
    if ( CAST_FILTER['collection'] ) {
        action = COLLECTION_API_URL + CAST_FILTER['collection'] + '/cast/';
    }

    $('#cast-add-form').attr('action', action);

    $('#cancel-cast-add').click(function() {
        cast_add_form_clear(); 
        return false;
    });

    $('#cast-add-form').submit(cast_add_form_submit);

    cast_add_container.fadeIn();

    if ( CAST_FILTER['collection'] ) {
        $('#add-cast-collection_' + CAST_FILTER['collection'])
        .add('#close-collection_' + CAST_FILTER['collection'])
        .add('.open-collection')
            .fadeOut(0);
    }

    main_map.addCastControl.activate();

    return false;
}

function cast_add_form_clear() {
    var cast_add_container = $('#cast-add-container');
    cast_add_container.fadeOut();
    main_map.addCastControl.deactivate();
    if ( main_map.addCastPoint ) {
        main_map.addCastPoint.destroy();
        main_map.addCastPoint = null;
    }
    cast_add_container.html('');

    if ( CAST_FILTER['collection'] ) {
        $('.collection-add-cast') 
        .add('#collection-info .locast-icon.close')
        .add('.open-collection')
            .fadeIn(200);
    }

    if($('#view-switch-list').hasClass('selected')){
        $('#map-info-container').fadeIn(200);
    }   
}

function cast_add_form_submit(e) {
    if ( main_map.addCastPoint ) {
        var obj = $('#cast-add-form').serializeObject();
        var x = main_map.addCastPoint.geometry.x;
        var y = main_map.addCastPoint.geometry.y;
        var ll = main_map.get_disp_ll(x,y);
        obj['location'] = [ll.lon, ll.lat];

        var url = $('#cast-add-form').attr('action');
        var data = JSON.stringify(obj, null, 2);

        $.ajax({
            url: url, 
            data: data,
            contentType: 'application/json; charset=utf-8',
            type: 'POST',
            error: function(error){
                var message = jQuery.parseJSON(error.responseText);
                if(message.location != undefined){ 
                    $('#cast-add-error').text(gettext('The Location you Selected is Outside the Boundry! Select a Location in the Boundry.')).fadeIn();
                }
                if(message.title != undefined){
                    $('#cast-add-error').text(gettext('Enter a Title for Your Cast')).fadeIn();
                }
            },
            success: cast_add_success,
        });
    }

    else {
        $('#cast-add-error').text(gettext('Click the Map to Select a Location for Your Cast')).fadeIn();
    }

    // prevent default form handling
    e.returnValue = false;
    return false;
}

function cast_add_success(cast) {
    $.ajax({
        url: CAST_API_URL + cast.id + '/geofeature/',
        contentType: 'application/json; charset=utf-8',
        type: 'GET',
        success: function(data) {
            main_map.addCastFeature(data);
            cast_add_form_clear();
            frontpage_app.setLocation('#!cast/' + cast.id + '/'); 
        }
    });
}

function activate_favorite_button(type, id, url) {
    $('#favorite-' + type + '_' + id).click(function() {
        if ( TRAVELER_USER ) {
            var _this = $(this);
            var data = null;

            var val = parseInt($('#favorite-count-' + type + '_' + id).html());

            // unfavorite
            if ( !_this.hasClass('favorited') ) {
                data = {'favorite' : true}
                val++;
            }
            else {
                data = {'favorite' : false}
                val--;
            }

            $('#favorite-count-' + type + '_' + id).html(val);

            _this.toggleClass('favorited');

            $.ajax({
                url: url, 
                data: data,
                contentType: 'application/json; charset=utf-8',
                type: 'POST',
                success: function(result) { 
                }
            });
        }
        else {
            prompt_login();
        }

        return false;
    });
}

function check_extension(filename, valid_extensions) {
    var ext = filename.split('.').pop().toLowerCase();;
    for ( i in valid_extensions ) {
        if ( valid_extensions[i] == ext ) {
            return true;
        }
    }
    return false;
}

function create_uploader(container, content_type, url, callback) {
    var file_list = container + '-list';
    var chooser = container + '-chooser';

    var filters = {};
    var max_file_size = '';
    var extensions = '';

    if ( content_type == 'videomedia' ) {
        filters = { 
            title: 'Video file', 
            extensions: '3gp,mp4,mov,mpg,mpeg',
        }
        max_file_size = MAX_VIDEO_SIZE;
    }
    else if ( content_type == 'imagemedia' ) {
        filters = { 
            title: 'Photo file', 
            extensions: 'jpg,jpeg,png' 
        }
        max_file_size = MAX_PHOTO_SIZE;
    }

    var extensions_arr = filters['extensions'].split(',');

    var uploader = new plupload.Uploader({
        runtimes : 'html5,flash',
        browse_button : chooser,
        container : container,
        max_file_size : max_file_size,
        url : url,
        filters : [
            filters
        ],

        // Flash settings
        urlstream_upload: true,
        flash_swf_url : MEDIA_URL + 'js/plupload/plupload.flash.swf',
    });

    var upload_info = $('#' + uploader.settings.container).parent().find('.upload-info');

    uploader.bind('Init', function(up, params) {
    });

    uploader.bind('FilesAdded', function(up, files) {
        $('#' + file_list).html('');

        $.each(files, function(i, file) {
            if ( check_extension(file.name, extensions_arr) ) {
                var html = '';
                html += '<h6 id="' + file.id + '" class="upload-file">';
                html += file.name + ' (' + plupload.formatSize(file.size) + ')';
                html += '<div class="upload-progress"></div>';
                html += '</h6>';

                $('#' + file_list).append(html); 
                upload_info.removeClass('hidden');

            }
            else {
                $('#' + file_list).append('<h6 class="upload-file">' + 
                    gettext('Invalid file type!') + '</h6>');
                up.removeFile(file);
                upload_info.addClass('hidden');
            }
        });

        // only 1 file allowed
        if (up.files.length > 0) { 
            up.removeFile(up.files[0]);
        }

        up.refresh();
    });

    var uploading_txt = gettext('Uploading: ');

    uploader.bind('UploadProgress', function(up, file) {
        $('#' + file.id + ' .upload-progress').html(uploading_txt + file.percent + '%');
    });

    uploader.bind('FileUploaded', function(up, file) {
        $('#' + file.id + ' .upload-progress').html(uploading_txt + gettext('Done!'));
        if ( callback ) { 
            callback(); 
        }
    });

    uploader.bind('Error', function(up, error) {
        var msg = error.message;
        if ( error.code == -600 ) {
            //file size error
            msg = gettext('File too large.');
        }
        if ( error.code == -601 ) {
            //file type error, this is checked before hand
            msg = '';
        }
        upload_info.addClass('hidden');
        $('#' + file_list).append('<h6 class="upload-file">' + msg + '</h6>');
    });

    uploader.init();
    return uploader;
}

function activate_upload_form(form_id, url, uploader) {
    $('#' + form_id).submit(function(event) { 
        var obj = $('#' + form_id).serializeObject();
        var data = JSON.stringify(obj, null, 2);

        $.ajax({
            url: url,
            data: data,
            type: 'POST',
            success: function(media) { 
                uploader.settings.url = url + media.id + '/'
                uploader.start();
                $('#' + form_id)[0].reset();
            }
        });

        // prevent default form handling
        event.returnValue = false;
        return false;
    });
}

function make_p (t){
    //check if text already has <p> tags
    if($('p', t).length == 0) {
        var raw_t = $(t).text();
        var new_t = p(raw_t); 
        $(t).html(new_t);
    } else { 
        return;
    }
}
