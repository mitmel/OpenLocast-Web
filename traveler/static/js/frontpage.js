var main_map = null;

var locast = locast || {};

/********/
/* INIT */
/********/

$(function() {
    // map
    setup_map();
    collection_list_refresh();
    //map_refresh();

    // dhtml
    activateDHTML();
    //fix_openlayers_zoombar();

    // from frontpage_views.js
    frontpage_app.run(); 

    //check chrome frame
    CFInstall.check({ 
        mode:'overlay'
    });

    // If no URL is specified, redirect to home
    if (location.hash == '') { frontpage_app.setLocation('#!/home/'); }
});


/***************
 * LAYOUT      *
 ***************/

function calculate_cast_layout(container){

    // if description is absolutely positioned assume description-emphasis layout
    var des_pos = $('.cast-description', container).css('position');
    if(des_pos == 'absolute'){
        var desc_height = $('.cast-description', container).outerHeight();
        console.log(desc_height);
        $('.cast-content', container).css('margin-top', desc_height);
        $('#cast-description-edit-button').bind('click', function(){
            calculate_cast_layout(container);
            $('#cast-description-edit-button').unbind('click');
        })
    }
}


/***************
 * INTERACTION *
 ***************/

function activateDHTML(){

    activate_search_bar();

    // tooltip
    $('#main-map').tooltip({
        track: true,
        delay: 0,
        showURL: false, 
        bodyHandler:function() {
            return '<br />';
        }
    });

    // map reset button
    $('#map-reset').click(function() {
        reset_map();
    });

   
    $('#add-cast-button').add('#add-cast-to-collection').click(function() {
        if (!TRAVELER_USER) {
            prompt_login();
        }
        else {
            activate_cast_add();
        }
        
        return false;
    });

    // activate login button at top
    $('#login-link').click(function() {
        //add chrome layer and login to visible elems
        add_visible_elems(['chrome'],['login']);
        return false;
    });

    $('#login-container-close').click(function() {
        //remove chrome layer and login from visible elems         
        remove_visible_elems(['chrome'],['login']);        
        return false;
    });

    // Flowplayer overlay interactions
    $('#flowplayer-close').click(function() {
        $('#flowplayer-container').addClass('hidden');
        $('#flowplayer-player').html('');
        return false;
    });

    // Collection and user box draggable
    $('#cast-add_container').add('#change-location_container').draggable({containment:'#main-map'});

    // Collection and user box draggable
    $('#edit-profile_container').draggable({containment:'#main-map'});

    $('#edit-profile-link').click(function() {
        $('#edit-profile_container').fadeIn();
        $('#edit-profile-close').click(function() {
            $('#edit-profile_container').fadeOut();
            return false;
        }); 
        return false;
    });

    // orderby switchers
    $('#cast-list-sort a').click(function() {
        $(this).siblings('.selected').removeClass('selected');
        $(this).addClass('selected');


        //collection_cast_list_refresh();
    });

    // layer switcher

    $('#layer-switcher .btn').click(function(){
        //if switcher is active
        if( $('#layer-switcher').hasClass('inactive') == false){
            $('#layer-switcher .btn').removeClass('active');
            $(this).addClass('active');
            set_visible_elems();
        }
    });


   //browsebox
   
  $('#map-title_container').mouseenter(
        function() {
            $('#browsebox-container').addClass('active'); 
            browsebox_list_refresh();
        }
    ).mouseleave(
        function() { 
            $('#browsebox-container').removeClass('active'); 
        }
   );
   
   $('#map-title_container').click(function() {
         $('#browsebox-container').toggleClass('active'); 
            if( $('#browsebox-container').hasClass('active')){
                browsebox_list_refresh();
            }

     }); 

   //logo click
   
   $('#project-logo').click(function(){

        //show cast view when logo is clicked
        if( $('#layer-switch_media').hasClass('active') == false){
            $('#layer-switcher .btn').removeClass('active');
            $('#layer-switch_map').addClass('active');

            set_visible_elems();
        }

   });
}    

/***************
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


/*******
 * MAP *
 *******/

function setup_map() {
    locast.main_map = locast.map('main-map', MAP_DEFAULTS);
    map_refresh();
}

function reset_map() {
    var center = MAP_DEFAULTS['center'];
    //main_map.setCenter(center[0], center[1]);
    //main_map.map.zoomTo(MAP_DEFAULTS['zoom']);
}

CAST_FADE_IN = false;
function on_map_move() {
    if ( CAST_FADE_IN ) {
        // see: frontpage_views.cast_single_view
        cast_fade_in();
        CAST_FADE_IN = false;
    }
}

