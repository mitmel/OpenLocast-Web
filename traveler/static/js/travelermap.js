// allow styling of the zoombar
function fix_openlayers_zoombar() {
    $('#map-controls').children().each(function(index) {
        var id = $(this).attr('id');
        var classname = id.substring(id.lastIndexOf('_')+1, id.length);
        if ( classname == '4' ) {

            // horrible hack. openlayers, you crazy sometime.
            if (id.indexOf('ZoombarOpenLayers') == -1 ) {
                $(this).addClass('map-controls-slider');
            }
            else {
                $(this).addClass('map-controls-zoombar');
            }
        }
        else {
            classname = 'map-controls-' + classname;
            $(this).addClass(classname);
        }
    });
}

function highlightCollection(it_id) {
    var vector = main_map.collectionLayer.getFeatureByFid(it_id);
    if ( vector ) {
        main_map.highlightCtrl.highlight(vector);
    }
}

// override default popup behavior
OpenLayers.Popup.FramedCloud.prototype.fixedRelativePosition = true;
OpenLayers.Popup.FramedCloud.prototype.relativePosition = 'br';

Map = function(defaults) {

var self = this;

self.map = null;
self.projection = new OpenLayers.Projection('EPSG:900913');
self.displayProjection = new OpenLayers.Projection('EPSG:4326');

self.gterrainLayer = null;
self.gstreetLayer = null;

self.castLayer = null;
self.collectionLayer = null;

self.boundaryLayer = null;

self.highlightCtrl = null;

self.defaults = defaults;

self.geojson_format = new OpenLayers.Format.GeoJSON({ 
    internalProjection: self.projection, 
    externalProjection: self.displayProjection
});

// Turn on the map
self.init = function(div) {
    OpenLayers.Util.onImageLoadErrorColor = "transparent";
  
    var zoombar = new OpenLayers.Control.PanZoomBar(
        {'div': OpenLayers.Util.getElement('map-controls')}
    );

    var ol_options = {
        controls: [
            zoombar, 
            new OpenLayers.Control.Navigation()
        ],
        projection: self.projection,
        displayProjection: self.displayProjection,
        units: 'm',
        maxResolution: 156543.0339,
        maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34),
        panDuration: 20
    };

    self.map = new OpenLayers.Map(div, ol_options);

    // STYLE
    // cast
    strategy = new OpenLayers.Strategy.Cluster();
    strategy.distance = CLUSTER_DISTANCE;
    strategy.threshold = CLUSTER_THRESHOLD;
    
    var cast_style = new OpenLayers.Style(CAST_STYLE, {context : CAST_CONTEXT });
    var cast_hover_style = new OpenLayers.Style(CAST_HOVER_STYLE, {context : CAST_HOVER_CONTEXT});
    
    var cast_stylemap = new OpenLayers.StyleMap({
        'default' : cast_style,
        'select' : cast_hover_style,
        'hover' : cast_hover_style,
    });

    // collection 
    var coll_style = new OpenLayers.Style(COLLECTION_STYLE, {context: COLLECTION_CONTEXT});
    var coll_select_style = new OpenLayers.Style(COLLECTION_HOVER_STYLE);
    var coll_hover_style = new OpenLayers.Style(COLLECTION_HOVER_STYLE);

    var coll_stylemap = new OpenLayers.StyleMap({
        'default' : coll_style,
        'select' : coll_select_style,
        'hover' : coll_hover_style
    });

    // LAYERS
    var map_center = defaults['center'];
    var image_bounds = new OpenLayers.Bounds();
    image_bounds.extend(new OpenLayers.LonLat(-map_center[0], -map_center[1]));
    image_bounds.extend(new OpenLayers.LonLat(map_center[0], map_center[1]));

    self.baseLayer = new OpenLayers.Layer.OSM(
        "Open Street Map", 
        "", 
        {zoomOffset: 8, resolutions: [611.496226171875, 305.7481130859375, 152.87405654296876, 76.43702827148438, 38.21851413574219, 19.109257067871095, 9.554628533935547, 4.777314266967774, 2.388657133483887,1.1943285667419434, 0.597164283]
    });
    
    self.addCastPoint = null;

    // The layer for the "add cast" functionality
    // e.g. When you can click on the map to set the location
    self.addCastLayer = new OpenLayers.Layer.Vector('Add Cast', { 
        styleMap: cast_stylemap,
        isBaseLayer: false,
    });

    self.addCastLayer.events.on({
        'featureadded' : function(evt) {
            if (self.addCastPoint) {
                self.addCastPoint.destroy();
            }
            var feature = evt.feature;
            self.addCastPoint = feature;
            var ll = new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y);
        }
    });
    
    // "Hidden" style, for when a cast is Open
    self.openCastLayer= new OpenLayers.Layer.Vector('Open Cast', {
        styleMap: new OpenLayers.StyleMap({
            pointRadius: 5,
            strokeOpacity: 0.0,
            fillOpacity: 0.0,
            strokeColor: '#000000'
        }),
        isBaseLayer: false
    });

    self.castLayer = new OpenLayers.Layer.Vector('Casts', {
        styleMap: cast_stylemap,
        strategies: [strategy],
        isBaseLayer: false,
        rendererOptions: {yOrdering: true}
    });

    self.collectionLayer = new OpenLayers.Layer.Vector('Collections', {
        styleMap: coll_stylemap,
        isBaseLayer: false
    });

    self.boundaryLayer = new OpenLayers.Layer.Vector('Boundary', {
        styleMap: new OpenLayers.StyleMap(BOUNDARY_STYLE),   
        isBaseLayer: false 
    });

    // CONTROLS
    self.addCastControl = new OpenLayers.Control.DrawFeature(self.addCastLayer, OpenLayers.Handler.Point);

    self.map.events.register('mousemove', self.map, function (e) {
        var offsetY = 10;
        var offsetX = 10;
        //console.log(e.pageY);
        $('#tooltip').css('top', e.pageY + offsetY).css('left', e.pageX + offsetX);
    });

    // Create a tooltip when hovering over casts and clusters
    var highlight_control = {
        hover: true,
        highlightOnly: true,
        renderIntent: 'hover',
        eventListeners: {
            beforefeaturehighlighted: function (evt) {
            },

            featurehighlighted: function(evt) {
                var html = '';
            
                // Hovering on a cluster
                if ( evt.feature.cluster ) {
                    var features = evt.feature.cluster;
                    var num_features = features.length;
                   
                     if (num_features > 6){
                        var short_features = features.slice(0,5);

                        // create a fake placeholder feature to render the 
                        // "more casts" box
                        
                        short_features[5] = { 'attributes' : {
                            'placeholder' : true,
                            'num_left' : num_features - 5,
                        }};
                        
                        html = render_to_string('castClusterPopup.js.html', {
                            'features' : short_features,
                        });
                    }
                    else {
                        html = render_to_string('castClusterPopup.js.html', {
                            'features': features });
                    }
                }

                // Hovering on a single cast
                else {
                    html = render_to_string('castPopup.js.html', {
                        'feature': evt.feature.data
                    });
                }

                $('#tooltip').show();
                $('#tooltip').html(html);
            },

            featureunhighlighted: function(evt) {
                if (evt.feature.layer.name == 'Collections') {
                    if ( COLL_ID_FILTER ) {
                        highlightCollection( COLL_ID_FILTER );
                    }
                }

                $('#tooltip').html('');
                $('#tooltip').hide();
            }
        }
    }

    self.highlightCtrl = new OpenLayers.Control.SelectFeature(
        [self.castLayer, self.collectionLayer],
        highlight_control
    );

    self.selectCast = new OpenLayers.Control.SelectFeature(self.castLayer, { 
          clickout: true,
          onSelect: function(feature){

            self.clearPopups();

            // If it's a cluster, add a pop up to the map with all of the features
            if ( feature.cluster ) {
                var features = feature.cluster;
                 
                var num_features = features.length;
                if (num_features > 6){ 
                    var scrolling = true;
                }
                else{
                    var scrolling = false;
               }
                
                var html = render_to_string('castClusterPopup.js.html', {
                    'features': features,
                    'scrolling': scrolling  
                });

                var lonlat = feature.geometry.getBounds().getCenterLonLat();
                var popup = new OpenLayers.Popup.FramedCloud('cast_cluster', 
                    lonlat, null, html, null, true, self.clearPopups);

                self.map.addPopup(popup);
            }

            else {
                //open cast on click if it is a single cast
                var cast = feature.attributes;
                frontpage_app.setLocation('#!cast/'+cast.id+'/');
            }
        }, 
        onUnselect: function(feature){
            self.clearPopups();
        }
    });

    self.selectCollection = new OpenLayers.Control.SelectFeature(self.collectionLayer, {
        onSelect: function(feature, evt){
        }, 
        onUnselect: function(e){
        }
    });

    self.map.addLayers([self.baseLayer]);
    self.map.setBaseLayer(self.baseLayer);

    self.map.addLayers([self.collectionLayer, self.castLayer, self.boundaryLayer, self.addCastLayer, self.openCastLayer]);

    self.map.addControls([self.addCastControl, self.highlightCtrl, self.selectCast, self.selectCollection]);

    self.highlightCtrl.activate();
    self.selectCast.activate();
    self.selectCollection.activate();
   
    var map_center = defaults['center'];
    self.setCenter(map_center[0], map_center[1]);
    self.map.zoomTo(defaults['zoom']);

    fix_openlayers_zoombar();

    // Draw the boundary
    if ( MAP_BOUNDARY ) {
        var boundary = self.geojson_format.read(MAP_BOUNDARY);
        self.boundaryLayer.addFeatures(boundary);
    }
}
// END INIT

