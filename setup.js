//====================================================================
//var ClimateProxiesFinder_DB_xls = "/data01/brock/ClimateProxiesFinder_DB/20150923_xls/";
//var ClimateProxiesFinder_DB_plots = "/data01/brock/ClimateProxiesFinder_DB/20160513_plots/";
//var ClimateProxiesFinder_DB_csv = "/data01/brock/ClimateProxiesFinder_DB/20160513_csv/";
var ClimateProxiesFinder_DB_xls = "ClimateProxiesFinder_DB/20150923_xls/";
var ClimateProxiesFinder_DB_plots = "ClimateProxiesFinder_DB/20160513_plots/";
var ClimateProxiesFinder_DB_csv = "ClimateProxiesFinder_DB/20160513_csv/";

var theMap;
var mapMaxZoom = 8;

var xf;
var depthDim;
var depthGroup;
var ageDim;
var ageGroup;
var archiveDim;
var archiveGroup;
var dataTypeDim;
var dataTypeGroup;

var Ice_color = "#008cb2";
var Lake_color = "#314f6f";
var Ocean_color = "#81a6d3";
var Terrestrial_color = "#B77E40";
var Iron_color = "#AF78C9";

//====================================================================
$(document).ready(function() {

  d3.tsv("data.tsv", function(data) {
    data.forEach(function(d) {
      d.Longitude = +d.Longitude;
      d.Latitude = +d.Latitude;
      d.Depth = +d.Depth;
      d.OldestDate = +d.OldestDate;
      d.RecentDate = +d.RecentDate;

  	// Limit latitudes according to latitude map range (-85:85)
    if (d.Latitude < -85) d.Latitude = -85;
    if (d.Latitude > 85) d.Latitude = 85;
  });

    initCrossfilter(data);

    theMap = mapChart.map();

    new L.graticule({ interval: 10, style: { color: '#333', weight: 0.5, opacity: 1. } }).addTo(theMap);
    new L.Control.MousePosition({lngFirst: true}).addTo(theMap);
    new L.Control.zoomHome({homeZoom: 2, homeCoordinates: [45, 0]}).addTo(theMap);

    mapmadeUrl = 'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}',
    mapmade = new L.TileLayer(mapmadeUrl, { maxZoom: mapMaxZoom+1});
    new L.Control.MiniMap(mapmade, { toggleDisplay: true, zoomLevelOffset: -4 }).addTo(theMap);

    $('.leaflet-control-zoomhome-home')[0].click();

    //----------------------------------------------------------------
    // Events handling
    
    // Add ellipses for long entries and make DOI a hyperlink to google scholar
    //http://stackoverflow.com/questions/5474871/html-how-can-i-show-tooltip-only-when-ellipsis-is-activated
    $('#chart-table').on('mouseover', '.dc-table-column', function() {      
      // displays popup only if text does not fit in col width
      if (this.offsetWidth < this.scrollWidth) {
        d3.select(this).attr('title', d3.select(this).text());
      }
    });

    // Make DOI a hyperlink to google scholar and handle selection
    $('#chart-table').on('click', '.dc-table-column', function() {
      column = d3.select(this).attr("class");
      if (column == "dc-table-column _8") {
        id = d3.select(this.parentNode).select(".dc-table-column._0").text();
        data[id-1].Selected = d3.select(this).select('input').property('checked');
      } else {
        id = d3.select(this.parentNode).select(".dc-table-column._0").text();
        dataTable.filter(id);
        dc.redrawAll();
      	  // make reset link visible
          d3.select("#resetTableLink").style("display", "inline");
        } 
      });

    $('#button_cartadd').click(function() {
     selection = tableDim.top(Infinity);
     selection.forEach(function(d) { 
      data[d.Id -1].Selected = true; 
    });
     dataTable.redraw();
   });

    $('#button_cartdelete').click(function() {
      data.forEach(function(d,i) { d.Selected = false; });
      dataTable.redraw();
    });

    $('#button_shipping').mouseover(function() {
      nbSelection = 0;
      data.forEach(function(d,i) {
        if (d.Selected == true) nbSelection++;
      }); 
      $('#button_shipping').prop('title', 'Deliver cart as zip file (currently ' + nbSelection.toString() + ' items)');
    });

    $('#button_shipping').click(function() {
      nbSelection = 0;
      data.forEach(function(d,i) {
        if (d.Selected == true) nbSelection++;
      }); 
          if (nbSelection > 0) $("#zipdialog-confirm").dialog("open");		// create zip file only some proxies selected
          else $("#zipdialog-message").dialog("open");
        });

    $("#zipdialog-confirm").dialog({
      autoOpen: false,
      resizable: false,
      modal: true,
      buttons: {
        "Confirm": function() {
          $(this).dialog("close");
          filesToZip = [];
          data.forEach(function(d,i) {
           if (d.Selected == true) {
            if(data[i].DataType.includes("MAR")){
              filesToZip.push("DB/MAR/" + data[i].Name + ".txt");
              filesToZip.push("DB/MAR_description/" + data[i].Name + ".pdf");
            }
            if(data[i].DataType.includes("Size")){
              filesToZip.push("DB/SIZE/" + data[i].Name + ".txt");
              filesToZip.push("DB/SIZE_description/" + data[i].Name + ".pdf");
            }
            if(data[i].DataType.includes("Iron")){
              filesToZip.push("DB/Iron/Iron.xlsx");
            }
                      	//console.log("selected: ", i+1, data[i].Filename);
                      }
                    });
              //console.log(filesToZip);
              $.redirect("make_zip.php", {files: filesToZip});
            },
            "Cancel": function() {
              $(this).dialog("close");
            }
          }
        });

    $("#zipdialog-message").dialog({
      autoOpen: false,
      resizable: false,
      modal: true,
      buttons: {
        "OK": function() {
          $(this).dialog("close");
        }
      }
    });

    markers = mapChart.markerGroup();
    markers.on('clustermouseover', function (a) {
      childMarkers = a.layer.getAllChildMarkers();
      childMarkersIds = childMarkers.map(function(obj) {return obj.key[2]}).sort();
      //console.log(childMarkersIds);
      childMarkersIds.forEach(function(Id, i) {
      	d3.selectAll(".dc-table-column._0")
        .text(function (d) {
          if (parseInt(d.Id) == Id) {
      				if (i==0) this.parentNode.scrollIntoView();  // scroll for first
             d3.select(this.parentNode).style("font-weight", "bold");
           }
           return d.Id;
         });
      });	
    });
    markers.on('clustermouseout', function (a) {
      d3.selectAll(".dc-table-row").style("font-weight", "normal");
    });

  });

});

