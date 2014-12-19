// create D3 visualization viewport parameters
var margin = {
    top: 50,
    right: 80,
    bottom: 30,
    left: 50
}
// size of full vis
var width = 920 - margin.left - margin.right
var height = 400 - margin.bottom - margin.top

// zoomable area
var zoomVis = {
    coordinates:[134, 40] ,
    w: 130,
    h: 100
}
var active = d3.select(null)

// use this for histogram vis beneath slider
var bbVis = {
    x: 10, 
    y: 10,
    w: width + margin.left,
    h: 230,
}

// attach svg object to the DOM
var svg_map = d3.select("#csmap").append("svg")
    .attr({
        width: width + margin.left + margin.right,
        height: height + margin.top + margin.bottom
    })
var svg_chart = d3.select("#cschart").append("svg")
    .attr({
        width: bbVis.w + margin.left + margin.right,
        height: bbVis.h + margin.top + margin.bottom
    })

// give the SVG a background color
svg_map.append("rect")
   .attr({
    class: "map_background",
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom,
    fill: "#253494",
   })
   .on("click", reset)

var g = svg_map.append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    })

// a variety of map projection methods
var projectionMethods = [
    { // 0 -- overview -- use this as full and zoom to 2
        name: "aziumuthal equal area Pacific",
        method: d3.geo.azimuthalEqualArea().translate([(width / 2) - 40, (height / 2) +230]).rotate([-180, 0]).scale(480).precision(.01)
    },{ // 1 -- overview -- looks more "normal"
        name: "equirectangular Pacific",
        method: d3.geo.equirectangular().translate([(width / 2) - 100, (height / 2) + 150]).rotate([-160, 0]).scale(400).precision(.01)
    },{ // 2 -- zoomed -- this looks better
        name: "aziumuthal equal area Pacific",
        method: d3.geo.azimuthalEqualArea().translate([(width / 2), (height / 2) ]).rotate([-142, -36]).scale(2980).precision(.01)
    },{ // 3 -- zoomed -- not as good
        name: "equirectangular Pacific",
        method: d3.geo.equirectangular().translate([(width / 2), (height / 2)]).rotate([-140, -34]).scale(1800).precision(.01)
    }

]

// base map parameters
var actualProjectionMethod = 0
var projection =  projectionMethods[actualProjectionMethod].method
var path_map = d3.geo.path().projection(projection)
var rScale = d3.scale.log().range([1, 15])

// slider params
var parseDate = d3.time.format("%m/%e/%y").parse
var formatDate = d3.time.format("%b %Y")
var formatTDate = d3.time.format("%m/%e/%y")
var slider_x = d3.time.scale().range([0, width]).clamp(true)

// circle transparency scales
var fillOpScale = d3.scale.linear().range([0, 0.7])
var strokeOpScale = d3.scale.linear().range([0, 1])
var one_day = 1000*60*60*24   // one day in milliseconds
fillOpScale.domain([30*one_day, 0])
strokeOpScale.domain([90*one_day, 0])

// scatterplot chart parameters
var chartXScale = d3.scale.linear().range([bbVis.x, bbVis.x + bbVis.w])
var chartYScale = d3.scale.log().range([bbVis.y + bbVis.h, bbVis.y])
var chartXAxis = d3.svg.axis().scale(chartXScale).orient("bottom").ticks(30)
var yAxisFormat = d3.format("g")
var chartYAxis = d3.svg.axis()
    .scale(chartYScale)
    .orient("right")
    .ticks(5)
    .tickValues([1, 10, 100, 1000, 10000])
    .tickFormat(yAxisFormat)
    
// tooltips
//--from http://bl.ocks.org/Caged/6476579 ----------------//
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return "<strong>Date:</strong> " + formatTDate(d.date) +"<br><strong>Cs137:</strong> " + d.cs137 +"<br><strong>Cs134:</strong> " + d.cs134 + "<br><strong>Cs137/134:</strong> " + d3.round(d.csRatio,4) +"<br><strong>Salinity:</strong> " + d.salinity + "<br><strong>Temp: </strong>" + d.temp
  })
  svg_map.call(tip)
