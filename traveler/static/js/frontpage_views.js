/*** CONTROLLER ***/

var frontpage_app = null;
var current_view = null;

$(function() {
frontpage_app = $.sammy('body', function() {
    this.get('#!/cast/:id/', function(context) { activate_view(context, cast_single_view) });
    this.get('#!/collection/:id/', function(context) { activate_view(context, collection_single_view) });
    this.get('#!/user/:id/', function(context) { activate_view(context, user_single_view) });
    this.get('#!/tag/:tag/', function(context) { activate_view(context, tag_view) });

    this.get('#!/home/', function(context) { activate_view(context, home_view) });
    this.get('#!', function(context) { activate_view(context, home_view) });
});
});

function activate_view(context, view) {
    deactivate_current_view();
    current_view = view;

    // In traveler.js 
    update_auth_redirects();
    replace_names();
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


var cast_container_id = 'cast_container';

/*** VIEW RENDERING  ***/

/*
 * Expects HTML markup to be organized by layers:
 *  
 * id=layername_layer class=layer
 *
 * which contain containers:
 *
 * id=containername_container class=layer-container
 *
 * set visibilty in a view using:
 * 
 * set_visible_elems( [arrayoflayernames], [arrayofcontainernames]) 
 *
 * get currently visible layers with
 *
 * get_visible_elems();
 *
 */

//init object to track visible elems

var visible_elems = {};
visible_elems['layers'] = [];
visible_elems['containers'] = [];
    
var set_visible_elems = function(active_layers, active_containers, override_switcher, ignore_switcher){ 
 
    //update visible_elems object
    if(active_layers != undefined){
         visible_elems['layers'] = active_layers;
    }

    if(active_containers != undefined){
        visible_elems['containers'] = active_containers ;
    }

    //respect layer switcher control unless overridden
    if(override_switcher === undefined && ignore_switcher == undefined){
        activate_layer_switcher();
        check_layer_switcher();
    }
    if(override_switcher == true){
        deactivate_layer_switcher();
    }

    //find all layers and containers

    var all_layers = [];
    $('.layer').each(function(){
        this_id = $(this).attr('id').split('_')[0];
        all_layers.push(this_id); 
    });

    var all_containers = [];
     $('.layer-container').each(function(){
        this_id = $(this).attr('id').split('_')[0];
        all_containers.push(this_id); 
    });

    //calculate hidden and visible
   
    var hidden_layers = _.difference(all_layers, visible_elems['layers']);
    var hidden_containers = _.difference(all_containers, visible_elems['containers']);
    var visible_layers = _.intersection(all_layers, visible_elems['layers']);
    var visible_containers = _.intersection(all_containers, visible_elems['containers']);

    //todo: add and remove class from element instead of setting visibility here
    //hide

    _.each(hidden_layers, function(layer){
        $('#'+layer+'_layer').hide();
    });

    _.each(hidden_containers, function(container){
        $('#'+container+'_container').hide();
    });

    //show

    _.each(visible_layers, function(layer){
        $('#'+layer+'_layer').fadeIn();
    });

    _.each(visible_containers, function(container){
        $('#'+container+'_container').fadeIn();
    });

}

//callbacks for specific layers
var onMedia = function(){};
var onMap = function(){};

//checks layer switcher control 
var check_layer_switcher = function(){
    var active_layer = $('#layer-switcher .btn.active').attr('id').split('_')[1];

    //map layer selected
    if(active_layer == 'map'){
        
        //default containers
        //todo: set these using a class in HTML
        visible_elems['containers'].push('map-title');
        visible_elems['containers'].push('map-controls');
            
        //make sure map redraws
        locast.main_map.redrawBase();
        
        onMap();
    }
    
    //media layer selected
    if(active_layer == 'media'){  
        onMedia();   
    }

    //remove all layers referenced in the layer switcher control
    $('#layer-switcher .btn').each(function(){
        visible_elems['layers'] = _.without(visible_elems['layers'], $(this).attr('id').split('_')[1]);
    });

    //add active layer
    visible_elems['layers'].push(active_layer); 
}

var deactivate_layer_switcher = function(){
    $('#layer-switcher').addClass('inactive');
}

var activate_layer_switcher = function(){
     $('#layer-switcher').removeClass('inactive');
}

var get_visible_layers = function(){
    return visible_elems['layers']; 
}

var get_visible_containers = function(){
    return visible_elems['containers']; 
}


var add_visible_elems = function(adding_layers, adding_containers, refresh){
    
    if(adding_layers != undefined){
        visible_elems['layers'].push(adding_layers);
        visible_elems['layers'] =  _.flatten(visible_elems['layers']);
    }

    if(adding_containers != undefined){
        visible_elems['containers'].push(adding_containers);
        visible_elems['containers'] =  _.flatten(visible_elems['containers']);
    }
 
    if(refresh == undefined){
        //refresh element visibility and ignore switcher
        set_visible_elems(undefined, undefined, undefined, true);        
    }
}

var remove_visible_elems = function(removing_layers, removing_containers, refresh){
    
    if(removing_layers != undefined){
       visible_elems['layers'] =  _.difference(visible_elems['layers'], removing_layers);
    }

    if(removing_containers != undefined){
       visible_elems['containers'] =  _.difference(visible_elems['containers'], removing_containers);
    }
   
    if(refresh == undefined){
        //refresh element visibility and ignore switcher
        set_visible_elems(undefined, undefined, undefined, true);
    }
}


/*** VIEWS ***/


/********
 * HOME *
 ********/

var home_view = {
    activate: function(context) {
        clear_cast_filter();
        $('#current-map').html(gettext('All Casts'));        
        set_visible_elems(['media'],['collection-list']);
    },
    deactivate: function() {
    }
}


/********
 * CAST *
 ********/


function cast_loaded(cast_id) {
    set_visible_elems(undefined, ['cast'], true);

    //make sure main map redraws
    locast.main_map.redrawBase();

    //intialize map showing cast location
    var map = locast.map('cast-map', MAP_DEFAULTS);
    map.redrawBase();
    var loc_arr = $('#' + 'location-cast_' + cast_id).html().split(',');
    map.markCast(loc_arr[1], loc_arr[0]);

    // replace cast and collection terms (in traveler.js)
    replace_names();
}

var cast_single_view = {};

cast_single_view['activate'] = function(context) {

    //set visibility and deactivate layer switcher
    set_visible_elems(['media','map'],[], true);
    
    //sometimes the tooltip does not hide -- make sure it does
    $('#tooltip').css('display','none');

    cast_info_refresh(context.params['id'], function(cast_id) {
     
        //check if map layer is visible 
        var map_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'map'})
       
        //don't refresh or move map if map layer is not visible
        if(map_is_visible != undefined){ 
            map_refresh(); 
        }

        cast_loaded(cast_id);

        // set up close button to go back to previous app location
        $('#close-cast_' + cast_id).click(function() {
            
            //change layer switcher control to select map
            $('#layer-switcher .btn').removeClass('active');
            $('#layer-switch_map').addClass('active');

            if (CAST_FILTER['collection']) {
                frontpage_app.setLocation('#!/collection/' + CAST_FILTER['collection'] + '/');
            }
            else if (CAST_FILTER['author']){
                frontpage_app.setLocation('#!/user/' + CAST_FILTER['author'] + '/');
            }
            else if (CAST_FILTER['tag']){
                frontpage_app.setLocation('#!/tag/' + CAST_FILTER['tag'] + '/');
            }
            else {
                frontpage_app.setLocation('#!');
            }
            return false;
        });
        
    });
}

