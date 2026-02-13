// set the dimensions and margins of the graph
const margin = {top: 30, right: 10, bottom: 10, left: 0};

// Store current CSV file for resize events
let currentCsvFile = "./data/cis-2012.csv";

// Function to load and visualize data
function loadData(csvFile) {
  // Store the current file for resize events
  currentCsvFile = csvFile;
  
  // Clear previous content
  d3.select("#my_dataviz").selectAll("svg").remove();
  
  // Get current container dimensions
  const container = d3.select("#my_dataviz").node();
  const width = container.clientWidth - margin.left - margin.right;
  const height = container.clientHeight - margin.top - margin.bottom;

  // Remove any existing tooltip
  d3.select("#my_dataviz").selectAll(".tooltip").remove();

  // Create tooltip
  const tooltip = d3.select("#my_dataviz")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  // append the svg object to the body of the page
  const svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform",
          `translate(${margin.left},${margin.top})`);

  // Parse the Data
  d3.csv(csvFile).then( function(data) {

    // Extract all dimensions
    dimensions = Object.keys(data[0])

    // For each dimension, I build a scale. I store all in a y object
    const y = {}
    for (i in dimensions) {
      name = dimensions[i]
      
      // Check if the column is numeric
      const sampleValues = data.map(d => d[name]).filter(v => v !== null && v !== "");
      const isNumeric = sampleValues.every(v => !isNaN(+v));
      
      if (isNumeric) {
        // Use linear scale for numeric data
        y[name] = d3.scaleLinear()
          .domain( d3.extent(data, function(d) { return +d[name]; }) )
          .range([height, 0])
      } else {
        // Use band scale for categorical data
        const uniqueValues = [...new Set(sampleValues)];
        y[name] = d3.scaleBand()
          .domain(uniqueValues)
          .range([height, 0])
      }
    }

    // Build the X scale -> it find the best position for each Y axis
    x = d3.scalePoint()
      .range([0, width])
      .padding(1)
      .domain(dimensions);

    // Build points for a row
    function getPoints(d) {
      return dimensions.map(function(p) {
        return [x(p), y[p](d[p]) + (y[p].bandwidth ? y[p].bandwidth() / 2 : 0)];
      });
    }

    // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
    function path(d) {
      return d3.line()(getPoints(d));
    }

    function isPointInRect(p, rect) {
      const [x0, y0, x1, y1] = rect;
      return p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    }

    function onSegment(a, b, c) {
      return Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) &&
             Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
    }

    function direction(a, b, c) {
      return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
    }

    function segmentsIntersect(p1, p2, p3, p4) {
      const d1 = direction(p3, p4, p1);
      const d2 = direction(p3, p4, p2);
      const d3 = direction(p1, p2, p3);
      const d4 = direction(p1, p2, p4);

      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
      }
      if (d1 === 0 && onSegment(p3, p4, p1)) return true;
      if (d2 === 0 && onSegment(p3, p4, p2)) return true;
      if (d3 === 0 && onSegment(p1, p2, p3)) return true;
      if (d4 === 0 && onSegment(p1, p2, p4)) return true;

      return false;
    }

    function segmentIntersectsRect(p1, p2, rect) {
      if (isPointInRect(p1, rect) || isPointInRect(p2, rect)) return true;
      const [x0, y0, x1, y1] = rect;
      const edges = [
        [[x0, y0], [x1, y0]],
        [[x1, y0], [x1, y1]],
        [[x1, y1], [x0, y1]],
        [[x0, y1], [x0, y0]]
      ];
      return edges.some(([a, b]) => segmentsIntersect(p1, p2, a, b));
    }

    function lineIntersectsRect(points, rect) {
      for (let i = 0; i < points.length - 1; i += 1) {
        if (segmentIntersectsRect(points[i], points[i + 1], rect)) return true;
      }
      return false;
    }

    // Tooltip content formatter
    function formatTooltip(d) {
      return Object.entries(d)
        .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
        .join("");
    }

    function positionTooltip(event) {
      const rect = container.getBoundingClientRect();
      const xPos = event.clientX - rect.left + 12;
      const yPos = event.clientY - rect.top + 12;
      tooltip
        .style("left", `${xPos}px`)
        .style("top", `${yPos}px`);
    }

    // Track current brush selection
    let currentBrushSelection = null;

    function getLineOpacity(d) {
      if (!currentBrushSelection) return 0.5;
      const points = getPoints(d);
      return lineIntersectsRect(points, currentBrushSelection) ? 0.9 : 0.05;
    }

    // Background rect to capture brush drags
    const background = svg.append("rect")
      .attr("class", "background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .style("fill", "transparent")
      .style("pointer-events", "all");

    // Draw the lines
    const lineGroup = svg.append("g").attr("class", "lines");

    const lines = lineGroup
      .selectAll("myPath")
      .data(data)
      .join("path")
      .attr("d",  path)
      .style("fill", "none")
      .style("stroke", "#69b3a2")
      .style("opacity", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .classed("hovered", true)
          .style("stroke", "#ff7f0e")
          .style("opacity", 0.9)
          .style("stroke-width", 4);
        tooltip
          .style("opacity", 1)
          .html(formatTooltip(d));
        positionTooltip(event);
      })
      .on("mousemove", function(event) {
        positionTooltip(event);
      })
      .on("mouseout", function() {
        const line = d3.select(this).classed("hovered", false);
        line
          .style("stroke", "#69b3a2")
          .style("opacity", getLineOpacity(line.datum()))
          .style("stroke-width", 1);
        tooltip
          .style("opacity", 0);
      })

    // Rectangular brush for selection (custom drag rectangle, does not block hover)
    const brushLayer = svg.append("g").attr("class", "brush");
    const brushRect = brushLayer.append("rect")
      .attr("class", "brush-rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 0)
      .attr("height", 0)
      .style("display", "none")
      .style("fill", "rgba(0, 123, 255, 0.15)")
      .style("stroke", "#007bff")
      .style("stroke-width", 1);

    let brushingActive = false;
    let brushStart = null;

    function applyBrush(selection) {
      if (!selection) {
        currentBrushSelection = null;
        lines
          .style("opacity", function() {
            return d3.select(this).classed("hovered") ? 0.9 : 0.5;
          })
          .style("stroke", "#69b3a2");
        return;
      }
      currentBrushSelection = selection;
      lines
        .style("opacity", function(d) {
          if (d3.select(this).classed("hovered")) return 0.9;
          return getLineOpacity(d);
        });
    }

    function endBrushing() {
      if (!brushingActive) return;
      brushingActive = false;
      brushStart = null;
    }

    // Start brush only when user clicks on background (not on a line)
    background.on("mousedown", function(event) {
      if (event.button !== 0) return;
      brushingActive = true;
      const [x0, y0] = d3.pointer(event, this);
      brushStart = [x0, y0];
      brushRect
        .style("display", null)
        .attr("x", x0)
        .attr("y", y0)
        .attr("width", 0)
        .attr("height", 0);
      applyBrush([x0, y0, x0, y0]);
    });

    background.on("mousemove", function(event) {
      if (!brushingActive || !brushStart) return;
      const [x, y] = d3.pointer(event, this);
      const x0 = Math.min(brushStart[0], x);
      const x1 = Math.max(brushStart[0], x);
      const y0 = Math.min(brushStart[1], y);
      const y1 = Math.max(brushStart[1], y);
      brushRect
        .attr("x", x0)
        .attr("y", y0)
        .attr("width", x1 - x0)
        .attr("height", y1 - y0);
      applyBrush([x0, y0, x1, y1]);
    });

    background.on("mouseup", function() {
      if (!brushingActive) return;
      const width = parseFloat(brushRect.attr("width"));
      const height = parseFloat(brushRect.attr("height"));
      if (width < 2 || height < 2) {
        brushRect.style("display", "none");
        applyBrush(null);
      }
      endBrushing();
    });

    d3.select(window).on("mouseup.brush", function() {
      if (!brushingActive) return;
      const width = parseFloat(brushRect.attr("width"));
      const height = parseFloat(brushRect.attr("height"));
      if (width < 2 || height < 2) {
        brushRect.style("display", "none");
        applyBrush(null);
      }
      endBrushing();
    });

    // Draw the axis:
    svg.selectAll("myAxis")
      // For each dimension of the dataset I add a 'g' element:
      .data(dimensions).enter()
      .append("g")
      // I translate this element to its right position on the x axis
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      // And I build the axis with the call function
      .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
      // Add axis title
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; })
        .style("fill", "black")

  })
}

// Load initial data
loadData("./data/cis-2012.csv");

// Button event listeners
document.getElementById("btn2012").addEventListener("click", function() {
  loadData("./data/cis-2012.csv");
});

document.getElementById("btn2019").addEventListener("click", function() {
  loadData("./data/cis-2019.csv");
});