//====================================================================
function initCrossfilter(data) {

  //-----------------------------------
  xf = crossfilter(data);

  //-----------------------------------
  depthRange = [0., 5000.];
  depthBinWidth = 100.;
  depthDim = xf.dimension( function(d) { 
	// Threshold
	var depthThresholded = d.Depth;
	if (depthThresholded <= depthRange[0]) depthThresholded = depthRange[0];
	if (depthThresholded >= depthRange[1]) depthThresholded = depthRange[1] - depthBinWidth;
	return depthBinWidth*Math.floor(depthThresholded/depthBinWidth);
});
  depthGroup = depthDim.group();

  //-----------------------------------
  age1Range = [-2., 12.];
  age2Range = [-2., 12.];
  ageBinWidth = 1.;
  ageDim = xf.dimension( function(d) {
	// Threshold
	var age1Thresholded = d.RecentDate;
	if (age1Thresholded <= age1Range[0]) age1Thresholded = age1Range[0];
	if (age1Thresholded >= age1Range[1]) age1Thresholded = age1Range[1] - ageBinWidth;
	var age1 = ageBinWidth*Math.floor(age1Thresholded/ageBinWidth);
	var age2Thresholded = d.OldestDate;
	if (age2Thresholded <= age2Range[0]) age2Thresholded = age2Range[0];
	if (age2Thresholded >= age2Range[1]) age2Thresholded = age2Range[1] - ageBinWidth;
	var age2 = ageBinWidth*Math.floor(age2Thresholded/ageBinWidth);
  return [age2, age1, d.Archive];
});
  ageGroup = ageDim.group();

  //-----------------------------------
  archiveDim = xf.dimension( function(d) { return d.Archive; });
  archiveGroup = archiveDim.group();

  //-----------------------------------
  chronoDim = xf.dimension( function(d) { return d.ChronoInfo; });
  chronoGroup = chronoDim.group();

  //-----------------------------------
  dataTypeDim = xf.dimension( function(d) { return d.DataType; });
  dataTypeGroup = dataTypeDim.group();

  //-----------------------------------
  mapDim = xf.dimension(function(d) { return [d.Latitude, d.Longitude, d.Id]; });
  mapGroup = mapDim.group();

  //-----------------------------------
  tableDim = xf.dimension(function(d) { return +d.Id; });

  //-----------------------------------
  var archiveColors = d3.scale.ordinal()
  .domain(["Iron from dust sample", "Ice", "Lake", "Terrestrial", "Ocean"])
  .range([Iron_color, Ice_color, Lake_color, Terrestrial_color, Ocean_color]);

  customMarker = L.Marker.extend({
    options: { 
      Id: 'Custom data!'
    }
  });

  iconSize = [32,32];
  iconAnchor = [16,32];
  popupAnchor = [0,-32];

  mapChart  = dc.leafletMarkerChart("#chart-map");

  mapChart
  .width(1000)
  .height(300)
  .dimension(mapDim)
  .group(mapGroup)
      .center([45, -19])    // slightly different than zoomHome to have a info updated when triggered
      .zoom(2)         
      .tiles(function(map) {			// overwrite default baselayer
        return L.tileLayer(
          'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}',
          { attribution: 'LSCE &copy; 2016 | Baselayer &copy; ArcGis' }).addTo(map); 
      })
      .mapOptions({maxZoom: mapMaxZoom, zoomControl: false})
      .fitOnRender(false)
      .filterByArea(true)
      .cluster(true) 
      .clusterOptions({maxClusterRadius: 50, showCoverageOnHover: false, spiderfyOnMaxZoom: true})
      .title(function() {})  
      .popup(function(d,marker) {
        id = d.key[2] -1;
        popup = L.popup({autoPan: false, closeButton: false, maxWidth: 500});
        popup.setContent("Id: " + "<b>" + data[id].Id + "</b></br>"
         + "Position: " + "<b>" + data[id].Longitude.toFixed(2) + "°E</b>, <b>" + data[id].Latitude.toFixed(2) + "°N</b></br>"
         + "Depth (m): " + "<span style='color: " + Ocean_color + ";'><b>" +  data[id].Depth.toFixed(2) + "</b></span></br>"
         + "Date (ka): " + "<span style='color: #C9840B;'>" + "from <b>" + data[id].RecentDate.toFixed(2) + "</b> to <b>" 
         + data[id].OldestDate.toFixed(2) + "</b></span></br>"
         + "Archive: " + "<b>" + data[id].Archive + "</b></br>"
         + "Name: " + "<b>" + data[id].Name);
        return popup;
      })
      .popupOnHover(true)
      .marker(function(d,map) {
       id = d.key[2] -1;
       if (data[id].Archive == "Ice") 
         icon = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: 'img/marker_Ice.png' });
       else if (data[id].Archive == "Lake") 
         icon = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: 'img/marker_Lake.png' });
       else if (data[id].Archive == "Ocean") 
         icon = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: 'img/marker_Ocean.png' });
       else if (data[id].Archive == "Terrestrial") 
         icon = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: 'img/marker_Speleothem.png' });
       else if (data[id].Archive == "Tree") 
         icon = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: 'img/marker_Tree.png' });
       else if (data[id].Archive == "Iron from dust sample") 
         icon = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: 'img/marker_Iron.png' });
       marker = new customMarker([data[id].Latitude, data[id].Longitude], {Id: (id+1).toString(), icon: icon});
       marker.on('mouseover', function(e) {
         iconUrlNew = e.target.options.icon.options.iconUrl.replace(".png","_highlight.png");
         iconNew = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: iconUrlNew });
         e.target.setIcon(iconNew);
         d3.selectAll(".dc-table-column._0")
         .text(function (d, i) {
          if (parseInt(d.Id) == e.target.options.Id) {
            this.parentNode.scrollIntoView();
            d3.select(this.parentNode).style("font-weight", "bold");
          }
          return d.Id;
        });
       });
       marker.on('mouseout', function(e) {
         iconUrlNew = e.target.options.icon.options.iconUrl.replace("_highlight.png", ".png");
         iconNew = L.icon({ iconSize: iconSize, iconAnchor: iconAnchor, popupAnchor: popupAnchor, iconUrl: iconUrlNew });
         e.target.setIcon(iconNew);
         d3.selectAll(".dc-table-column._0")
         .text(function (d, i) {
          if (parseInt(d.Id) == e.target.options.Id) {
           d3.select(this.parentNode).style("font-weight", "normal");
         }
         return d.Id;
       });
       });
       marker.on('click', function(e) {
         Id = e.target.options.Id;
         if(data[Id-1].DataType.includes("MAR")){
          window.open("DB/MAR_SIZE/" + data[Id-1].Name + ".pdf");
        }
      });
       return marker;
     });

  //-----------------------------------
  depthChart  = dc.barChart("#chart-depth");

  depthChart
  .width(300)
  .height(200)
  .margins({top: 10, right: 20, bottom: 30, left: 40})	
  .centerBar(false)
  .elasticY(true)
  .dimension(depthDim)
  .group(depthGroup)
  .x(d3.scale.linear().domain(depthRange))
  .xUnits(dc.units.fp.precision(depthBinWidth))
  .round(function(d) {return depthBinWidth*Math.floor(d/depthBinWidth)})
  .gap(0)
  .renderHorizontalGridLines(true)
  .colors(Ocean_color);

  xAxis_depthChart = depthChart.xAxis();
  xAxis_depthChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_depthChart = depthChart.yAxis();
  yAxis_depthChart.tickFormat(d3.format("d")).tickSubdivide(0);

  //-----------------------------------
  ageChart  = dc.scatterPlot("#chart-age");

  ageChart
  .width(300)
  .height(200)
  .margins({top: 10, right: 20, bottom: 30, left: 40})	
  .dimension(ageDim)
  .group(ageGroup)
  .xAxisLabel("Most recent age")
  .yAxisLabel("Oldest age")
    //.mouseZoomable(true)
    .x(d3.scale.linear().domain(age1Range))
    .y(d3.scale.linear().domain(age2Range))
    .round(function(d) {return ageBinWidth*Math.floor(d/ageBinWidth)})
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .symbolSize(8)
    .excludedSize(4)
    .existenceAccessor(function(d) { return d.value > 0 ; })
    .colorAccessor(function (d) { return d.key[2]; })
    .colors(archiveColors)
    .filterHandler(function(dim, filters) {
     if(!filters || !filters.length)
      dim.filter(null);
    else {
      	// assume it's one RangedTwoDimensionalFilter
       dim.filterFunction(function(d) {
        return filters[0].isFiltered([d[0],d[1]]);
      })
     }
   });

    xAxis_ageChart = ageChart.xAxis();
    xAxis_ageChart.ticks(6).tickFormat(d3.format("d"));
    yAxis_ageChart = ageChart.yAxis();
    yAxis_ageChart.ticks(6).tickFormat(d3.format("d"));

  //-----------------------------------
  archiveChart  = dc.rowChart("#chart-archive");

  archiveChart
  .width(180)
  .height(200)
  .margins({top: 10, right: 10, bottom: 30, left: 10})	
  .dimension(archiveDim)
  .group(archiveGroup)
  .colors(archiveColors)
  .elasticX(true)
  .gap(2)
  .xAxis().ticks(4);

  //-----------------------------------

  //-----------------------------------
  //data type
  var dataTypeColors = d3.scale.ordinal()
  .domain(["Ice", "Ocean", "Terrestrial"])
  .range([Ice_color, Ocean_color, Terrestrial_color]);

  dataTypeChart  = dc.rowChart("#chart-dataType");

  dataTypeChart
  .width(180)
  .height(200)
  .margins({top: 10, right: 10, bottom: 30, left: 10})  
  .dimension(dataTypeDim)
  .group(dataTypeGroup)
  .colors(dataTypeColors) 
  .elasticX(true)
  .gap(2)
  .xAxis().ticks(4);



  //-----------------------------------
  dataCount = dc.dataCount('#chart-count');

  dataCount 
  .dimension(xf)
  .group(xf.groupAll())
  .html({
    some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
    ' | <a href=\'javascript: resetAll_exceptMap();\'>Reset All</a>',
    all: 'All records selected. Please click on the graph to apply filters.'
  });

  //-----------------------------------
  dataTable = dc.dataTable("#chart-table");

  format1 = d3.format(".0f");
  format2 = d3.format(".2f");

  dataTable
  .dimension(tableDim)
  .group(function(d) {})
  .showGroups(false)
  .size(100)
    //.size(xf.size()) //display all data
    .columns([
      function(d) { return d.Id; },
      function(d) { return format1(d.Depth); },
      function(d) { return format2(d.RecentDate); },
      function(d) { return format2(d.OldestDate); },
      function(d) { return d.Archive; },
      function(d) { return d.DataType; },
      function(d) { return '<a href="https://scholar.google.fr/scholar?q=' + d.DOI + '" target="_blank">' + d.DOI + '</a>' },
      function(d) { return d.Reference; },
      function(d) { if (d.Selected) return "<input type='checkbox' checked>";
      else return "<input type='checkbox'>"; }
      ])
    .sortBy(function(d){ return +d.Id; })
    .order(d3.ascending);

  //-----------------------------------
  dc.renderAll();

}

// reset dataTable
function resetTable() {
  dataTable.filterAll();
  dc.redrawAll();
  // make reset link invisible
  d3.select("#resetTableLink").style("display", "none");
}

// reset all except mapChart
function resetAll_exceptMap() {
  depthChart.filterAll(); 
  ageChart.filterAll(); 
  archiveChart.filterAll(); 
  dataTypeChart.filterAll();
  resetTable();
  dc.redrawAll();
}

//====================================================================