//------------------------------------------------------//

// load map data and display
// original data from naturalearthdata.com
var worldCoasts, worldCities, worldCountries

queue().defer(d3.json, "/data/ne_50m_coastline.json")
       .defer(d3.json, "/data/ne_50m_populated_places.json")
       .defer(d3.json, "/data/ne_50m_admin_0_countries.json")
       .await(loadMap)

function loadMap(error, coastline_data, cities_data, country_data){
    worldCoasts = topojson.feature(coastline_data,coastline_data.objects.ne_50m_coastline).features
    worldCities = topojson.feature(cities_data, cities_data.objects.ne_50m_populated_places).features
    worldCountries = topojson.feature(country_data, country_data.objects.ne_50m_admin_0_countries).features
    displayMap()
}

function displayMap(){
    // land area
    svg_map.append("svg:defs")
        .append("svg:pattern")
        .attr({
            id: "mountaintile",
            patternUnits: "userSpaceOnUse",
            width: 575,
            height: 575,
        })
        .append("svg:image")
        .attr({
            width: 575,
            height: 575,
            "xlink:href": "../images/mountaintile.jpg",
        })
    var coastline = g.append("g")
        .attr("id", "coastlines")
        .selectAll("path")
        .data(worldCoasts)
        .enter()
        .append("path")
        .attr({
            class: "coastline",
            d: path_map,
        })
        .style({
            stroke: "none", 
            fill: "url(#mountaintile)",
            "fill-opacity": 0.8,
        })
    // country administrative borders
    var countries = g.append("g")
        .attr("id", "countries")
        .selectAll("path")
        .data(worldCountries)
        .enter()
        .append("path")
        .attr({
            class: "country",
            d: path_map,
        })
        .style({
            stroke: "black",
            "stroke-opacity": 0.3,
            fill: "none",
        })
        
    // city markers
    var cities = g.append("g")
        .attr("id", "cities")
        .selectAll("circle")
        .data(worldCities)
        .enter()
        .append("circle")
        .filter(function(d){
            return d.properties.SCALERANK <=1
        })
        .attr({
            class: "city",
            transform: function(d){
                return "translate(" + projection(d.geometry.coordinates) + ")"
            },
            r: 3,
        })
        .style({
            stroke: "black",
            "stroke-width": 1,
            "stroke-opacity": 0.5,
            fill: "gainsboro",
            "fill-opacity": 0.8,
            r: 1,
        })

    // city names
    var city_labels = g.append("g")
        .attr("id", "city_labels")
        .selectAll("text")
        .data(worldCities)
        .enter()
        .append("text")
        .filter(function(d){
            return d.properties.SCALERANK <=1
        })
        .text(function(d){
            return d.properties.NAME
        })
        .attr({
            class: "city_label",
            transform: function(d){
                return "translate(" + projection(d.geometry.coordinates) + ")"
            },
            dx: -2,
            dy: -2,
            r: 3,
        })
        .style({
            stroke: "none",
            fill: "gainsboro",
            "fill-opacity": 0.7,
            "text-anchor": "end",
        })

    // bounding box for zoomable area around Japan
    var zoom_box = g.append("g")
        .attr("id", "zoom_box")
        .append("rect")
        .attr({
            x: projection(zoomVis.coordinates)[0],
            y: projection(zoomVis.coordinates)[1],
            width: zoomVis.w,
            height: zoomVis.h,
            d: path_map,
        })
        .style({
            fill: "ghostwhite",
            "fill-opacity": 0.2,
            stroke: "#1A1A1E",
            "stroke-opacity": 0.75,
        })
        .on("click", update)
    var zoom_label = g.append("g").append("text")
        .attr({
            id: "zoom_label",
            x: projection(zoomVis.coordinates)[0],
            y: projection(zoomVis.coordinates)[1] + zoomVis.h,
            dx: 2,
            dy: 11,
        })
        .style({
            "text-anchor": "start",
            fill: "grey",
            "fill-opacity":0.6,
        })
        .text("click to zoom")

    loadData()
}