function map_refresh() {
    var query = get_cast_filter_query();
    $('#map-loader').addClass('active');
    $.ajax({
        async: true,
        cache: false,
        url: FEATURES_API_URL + query,
        success: map_refresh_cb
    })
}

function map_refresh_cb(data) {
    locast.main_map.renderCasts(data.casts);
    $('#map-loader').removeClass('active');
}


/*********
 * LISTS * 
 *********/

function browsebox_list_refresh() {
    $.ajax({
        url:  BASE_URL + '/api/collection/', 
        success: function(data){
             var html = _.template($('#browsebox-list-templ').html(), {collections: data});
            $('#browsebox-collection-list').html(html);
        }
    });
}


//load list of collections

function collection_list_refresh() {
    $.ajax({
        url:  BASE_URL + '/api/collection/', 
        success: collection_list_cb
    });
}

//render list of collections and get preview of related casts

function collection_list_cb(data) { 
    var html = _.template($('#collection-list-templ').html(), {collections: data});
    $('#collection-list').html(html); 
    _.each(data, function(collection){
            collection_preview_list(collection, '#collection-list-preview_', 10);
    });
}

function collection_preview_list(collection, container, preview_num){
    var preview_cast_num = preview_num; 
    var collection_preview_query = '?collection='+collection.id+'&page='+1+'&pagesize='+preview_cast_num+'&orderby=-created';   
            $.ajax({
                url: CAST_API_URL+collection_preview_query,
                cache: false,
                success: function(data){
                    var html = _.template($('#collection-preview-templ').html(),{casts:data});
                    $(container+collection.id).hide();
                    $(container+collection.id).html(html).fadeIn();
                }       
        })  
}


/* 
 * CAST LISTS
 * for showing lists of casts in tag, collection and user views
 *
 * expects following elements in markup with ids: 
 * 
 * #LISTCONTAINERID
 *  + -indicator
 *  + -sort
 *      + <a> + -sort_ORDERBYARGUMENT
 */

function list_casts(list_container, pagesize, page) {
  
    //initialize list
    if ( !page ) { 
        page = 1;
        $('#'+list_container).data('current-page', page);
        $('#'+list_container).data('requests', []);
        $('#'+list_container).data('rendered_html', []);
    }
    if( !pagesize ){ pagesize = 10; }
    $('#'+list_container).data('pagesize', pagesize);
    if(page == 1){
        //clear any previous event listeners
        $('#'+list_container+'-sort a').unbind('click');

        //bind a new one with this list's settings
        $('#'+list_container+'-sort a').click(function(){
             $(this).siblings('.selected').removeClass('selected');
             $(this).addClass('selected');
             list_casts(list_container, pagesize); 
        });
    }

    var query = get_cast_filter_query();
    var orderby = $('.selected', '#'+list_container+'-sort').attr('id').split('_')[1];
    if ( query ) { query += '&'; }
    query += 'page=' + page + '&pagesize=' + pagesize + '&orderby=' + orderby;

    //show loader
    $('#'+list_container+'-loader').addClass('active');
  
    //previous requests
    var requests = $('#'+list_container).data('requests');

    // append new request
    requests.push( $.ajax({
        url: CAST_API_URL + query,
        cache: false,
        success: function(data, code, resp) {
            var page = resp.getResponseHeader('X-Page-Number');
            var total = Math.ceil(resp.getResponseHeader('X-Object-Total')/pagesize); 
            var current_page = $('#'+list_container).data('current-page');
            
            //update total page value
            $('#'+list_container).data('total-pages', total);

            //render html and save with page as index (will use to order async response html)
            var html = _.template($('#cast-list-templ').html(), {casts: data});
            var rendered_html = $('#'+list_container).data('rendered_html');
            rendered_html[page]= html ;

            $('#'+list_container).data('rendered_html', rendered_html);
        }
    }));
 
    render_casts(list_container);
}

var throttled_render_casts = _.throttle(render_casts, 800);

function render_casts(list_container){

    var requests = $('#'+list_container).data('requests');

    //use jquery deferred method to render cast list when queued ajax requests finish
    $.when.apply($, requests).done(function(data){
        
        //check total pages
        var total_pages =  $('#'+list_container).data('total-pages');

        //concatenate rendered html in correct page order
        var rendered_html = $('#'+list_container).data('rendered_html');
        
        var html = '';
        for(var i=1; i <= total_pages; i++){
                var this_html = rendered_html[i];
                if(this_html != undefined){
                    html +=rendered_html[i];
                }
        }

        //reset rendered html storage
        $('#'+list_container).data('rendered_html', []); 

        //render list
        list_casts_cb(list_container, html); 
    });
}