cast_single_view['deactivate'] = function() {
   
    // this clears the invisible feature that was added
    //main_map.openCastLayer.removeAllFeatures();

    //hack to address bug: after panning map on cast open the first user drag will cause all visible baselayer tiles to disappear
    //zoom in and out to cause baselayer to reload tiles
    /*$('#main-map').bind('click', function(){
        main_map.map.zoomOut();
        main_map.map.zoomIn(); 
        $('#main-map').unbind('click');
    })*/

} // end deactivate
 

/**************
 * COLLECTION *
 **************/

var collection_single_view = {}; 

collection_single_view['activate'] = function(context) {
    
    var id = context.params['id'];
   
    context.load(COLLECTION_API_URL + id + '/').then(function(coll) {

        // set filter to only show casts in this collection
        set_cast_filter({'collection' : coll.id});
        set_visible_elems(['media'], ['collection']); 
                 
        //check which layers are visible
        var media_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'media'})
        var map_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'map'})

        //load cast list if visible or queue in view switcher callback  
        if(media_is_visible != undefined){ 
           list_casts('collection-cast-list'); 
        }else{
            onMedia = function(){
                list_casts('collection-cast-list');
                onMedia = function(){};
            }
        }

        //load map if visible or queue in view switcher callback
        if(map_is_visible != undefined){
            map_refresh();
        }
        else{
            onMap = function(){
                map_refresh();
                onMap = function(){};
            }
        }

        //update map title
        $('#current-map').html(coll.title);

        //update collection cast list header
        var collection_html = _.template($('#collection-cast-list-info-templ').html(), {collection:coll});
        $('#collection-info').html(collection_html);
        replace_names();

        // DHTML
        activate_favorite_button('collection', coll.id, COLLECTION_API_URL + coll.id + '/favorite/');
    });  
}