function update() {
    // toggle projection method
    if(actualProjectionMethod===0){
        actualProjectionMethod = 2
    }
    else if(actualProjectionMethod===2){
        actualProjectionMethod = 0
    }
    // update projection & path
    projection =  projectionMethods[actualProjectionMethod].method
    path_map= d3.geo.path().projection(projection)
    // update DOM elements
    svg_map.selectAll(".coastline, .country").transition().duration(750).attr("d",path_map)
    svg_map.selectAll(".city, .city_label")
        .transition().duration(750)
        .attr("transform", function(d){
                return "translate(" + projection(d.geometry.coordinates) + ")"
            })
    svg_map.selectAll(".reading")
        .transition().duration(750)
        .attr("transform", function(d){
                return "translate(" + projection(d.coordinates) + ")"
            })
    svg_map.selectAll(".fukushima_point")
        .transition().duration(750)
        .attr("transform", "translate(" + projection(fukushimaCoord) + ")")
    // hide zoom box
    svg_map.selectAll("#zoom_box, #zoom_label")
           .transition().duration(750)
           .style("visibility", "hidden")

}

function reset(){
    if(actualProjectionMethod===2){
        actualProjectionMethod = 0
    }
    // update projection & path
    projection =  projectionMethods[actualProjectionMethod].method
    path_map= d3.geo.path().projection(projection)
    // update DOM elements
    svg_map.selectAll(".coastline, .country").transition().duration(750).attr("d",path_map)
    svg_map.selectAll(".city, .city_label")
        .transition().duration(750)
        .attr("transform", function(d){
                return "translate(" + projection(d.geometry.coordinates) + ")"
            })
    svg_map.selectAll(".reading")
        .transition().duration(750)
        .attr("transform", function(d){
                return "translate(" + projection(d.coordinates) + ")"
            })
    svg_map.selectAll(".fukushima_point")
        .transition().duration(750)
        .attr("transform", "translate(" + projection(fukushimaCoord) + ")")
    // show zoom box
    svg_map.selectAll("#zoom_box, #zoom_label")
           .transition().duration(750)
           .style("visibility", "visible")
}

// cesium data loaded into an array
var csData = []
var fukushimaCoord = [141.0329, 37.4230]

function loadData(){
    d3.json("../data/allCsData.json", function(error, data){
        // create js object with the data
        data.forEach(function(d){
            csData.push({
                source: d['source'],
                coordinates: [d.coordinates[0], d.coordinates[1]],
                cs134: parseFloat(d['cs134'].replace(/,/g,'')),
                cs137: parseFloat(d['cs137'].replace(/,/g,'')),
                date: parseDate(d['date']),
                temp: d['temp'],
                salinity: d['salinity'],
                depth: d['depth'],
                fukushimaDistance: calcDist([d.coordinates[0], d.coordinates[1]]),
                csRatio: 0,
            })
        })
        csData.map(function(d){
            d.csRatio = parseFloat(d.cs137/d.cs134)
        })
        // update circle radius scale -- converting Cs measurement to circle area
        rScale.domain(d3.extent(csData, function(d){return Math.sqrt(d.cs137 / Math.PI)}))
        // update slider scale
        slider_x.domain(d3.extent(csData, function(d){ return d.date }))
        // update chart scales
        chartXScale.domain(d3.extent(csData, function(d){return d.cs137 })).clamp(true).nice()
        chartYScale.domain(d3.extent(csData, function(d){return d.fukushimaDistance})).clamp(true).nice()
        // once everything's loaded...display data on map
        drawCircles(csData)
        drawFukushima()
        drawSlider()
        drawChart(csData)
    })
}