function list_casts_cb(list_container, html) { 
    var page = $('#'+list_container).data('current-page');
    var total = $('#'+list_container).data('total-pages');
    var pagesize = $('#'+list_container).data('pagesize');

    //unbind infinite scrolling listener immeadiately
    if(page == total){
         $(window).unbind('scroll');
    } 

    //load first page and bind infinite scroll
    if(page == 1){   
        $('#'+list_container).html(html);

        //add scroll indicator
        var indicator = _.template($('#scroll-indicator-templ').html(), { pages: total, page:page});
        $('#'+list_container+'-indicator').html(indicator);

        //bind event listener to window scroll for infinite scrolling
        $(window).bind('scroll', function(){
            var scroll_position = $(this).scrollTop() + $(this).innerHeight();
            var scroll_height = $('#'+list_container).closest('.layer-container')[0].scrollHeight;
            var from_bottom = $(window).height()*.5;

            //console.log('scroll position:'+ scroll_position + '  height: ' + scroll_height);
            
            if(scroll_position >= (scroll_height - from_bottom)){
               throttled_next_cast_list_page(list_container); 
            } 
        });
    }
    
    //append HTML if not the first or last page
    if(page > 1 && page < total){
        $('#'+list_container).append(html);
    }

    //last page
    if(page == total){
        if(page != 1){
            $('#'+list_container).append(html);
        }
    }

    //if loaded page of casts is not tall enough to enable scrolling then load the next page
    if($('#'+list_container).closest('.layer-container')[0].scrollHeight <= $(window).height() && page < total){
        next_cast_list_page(list_container) 
    }

    //hide loader
    $('#'+list_container+'-loader').removeClass('active');
}

var throttled_next_cast_list_page = _.throttle(next_cast_list_page, 200);

function next_cast_list_page(list_container){
    var pagesize = $('#'+list_container).data('pagesize');
    var total = $('#'+list_container).data('total-pages');

    //increment page counter
    var this_page = $('#'+list_container).data('current-page');                
    var next_page = this_page + 1;
    $('#'+list_container).data('current-page', next_page);
    
    //update scroll indicator
    var page_index = next_page - 1; 
    $('#'+list_container+'-indicator .page').removeClass('active');
    $('#'+list_container+'-indicator .page:eq(' + page_index + ')').addClass('active');
    
    //get the next page
    list_casts(list_container, pagesize, next_page);
    
    if(next_page == total){
        //unbind infinite scroll listener 
        $(window).unbind('scroll');
    }
}


/****************
 * CAST EDITING *
 ****************/