collection_single_view['deactivate'] = function() {
    //unbind infinite scroll event listener
    $(window).unbind('scroll');

    //reset html 
    $('#collection-cast-list').html(''); 
    $('.list-var', '#collection_container').text('');

    //reset viewswitcher callbacks
    onMedia = function(){};    
    onMap = function(){};
}

/********
 * USER *
 ********/

var user_single_view = {

activate : function(context) {
    var user_id = context.params['id'];
    context.load(USER_API_URL + user_id + '/').then(function(user) { 
        //$('#current-map h4').html(gettext('Casts Created by') + ' ' + user.display_name);
        set_cast_filter({'author':user_id});
        set_visible_elems(['media'], ['user']); 
         
        //update user info header
        var user_html = _.template($('#user-info-templ').html(), {user:user});
        $('#user-info').html(user_html);

        //update map title
        $('#current-map').html(gettext('<span class="cast-name-plural">Casts</span> Created by') + ' ' + user.display_name);
        replace_names();

        //check which layers are visible
        var media_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'media'})
        var map_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'map'})
        
        if(media_is_visible != undefined){
            list_casts('user-cast-list'); 
        }
        else{
            onMedia = function(){
                list_casts('user-cast-list');
                onMedia = function(){};
            }
        }

        if(map_is_visible != undefined){
            map_refresh();
        }
        else{
            onMap = function(){
                map_refresh();
                onMap = function(){};
            }
        }

        
    });
    },

    deactivate : function() { 
        //unbind infinite scroll event listener
        $(window).unbind('scroll');

        //reset html 
        $('#user-cast-list').html(''); 
        $('.list-var', '#user_container').text('');

        //reset viewswitcher callbacks
        onMedia = function(){};    
        onMap = function(){};             
                 
    }
}

/*******
 * TAG *
 *******/

tag_view = {
    activate : function(context) {
        set_cast_filter({'tag': context.params['tag']});
        set_visible_elems(['media'], ['tag']);

        //update tag info header
        var tag_html = _.template($('#tag-info-templ').html(), {tag:context.params['tag']});
        $('#tag-info').html(tag_html);

        //update map title
        $('#current-map').html(gettext('<span class="cast-name-plural">Casts</span> Tagged') + ' "' + context.params['tag'] + '" ');
        replace_names();

        //check which layers are visible
        var media_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'media'})
        var map_is_visible = _.find( get_visible_layers() , function(layer){return layer == 'map'})
        
        if(media_is_visible != undefined){
            list_casts('tag-cast-list'); 
        }
        else{
            onMedia = function(){
                list_casts('tag-cast-list');
                onMedia = function(){};
            }
        }

        if(map_is_visible != undefined){
            map_refresh();
        }
        else{
            onMap = function(){
                map_refresh();
                onMap = function(){};
            }
        }
    },
    deactivate : function() { 
        //unbind infinite scroll event listener
        $(window).unbind('scroll');

        //reset html 
        $('#tag-cast-list').html(''); 
        $('.list-var', '#tag_container').text('');

        //reset viewswitcher callbacks
        onMedia = function(){};    
        onMap = function(){};    
    }
}