function drawCircles(data){
    var readings = g.append("g")
        .attr("id", "readings")
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .filter(function(d){ return d.cs137 > 0 })
        .attr("class", "reading")
        .attr({
            transform: function(d){
                return "translate(" + projection(d.coordinates) + ")"
            },
            r: function(d){ return rScale(Math.sqrt( d.cs137 / Math.PI)) }, // convert measurement to circle area
        })
        .style({
            fill: "khaki",
            stroke: "lemonchiffon",
            "stroke-opacity": 0.2, 
        })
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)

}

function drawFukushima(){
    var fukushima = g.append("g")
        .attr("id", "fukushima")
        .append("circle")
        .attr({
            class: "fukushima_point",
            transform: "translate(" + projection(fukushimaCoord) + ")",
            r: "3",
        })
        .style({
            fill: "orange",
            stroke: "darkred",
            "stroke-width": "2",
        })
    //-- concentric circles emanating from a point from: http://bl.ocks.org/mbostock/4503672
    setInterval(function(){
        g.append("circle")
           .attr({
            class: "ring",
            transform: "translate(" + projection(fukushimaCoord) + ")",
            r: "10",
           })
           .style({
            "stroke-width": 3,
            stroke: "darkred",
           })
           .transition()
           .ease("linear")
           .duration(2000)
           .style({
            fill: "none",
            "stroke-opacity": "1e-6",
            "stroke-width": 1,
            stroke: "brown"
           })
           .attr("r", 50)
           .remove()
       }, 1200)
    //---------------------------------------------------------------------//
}

//-- borrowed from http://bl.ocks.org/mbostock/6452972 ---//
function drawSlider(){    
    var brush = d3.svg.brush().x(slider_x).extent([0,0]).on("brush", brushed)

    svg_map.append("g")
           .attr({
            class: "x axis",
            transform: "translate(" + margin.left + "," + (height + margin.top) + ")",
           })
           .call(d3.svg.axis()
              .scale(slider_x)
              .orient("bottom")
              .tickFormat(function(d){ return formatDate(d) })
              .tickSize(0)
              .tickPadding(12))
           .select(".domain")
           .select(function(){ return this.parentNode.appendChild(this.cloneNode(true)) })
           .attr("class", "halo")

    var slider = svg_map.append("g")
        .attr("class", "slider")
        .call(brush)

    slider.selectAll(".background")
          .attr({
            transform: "translate(" + margin.left + "," + (height + margin.top -10) + ")",
            height: 30,
         })

    var handle = slider.append("circle")
        .attr({
            class: "handle",
            transform: "translate(" + margin.left + "," + (height + margin.top) + ")",
            r: 9,
        })

    slider.call(brush.event)
          .transition()
          .duration(750)
          .call(brush.extent([0, 0]))
          .call(brush.event)

    function brushed(){
        var value = brush.extent()[0]

        if(d3.event.sourceEvent){
            value = slider_x.invert(d3.mouse(this)[0])
            brush.extent([value, value])
        }

        handle.attr("cx", slider_x(value))
        // change opacity of map circles
        d3.selectAll(".reading").attr({
            "fill-opacity": function(d){ return fillOpScale(Math.abs(value - d.date)) },
            "stroke-opacity": function(d){ return strokeOpScale(Math.abs(value - d.date)) },
        })
        // change opacity of chart dots
        d3.selectAll(".dot").attr({
            "fill-opacity": function(d){ return fillOpScale(Math.abs(value - d.date)) },
            "stroke-opacity": function(d){ return strokeOpScale(Math.abs(value - d.date)) },
        })
    }
}
//---------------------------------------------------------------------//

