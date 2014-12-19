	var margin = {
	    top: 40,
	    right: 10,
	    bottom: 10,
	    left: 10
		},
		width = 680 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;
		height2 = 160; 
		height3 = 60;
	    

    var color = d3.scale.ordinal()
        .domain(["demersal", "pelagic", "Pelagic(neuston)"])
        .range(["#386cb0", "#beaed4", "#33a02c","#33a02c", "#7fc97f"]);

	//variable to indicate whether the tseries plot has been initialized	
    var tplot = false;
    
    //svg with all subplots
    var tseries = d3.select('#timeseries');
    var tseries_svg, port_svg;
    
    //Function to parse out  2 possible date formats
    var format = d3.time.format("%e %B %Y");
    var format2 = d3.time.format("%m/%d/%y");

	//Setting axis and scales
    var x, y, xAxis, YAxis;

    x = d3.time.scale()
        .range([50, 1050]);

    y = d3.scale.linear()
        .range([height2, 20]);
        
    xfixed = d3.time.scale()
        .range([50, 480]);    
        
    yfixed = d3.scale.log()
        .range([height3, 5]);

	//function to draw time series for a given species	
    var line = d3.svg.line()
    	.interpolate("bundle") 
        .x(function (d) {
            return x(d.Date);
        })
        .y(function (d) {
            return y(d.cs);
        });

	//setting properties for treemap div	
    var div = d3.select("#treemap")
        .style("position", "relative")
        .style("width", (width + margin.left + margin.right) + "px")
        .style("height", (height + margin.top + margin.bottom) + "px")
        .style("left", margin.left + "px")
        .style("top", margin.top + "px");


    var dfilt=[];
    var dataset =[];

    d3.csv("data/fish_clean.csv", function (data) {

		// Parsing out Date Information, converting cs values to ints and cleaning up strings for ports, species, and dates
        data.forEach(function (d, i) {
            d.date_clean = _.string.clean(d.date.replace(/,/g, ' '))
            d.Date = format.parse(d.date_clean) 
            if (d.Date == null)
                d.Date = format2.parse(d.date_clean)
            d.cs = +d.cs;
            d.sdate = d.date;
            d.species_id = _.string.clean(d.species).slice(0, 15)
            d.port = _.string.clean(d.port)
            
            
		});

		//Removing data entries with null or NaN values
        data = data.filter(function (d) {
            if (d.Date == null | d.cs == null | isNaN(d.cs))
                return false
            return true
        })

		//Sorting by sample date
        data.sort(function (a, b) {
            return new Date(b.Date) - new Date(a.Date);
        });
        
        //Setting domain for x and fixed y scale
        x.domain(d3.extent(data, function (d) {
            return d.Date;
        }));
        
        xfixed.domain(d3.extent(data, function (d) {
            return d.Date;
        }));
        
        yfixed.domain(d3.extent(data, function (d) {
            return d.cs;
        }));


		dataset = data;
		//Creating hierarchical data structure by pelagic/demersal/neuston, then by species
        var root = {
            "key": "Fish",
            "values": d3.nest()
                .key(function (d) {
                    return d.dem
                })
                .key(function (d) {
                    return d.species_id
                })
				.rollup(function (d) { // Averaging Cs/species
                return d3.mean(d, function (g) {
                    return +g.cs;
                });
            })
                .entries(data)
        }
        
        console.log(root)
        

       //Treemap layout
        var treemap = d3.layout.treemap()
            .size([width, height])
            .sticky(true)
            .children(function (d, depth) {
                return d.values;
            })
            .value(function (d) {
                return d.values;
            })


        var node = div.datum(root).selectAll(".node")
            .data(treemap.nodes)
            .enter().append("div")
            .attr("class", "node")
            .call(position)
            .style("background", function (d) {
                return d.children ? color(d.key) : null;
            })
            .text(function (d) {
                return d.children ? null : d.key;
            });



        d3.selectAll("input").on("change", function change() {
            var value = this.value === "samples" ? function () {
                return 1;
            } : function (d) {
                return d.values;
            };

            node
	            .data(treemap.value(value).nodes)
	            .transition()
	            .duration(1500)
	            .call(position);

        });

		
		//Call function to create initial vis setup w/ axis and all species p/ port. 
		createDetailVis();
		
		//Setup callback functions for treemap nodes
        d3.selectAll(".node")
        	//Setting click callback
            .on("click", function (d) {
	            d3.selectAll(".node").style(
	            {'border':"solid 1px white",
	            'font':'0px sans-serif'})
	            
	            d3.select(this).style(
	            {'border': "solid 2px red",
	            'font':'15px sans-serif'})
	           
				updateDetailVis(data, d.key)
            })
            //Setting hover callback
            .on("mouseover", function (d) {
                info = d3.select("#info_box1");
                dfilt = data.filter(function (e) {
                        return e.species_id == d.key
                    })
                    
                 //Upating tooltip info     
                info.select("#species").text(dfilt[0].species)
                info.select("#type").text(dfilt[0].dem)
                info.select('#consensus').text(Math.round(+d.values))

                return info.style("visibility", "visible");
            })
			
	        .on("mousemove", function () {
	            return info.style("top", (event.pageY+10) + "px").style("left", (event.pageX - 30) + "px");
	        })        
	        
	        .on("mouseout", function () {
	                return info.style("visibility", "hidden");
	            });
	

	        function position() {
	            this.style("left", function (d) {
	                return d.x + "px";
	            })
	                .style("top", function (d) {
	                    return d.y + "px";
	                })
	                .style("width", function (d) {
	                    return Math.max(0, d.dx - 1) + "px";
	                })
	                .style("height", function (d) {
	                    return Math.max(0, d.dy - 1) + "px";
	                });
	        }

    });


    /* Function that creates time series and species/port plot 	 */
    var createDetailVis = function () {
        
        //Axis for time series plots for individual species
        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        yAxis = d3.svg.axis()
            .scale(y.domain([0,500]))
            .orient("left")
            
         
        // Y axis for all species for a given port    
        yFAxis  = d3.svg.axis()
            .scale(yfixed)
            .orient("left");   
            
            
        var w_width = width;
        
		tseries_svg = d3.select("#lineplot")
		        
		ibaraki_svg = d3.select("#ibaraki")
		iwate_svg = d3.select("#iwate")
		miyagi_svg = d3.select("#miyagi")
		fukushima_svg = d3.select("#fukushima")
		chiba_svg = d3.select("#chiba")        
        
        tseries_svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis);

        tseries_svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(50,0)")
            .call(yAxis.ticks(10))
        
        
        //adding axes and red line to all port_plots    
        add_axes(ibaraki_svg)
        add_axes(iwate_svg)
        add_axes(miyagi_svg)
        add_axes(fukushima_svg)
        add_axes(chiba_svg)    
                    
        //Adding 100 bq/kg red line for both plots (reference of what is considered "safe" to ingest    
         tseries_svg.selectAll("line.horizontalGrid").data(y.ticks(4)).enter()
	    .append("line")
        .attr(
        {
            "class":"horizontalGrid",
            "x1" : 50,
            "x2" : 1200,
            "y1" : function(d){ return y(100);},
            "y2" : function(d){ return y(100);},
            "fill" : "none",
            "shape-rendering" : "crispEdges",
            "stroke" : "#f8f8f8",
            "stroke-dasharray": ("3, 3"),
            "stroke-width" : "3px"
        });
        
               
        plot_port(ibaraki_svg,'baraki');
        plot_port(iwate_svg,'wate');
        plot_port(miyagi_svg,'iyagi');
        plot_port(fukushima_svg,'ukushima');
        plot_port(chiba_svg,'hiba');
        
		}
        	
       //function to add axes and red line to any given port_vis
       var add_axes= function (port_svg){
	        port_svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(10," + height3 + ")")
            .call(xAxis.scale(xfixed).ticks(8).tickFormat(d3.time.format("%b")));
            
            port_svg.append("text")
			.attr({
	            transform: "rotate(-90)",
	            x: 5,
	            y: -40,
            dx: "-0.5em",
            dy: "4.5em",
        })
        .style("text-anchor", "end")
        .text("Cs137 (Bq/kg)")


        port_svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(60,0)")
            .call(yFAxis.ticks(2))
            
	     port_svg.selectAll("line.horizontalGrid").data(y.ticks(3)).enter()
	    .append("line")
        .attr(
        {
            "class":"horizontalGrid",
            "x1" : 50,
            "x2" : 1200,
            "y1" : function(d){ return yfixed(100);},
            "y2" : function(d){ return yfixed(100);},
            "fill" : "none",
            "shape-rendering" : "crispEdges",
            "stroke" : "#f8f8f8",
            "stroke-dasharray": ("3, 3"),
            "stroke-width" : "3px"
        });   
	       
       }
       	

	// Function to create port specific vis
	var plot_port = function (svg_container, port){
		//Plot circles in plot with all species/port
         svg_container.selectAll("circle")
                .data(dataset.filter(function (d) {
                    return _.string.include(d.o_pref, port)
                }))
                .enter().append("svg:circle")
                .attr("stroke-width", "2px")
                .attr("cx", function (d) {
                    return xfixed(d.Date)
                })
                .attr("cy", function (d) {
                    return yfixed(d.cs)
                })
                .attr("stroke", "black")
                .attr("r",  "1")
                .attr("fill", "none")

	}
	
	// Function to update port specific vis
	var update_port = function (svg_container, port, key){
		
		//Update which circles are highlighted in the port graph	
            svg_container.selectAll("circle")
                .data(dataset.filter(function (d) {
                    return _.string.include(d.o_pref, port)
                }))
                .transition()
                .duration(1000)
                .attr("stroke", function (d) {
                    return (d.species_id == key) ? "red" : "black"
                })
                .attr("r", function (d) {
                    return (d.species_id == key) ? "3" : "1"
                })
                .attr("fill", function (d) {
                    return (d.species_id == key) ? "red" : "none"
                })    
	}
	
	
	// Funtion to update vis 
    var updateDetailVis = function (data, key) {
    	//Filter data by selected species
         var dfilt = data.filter(function (e) {
                return e.species_id == key
            })
            
        //updating domain of y scale for timeseries plot
        y.domain(d3.extent(dfilt, function (d) {
        	return d.cs;
		}));
		
		//If the domain is less than 100, force the upper limit to 120 to include the red 100 line. 
		if (y.domain()[1]<120)
			y.domain([y.domain()[0],120])

      
        if (tplot) { //Plot has already been initialized

            //Update Line graph
            tseries_svg.selectAll("path.line")
                .datum(dfilt)
                .transition()
                .duration(1000)
                .attr("d", line)
                .style("stroke", function (d) {
                    return "red"
                })
              
             // Update location of red line   
             tseries_svg.selectAll('line.horizontalGrid')
             .datum(y.ticks(4))
                .transition()
                .duration(1000)
                .attr(
		        {
		            "y1" : function(d){ return y(100);},
		            "y2" : function(d){ return y(100);},
		        
		        });
		
			 update_port(ibaraki_svg,'baraki',key);
	        update_port(iwate_svg,'wate',key);
	        update_port(miyagi_svg,'iyagi',key);
	        update_port(fukushima_svg,'ukushima',key);
	        update_port(chiba_svg,'hiba',key);               
        }

        //
        else {
            
            tseries_svg.append("path")
                .datum(dfilt)
                .attr("class", "line")
                .attr("d", line)
                
            tplot = true;
            
            updateDetailVis(data, key)
            
        }

        //Update Y axis
        tseries_svg.select(".y.axis")
            .transition()
            .duration(1000)
            .call(yAxis.scale(y).ticks(10));

        //Update Species name 
        d3.select("#species_name").html(dfilt[0].species);

    }
    