function cast_comment_refresh(cast_id) {
    // refresh the comments
    $.ajax({
        url: CAST_API_URL + cast_id + '/comments/', 
        type: 'GET',
        success: function(data) { 

            var context = '#comments-cast_' + cast_id;

            var html = _.template($('#cast-comments-templ').html(), {comments:data});
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

// This is a separate function in order to allow editing / comment posting
// to refresh the "window"

function cast_info_refresh(cast_id, callback) {
$.ajax({ url: CAST_API_URL + cast_id + '.html/', dataType: 'html', success: function(cast_html) {
    var cast_url = CAST_API_URL + cast_id + '/';
    var media_url = cast_url + 'media/';
    var context = '#open-cast_' + cast_id;


    // refresh the html
    $('#'+cast_container_id).html(cast_html);

    // apply dimension calculations for layouts (delay to account for DOM reload)
    var lazy_cast_layout = _.debounce(calculate_cast_layout, 800);
    lazy_cast_layout('#'+cast_container_id);

    $('.login-button', '#'+cast_container_id).click(function(){ 
           prompt_login(); 
    });

    //add class based on number of media
    var media_count = $('.media','#'+cast_container_id).length;
    $('.media-list','#'+cast_container_id).addClass("mediacount_" + media_count);

    //get previews of linked collections 
    $('.collection-id', '#collections-cast_'+cast_id).each(function(){
        var collection_id = $(this).text();
        $.ajax({
            url: COLLECTION_API_URL + collection_id + "/",
            success: function(data){
                collection_preview_list(data, '#collection-cast-preview_', 8);
            }       
        });
    });


    // refresh the comments.
    cast_comment_refresh(cast_id);

    // Urlize the description urls
    //var desc = $('p', '#description-cast_' + cast_id);
    //desc.urlize('');

    // make dates pretty
    format_date($('.cast-date', context), true);

    activate_favorite_button('cast', cast_id, cast_url + 'favorite/');

    // activate edit toggle button
    $('#edit-activate_'+cast_id).click(function(){
       
        $('#edit-activate_'+cast_id).toggleClass('active'); 
        $('.cast-media, #open-cast_'+cast_id ,'#'+cast_container_id).toggleClass('edit');
        $('.media-list','#'+cast_container_id).toggleClass('offset1');
        $('.media-list','#'+cast_container_id).toggleClass('offset2');
    
    
    })

    // activate flag button
    if ( TRAVELER_USER ) {
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
        var delete_prompt = $(".cast-alerts");
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

    /*$('.cast-info .edit-toggle', '#open-cast_' + cast_id).click(function (){
        $('.cast-title',   '#open-cast_' + cast_id).fadeOut(0);   
        title_form.fadeIn();
        return false;
    });*/

    $('#cast-title-edit-button', '#open-cast_' + cast_id).click(function(){
        $('.cast-header .title',   '#open-cast_' + cast_id).add('#cast-title-edit-button').fadeOut(0);
        title_form.fadeIn();
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

    $('#cast-description-edit-button', '#open-cast_' + cast_id).click(function (){
        $('#cast-description-edit-button', '#open-cast_' + cast_id).fadeOut(0);
        desc_form.fadeIn();
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
    $('#cast-tags-edit-button', '#open-cast_' + cast_id ).click(function(){
        $(this).fadeOut(0);
        tag_form.fadeIn();
    });  

    $('.delete-tag', '#tag-list-cast_' + cast_id).click(function() {
        $(this).parent().remove();
        update_tags();
    });

    // activate location updating
    $('#change-location-cast_' + cast_id).click(function() {
 
        //change layer switcher control to select map
        $('#layer-switcher .btn').removeClass('active');
        $('#layer-switch_map').addClass('active');

        set_visible_elems(['map'],['change-location']);

        //main_map.addCastControl.activate();
        locast.main_map.addCastPoint();

        var html = _.template($('#cast-change-location-templ').html(), {cast_id: cast_id}); 

        $('#change-location_container').html(html);       

        // Click cancel
        $('#change-location-cancel-cast_' + cast_id).click(function() {
            main_map.addCastControl.deactivate();
            
            if ( main_map.addCastPoint ) {
                main_map.addCastPoint.destroy();	
                main_map.addCastPoint = null;
            }
            
            set_visible_elems(['media','map'],['cast'],true);

        });

        // Click save new location
        $('#change-location-finish-cast_' + cast_id).click(function() {
             if (locast.main_map.getCastPoint()) {
    
                var ll = locast.main_map.getCastPoint();
                
                $('#change-location_container').fadeOut();

                var data = JSON.stringify({'location': [ll.lng, ll.lat]}, null, 2);

                frontpage_app.setLocation('#!');

                $.ajax({
                    url: cast_url,
                    data: data,
                    type: 'PUT',
                    success: function(cast) {
                        if (locast.main_map.getCastPoint() ) {
                            locast.main_map.destroyCastPoint();
                            $('#change-location_container').html('');
                            map_refresh();
                        }
                        frontpage_app.setLocation('#!/cast/' + cast.id + '/');
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
        //$('#flowplayer-container').removeClass('hidden');

        add_visible_elems([],['flowplayer']);

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
       
        var media_preview = $(this).siblings('a').clone(); 
        $('.media-preview', delete_prompt).html(media_preview);
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
    $('#add-media-button-cast_' + cast_id).add('#add-media-menu-button-cast_' + cast_id).click(function() {
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

        // link adding interaction

        $('#link-video-cast_' + cast_id).click(function(){
                $(this).add('.locast-upload-box').hide();
                $(this).parent().find('.upload-info').removeClass('hidden');
        });

    });

    // CALLBACK
    if ( callback ) {
        callback(cast_id, cast_html);
    }
}});
}

/***********
 * HELPERS *
 ***********/

/* SEARCH BAR */

function activate_search_bar() {
    var default_val = gettext('search');
    var search_input = $('#search-input');
    var search_results = $('#search-results');    
   
    // keep track if search is active
    var search_active = false;

    search_input.val(default_val);

    var reset_search = function(){
        search_input.val(default_val);
        search_active = false;
        hide_search(); 
    };
   
    //fade out results when they lose focus
    search_results.attr('tabindex', -1).focusout( function(e){ 
        hide_search();
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
 
    //set timeout to reset search when it loses focus
    search_input.focusout(function(e){ 
        var reset = setTimeout(reset_search, 300);
        $(search_input).data('timer', reset);

        //clear the timeout if the search results have focus
        search_results.focusin(function(){
            clearTimeout($(search_input).data('timer'));
            search_results.unbind('focusin'); 
            
            //reset search on loss of focus
            search_results.focusout(function(){
                reset_search();
                search_results.unbind('focusout');
            });

            //reset search on clicking child
            search_results.children().click(function(){
                reset_search();
                search_results.children().unbind('click');
            });
        });
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

        var wait = setTimeout(do_search, 100);
        $(search_input).data('timer', wait);
    });
}

//reveal search
function show_search(){
    $('#search-results').addClass('active');
    $('#search-results-overlay').fadeIn();

    //make sure only the search results are scrollable
    $('body').css('overflow','hidden');
}

//hide search
function hide_search(){
    $('#search-results').removeClass('active');
    $('#search-results-overlay').fadeOut();
    $('body').css('overflow','auto');
}

var last_search = '';

function universal_search(keyword) {

    //remove space at beginning and end of keyword
    keyword = jQuery.trim(keyword);

    if ( keyword.length && !(keyword == last_search) ) {
        last_search = keyword;
        $.ajax({
            url: SEARCH_API_URL,
            data: {q:keyword},
            type: 'GET',
            success: function(data) { 
                var html = _.template($('#search-results-templ').html(), {results:data});
                $('#search-results').html(html);
                show_search();

                //search close button 
                $('#close-search-results').click(function(){
                    hide_search(); 
                })
            }
        });
    }
}

/* CAST ADD */

function activate_cast_add() {
    var cast_add_container = $('#cast-add_container');
    var cast_add_html = _.template($('#cast-add-form-templ').html());
    cast_add_container.html(cast_add_html);

    //change layer switcher control to select map
    $('#layer-switcher .btn').removeClass('active');
    $('#layer-switch_map').addClass('active');
 

    //add cast add form container to active containers
    add_visible_elems(undefined, ['cast-add'], true);
    //make map layer visible    
    set_visible_elems(['map'], undefined);

    //disable map title cast add    
    $('#add-cast-button').addClass('inactive'); 


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

    //main_map.addCastControl.activate();
    
    locast.main_map.addCastPoint();

    return false;
}

function cast_add_form_clear() {
    var cast_add_container = $('#cast-add_container');
    cast_add_container.fadeOut();

    locast.main_map.destroyCastPoint();

    //main_map.addCastControl.deactivate();
    /*if ( main_map.addCastPoint ) {
        main_map.addCastPoint.destroy();
        main_map.addCastPoint = null;
    }*/
    cast_add_container.html('');
    
    //enable map title cast add    
    $('#add-cast-button').removeClass('inactive'); 

    remove_visible_elems(undefined, ['cast-add'], true);
    set_visible_elems();

}

function cast_add_form_submit(e) {
    
    if (locast.main_map.getCastPoint()) {
        
        var obj = $('#cast-add-form').serializeObject();
        var ll = locast.main_map.getCastPoint();
        obj['location'] = [ll.lng, ll.lat];

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
            success: function(cast) { 
                cast_add_form_clear();
                map_refresh();
                frontpage_app.setLocation('#!/cast/' + cast.id + '/'); 
            }
        });
    }

    else {
        $('#cast-add-error').text(gettext('Click the Map to Select a Location for Your Cast')).fadeIn();
    }

    // prevent default form handling
    e.returnValue = false;
    return false;
}

/* FAVORITE */

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

/* MEDIA UPLOADING */

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
        max_file_size = '100mb';
    }
    else if ( content_type == 'imagemedia' ) {
        filters = { 
            title: 'Photo file', 
            extensions: 'jpg,jpeg,png' 
        }
        max_file_size = '8mb';
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
                $('.locast-upload-box, .add-link-form', '.add-media-cast').hide();
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
            msg = gettext('File too large. Max size is: ')+max_file_size;
        }
        if ( error.code == -601 ) {
            //file type error, this is checked before hand
            msg = gettext('Invalid file');
        }
        //upload_info.addClass('hidden');
        $('#' + file_list).append('<h3 class="upload-file text-error">' + msg + '</h3>');
        $('#' + file_list).parent().find('.upload-details').hide();        
        //upload_info.removeClass('hidden');
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

// called when something is done that requires login
function prompt_login() {
    
    //add chrome layer and login to visible elems
    add_visible_elems(['chrome'],['login']);

    //$('#login-container').removeClass('hidden');
    $('#login-alert').fadeIn(300);
    $('#login-alert').delay(2000).fadeOut(300);
}