// create a scatterplot of the cs measurements over distance from Fukushima
function drawChart(data){
    var chart = svg_chart.append("g")
                .attr("id", "chart_background")
                .append("rect")
                .attr({
                    transform: "translate(" + bbVis.x + ", " + bbVis.y + ")",
                    width: bbVis.w,
                    height: bbVis.h,
                })
                .style({
                    fill: "#253494",                  
                })

    var dots = svg_chart.append("g")
        .attr("id", "dots")
        .selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .filter(
            function(d){ if(isNaN(d.cs137)){ return false } else {  return true } }
        )
        .attr("class", "dot")
        .attr({
            r: 3,
            cx: function(d){ return chartXScale(d.fukushimaDistance) },
            cy: function(d){ if(d.cs137 > 0){ return chartYScale(d.cs137)} },
        })
        .style({
            fill: "khaki",
            stroke: "lemonchiffon",
            "stroke-width": 1,
            "stroke-opacity": 0.1,

        })
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)
    // X Axis
    svg_chart.append("g")
        .attr({
           class: "chart_axis",
           transform: "translate(" + 0 + ", " + (bbVis.y + 230)  + ")",
        })
        .call(chartXAxis)
        .selectAll("text:not(.x_title")
        .style({
           "font-size": "8pt",
        })
    // X Axis Title
    svg_chart.append("text")
        .attr({
            class: "chart_title",
            x: bbVis.x + bbVis.w,
            y: bbVis.y + bbVis.h,
            dx: "-0.4em",
            dy: "2.8em",
        })
        .style("text-anchor", "end")
        .text("Distance from Fukushima (km)")
    // Y Axis
    svg_chart.append("g")
        .attr({
            class: "chart_axis",
            transform: "translate(" + (bbVis.x + bbVis.w )+ ",0)",
        })
        .call(chartYAxis)
    // reference line at 100
    svg_chart.append("line")
        .attr({           
            x1 : bbVis.x,
            x2 : bbVis.x + bbVis.w,
            y1 : function(d){ return chartYScale(100);},
            y2 : function(d){ return chartYScale(100);},
            fill : "none",
            "shape-rendering" : "crispEdges",
            "stroke" : "#f8f8f8",
            "stroke-dasharray": ("3, 3"),
            "stroke-width" : "3px"
        })
    // Y Axis Title
    svg_chart.append("text")
        .attr({
            class: "chart_title",
            transform: "rotate(-90)",
            x: -(bbVis.y),
            y: bbVis.x + bbVis.w,
            // x: bbVis.y + bbVis.h,
            // y: bbVis.x + bbVis.w,            
            dx: "-0.5em",
            dy: "4.5em",
        })
        .style("text-anchor", "end")
        .text("Cs137 (Bq/m^3)")
}

// calculate distance between two sets of map coordinates
//-- adapted from https://groups.google.com/forum/#!topic/d3-js/0p7LuNHpEbM---//
function calcDist (cC) {
    // origin point: fukushimaLongLat
    var dLatRad = Math.abs(fukushimaCoord[1] - cC[1]) * Math.PI/180
    var dLonRad = Math.abs(fukushimaCoord[0] - cC[0]) * Math.PI/180
    // Calculate origin in Radians
    var lat1Rad = fukushimaCoord[1] * Math.PI/180
    var lon1Rad = fukushimaCoord[0] * Math.PI/180
    // Calculate new point in Radians
    var lat2Rad = cC[1] * Math.PI/180
    var lon2Rad = cC[0] * Math.PI/180

    // Earth's Radius
    var eR = 6371

    var d1 = Math.sin(dLatRad/2) * Math.sin(dLatRad/2) +
     Math.sin(dLonRad/2) * Math.sin(dLonRad/2) * Math.cos(lat1Rad) * Math.cos(lat2Rad)
    var d2 = 2 * Math.atan2(Math.sqrt(d1), Math.sqrt(1-d1))

    return(eR * d2) // distance in km
}
//---------------------------------------------------------------------//