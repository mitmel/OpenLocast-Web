var locast = locast || {};


(function(locast, L, _, $){

    locast.Map = function(id, defaults) {
        
        var method = {};

        var _id = id;
        var _map = null;
      
      
        var numberedCluster = function(cluster) {
            var castCount = cluster.getChildCount(); 
            var w = 40;
            var h = 40;    
            var c = 'cast-cluster-';
            if (castCount < 10) {
                c += 'small';
                w = 40;
            } else if (castCount < 100) {
                c += 'medium';
                w = 60;
            } else {
                c += 'large';
                w = 60;
            }
            if(castCount === 1){
                c += ' single-cast';
                w = 40;
            }
            h = w;
            return L.divIcon({
                html: '<div class="title"><span>' + castCount + '</span></div>',
                className: 'cast-cluster ' + c,
                iconSize: L.point(w,h)
            });
        };


        var imageCluster = function(cluster) {
            var markers = cluster.getAllChildMarkers(),
                count = markers.length;
                html = '',
                c = 'image-cluster-',
                w = 60,
                h = 60;

             if (count < 8) {
                c += 'small';
            } else if (count < 100) {
                c += 'medium';
            } else {
                c += 'large';
            }
            if(count === 1){
                c = 'single-image';
                w = 40;
                h = 40;
            }
            _.each(markers, function(el, index) {
                if (index <= 15) {
                    html += _.template($('#cast-image-cluster-templ').html(), {'cast':el.feature.properties});
                } 
                else {
                    return;
                }
            });  
             
            return L.divIcon({
                html: '<div class="clearfix" >' + html + '<div class="title">' + count + '</div></div>',
                className: 'cast-cluster ' + c,
                iconSize: L.point(w,h)
            });
        }
       
        var _castClusterLayer = new L.MarkerClusterGroup(); 
        var _castClusterLayerOptions = {
            singleMarkerMode: true,
            iconCreateFunction: imageCluster      
        }

        var _castLayer = L.geoJson;
        var _castMarkerOptions = {
            icon: L.divIcon()
        }

        var _addPointLayer = L.marker;
        var _addPointOptions = {
            icon: L.divIcon()
        }
                
        var _mapDefaults = {
            center: L.latLng((defaults.center[1] || 42.373851), (defaults.center[0]|| -71.110296)),
            zoom: defaults.zoom || 14,
            zoomControl: false
        }

        var _cloudmadeLayer = L.tileLayer( 'http://{s}.tile.cloudmade.com/{key}/{style}/256/{z}/{x}/{y}.png' ,{
            key: '55be8cc24afc49f4a4f7e8056455582c',
            style: '997',
            attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>' 
        })

        var _init = function () {
            console.log(_id);
            _map = L.map(_id, _mapDefaults);
            L.control.zoom({position: 'bottomright'}).addTo(_map);
            _map.addLayer(_cloudmadeLayer); 
        }

        var _clearLayer = function (layer) {
            if(_map.hasLayer(layer)){
                  _map.removeLayer(layer);
            }
        }

        method.renderCasts = function (data) {
           
            _clearLayer(_castClusterLayer);

            _castLayer = L.geoJson(data, {
               onEachFeature: function (feature, layer) {
                    layer.on('click', function(e) {
                        var url = '#!/cast/' + e.target.feature.properties.id + '/';
                        window.location.href = url;
                     })
                },
                pointToLayer: function (feature, latlng) {
                    return L.marker( latlng, _castMarkerOptions); 
                }       
            });

            _castClusterLayer = new L.MarkerClusterGroup(_castClusterLayerOptions).addLayer(_castLayer).addTo(_map);

        }

        method.redrawBase = function () {
            //hack to make baselayer tiles fade in when unhiding the map
            L.Util.requestAnimFrame(_map.invalidateSize,_map,!1,_map._container);
        }

        method.addCastPoint = function () {
            _map.on('click', function (e) {
                _clearLayer(_addPointLayer);
                _addPointLayer = L.marker(e.latlng, _addPointOptions).addTo(_map);
            });
        }

        method.getCastPoint = function () {
            if(_map.hasLayer(_addPointLayer)) {
               return _addPointLayer.getLatLng();
            }
        }

         method.destroyCastPoint = function () {
            _clearLayer(_addPointLayer);
            _map.off('click');
        }
        
        _init();

        //return public methods 
        return method;
    };

    locast.map = function(id, defaults) {
        return new locast.Map(id, defaults);
    }

}(locast, L, _, $))