self.castFeatures = null;

self.collectionFeatures = null;

self.reloadFeatures = function(data) {
    self.castFeatures = self.geojson_format.read(data['casts']);
    self.collectionFeatures = self.geojson_format.read(data['collections']);
    self.renderFeatures();
}

self.addCastFeature = function(data) {
    fc = {'type': 'FeatureCollection', 'features': [data]}
    var cast = self.geojson_format.read(data); 
    self.castFeatures.push(cast[0]);
    self.renderFeatures();
}

self.renderFeatures = function(features) {
    main_map.clearFeatures();
    self.castLayer.addFeatures(self.castFeatures);
    self.collectionLayer.addFeatures(self.collectionFeatures);
}

self.clearFeatures = function() {
    self.clearCasts();
    self.clearCollections();
}

self.clearCasts = function() {
    self.castLayer.removeFeatures(self.castLayer.features);
}

self.clearCollections = function() {
    self.collectionLayer.removeFeatures(self.collectionLayer.features);
}

self.clearPopups = function() {
    for (i in self.map.popups){
        self.map.popups[i].destroy();
    };
    $('#tooltip').hide();
}

self.setCenter = function(x, y) {
    var center = self.get_proj_ll(x,y);
    self.map.setCenter(center);
}

self.getCenter = function() {
    var center = self.map.center.clone();
    center.transform(self.projection, self.displayProjection);
    return [center.lon, center.lat];
}

self.panTo = function(x, y) {
    var ll = self.get_proj_ll(x,y);
    self.map.panTo(ll);
}

// Helpers
self.getBounds = function(str) { 
    var bounds = self.map.calculateBounds();
    bounds.transform(self.projection, self.displayProjection);

    if ( str ) {
        var str = '';
        str += bounds.left + ',';
        str += bounds.bottom + ',';
        str += bounds.right + ',';
        str += bounds.top;  
        return str;
    }
    else {
        return bounds;
    }
}

self.get_ll = function(x, y) {
    return new OpenLayers.LonLat(x,y);
}

self.get_disp_ll = function(x, y) {
    var ll = self.get_ll(x, y);
    ll.transform(self.projection, self.displayProjection);

    return ll;
}

self.get_proj_ll = function(x, y) {
    var ll = self.get_ll(x, y);
    ll.transform(self.displayProjection, self.projection);

    return ll;
} 
} // End map class

