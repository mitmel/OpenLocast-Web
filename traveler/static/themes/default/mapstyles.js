var COLLECTION_PATH_COLOR = '#35BED3';

CLUSTER_DISTANCE = 40;
CLUSTER_THRESHOLD = 2;
MAX_CLUSTER_SIZE = 75;

CAST_STYLE = {
    backgroundGraphic: '${getBackground}',
    backgroundGraphicZIndex: 10,
    backgroundHeight:'${getBHeight}',    
    backgroundWidth:'${getBWidth}',
    backgroundXOffset:'${getBXOffset}',
    backgroundYOffset: '${getBYOffset}',
    cursor: 'pointer',
    externalGraphic: '${getIcon}',
    fontSize: '14px',
    fontFamily: 'Arial',
    fontColor: 'white',
    fontWeight: 'bold',
    graphicWidth:'${getWidth}',
    graphicHeight:'${getHeight}',    
    graphicXOffset:'${getXOffset}',    
    graphicYOffset:'${getYOffset}',
    graphicZIndex: 11,
    labelXOffset: 0,
    labelYOffset: 0,
    label: '${getLabel}',
    fontColor: 'white',
}

CAST_HOVER_STYLE = {
    externalGraphic: '${getIcon}',
    backgroundGraphic: '${getBackground}'
}

// Dimensions of the cast icon
CAST_ICON = { 
    width: 25,
    height: 25,
    xOffset: -12,
    yOffset: -12,
    bWidth:35,
    bHeight: 21,
    bxOffset: 0,
    byOffset: -14
}

// Calculates the dimensions of the cluster icon
CALC_CLUSTER_ICON = function(c_length) {
    var size = mapValue(c_length, 2, 60, 40,90);
    if ( size > MAX_CLUSTER_SIZE ) {
        size = MAX_CLUSTER_SIZE;
    }
    var x_off = -size*.5;
    var y_off = -size*.5-(size*.01);
    var bx_off = -size*.2;
    var by_off = -size*.5;
    var output =  {
            dimension : size,
            xOffset: x_off,
            yOffset: y_off,
            bxOffset: bx_off,
            byOffset: by_off
    };
    return output;
}

CAST_CONTEXT = {
    getIcon: function(feature) {
        if ( feature.cluster ) {
            return THEME_URL + 'img/castCluster.png';
        }
        else {
            return THEME_URL + 'img/castMarker.png';
        }
    },

    getLabel: function(feature) {
        if ( feature.cluster ) {
            return feature.cluster.length;
        } 
        else {
            return '';
        }
    },

    getBackground: function(feature) {
        if(feature.cluster){
            return STATIC_URL + 'img/blank.png';
        }
        else{
            return STATIC_URL + 'img/blank.png';
        }
    },

    getWidth: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.dimension;
        }
        else{
            return CAST_ICON.width;
        }
    },

    getHeight: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.dimension;
        }
        else{
            return CAST_ICON.height; 
        }
    },

    getXOffset: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.xOffset;
        }
        else{
            return CAST_ICON.xOffset;
        }
    },

    getYOffset: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.yOffset;
        }
        else{
            return CAST_ICON.yOffset; 
        }
    },

    getBWidth: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.dimension;
        }
        else{
            return CAST_ICON.bWidth;
        }
    },

    getBHeight: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.dimension;
        }
        else{
            return CAST_ICON.bHeight; 
        }
    },

    getBXOffset: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.bxOffset;
        }
        else{
            return CAST_ICON.bxOffset;
        }
    },

    getBYOffset: function(feature){
        if(feature.cluster){
            var calc = CALC_CLUSTER_ICON(feature.cluster.length);
            return calc.byOffset;
        }
        else{
            return CAST_ICON.byOffset; 
        }
    }
}

CAST_HOVER_CONTEXT = {
    getIcon: function(feature) { 
        if ( feature.cluster ) {
            return THEME_URL + 'img/castClusterHover.png';
        }
        else {
            return THEME_URL + 'img/castMarkerHover.png';
        }
    },
    getBackground: function(feature) {
        if( feature.cluster ) {
            return STATIC_URL + 'img/blank.png';
        }
        else {
            return STATIC_URL+'img/blank.png';
        }
    }
}

COLLECTION_STYLE = {
    cursor: 'pointer',
    strokeWidth: 0,
    strokeOpacity: .7,
    strokeColor: COLLECTION_PATH_COLOR ,
    strokeDashstyle: 'dash'
}

COLLECTION_HOVER_STYLE = {
    strokeWidth: 3,
    strokeOpacity: .6,
    strokeColor: COLLECTION_PATH_COLOR ,
    strokeDashstyle: 'solid',
}

COLLECTION_SELECT_STYLE = {
    strokeWidth: 3,
    strokeOpacity: .6,
    strokeColor: COLLECTION_PATH_COLOR ,
    strokeDashstyle: 'solid',
}

COLLECTION_CONTEXT = {
    getStroke: function(feature){
        var max = 10;
        var coll_range = 100;
        var stroke = feature.attributes.casts_count;
        if(stroke >= coll_range){
            return max;
        }
        else{
            return mapValue(stroke, 0, 200 ,2,max);
        }
    },

    getColor: function(feature) {
        return '#C09E2A';
    }
}

BOUNDRY_STYLE = {
    fillOpacity: 0.0,
    strokeWidth: 6,
    strokeOpacity: .8,
    strokeColor:'#fff',
    strokeDashstyle: 'solid'
}
