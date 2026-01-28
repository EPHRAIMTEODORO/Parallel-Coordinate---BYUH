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

    // Extract all dimensions except species
    dimensions = Object.keys(data[0]).filter(function(d) { 
      return d.toLowerCase() !== "species"
    })

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

    // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
    function path(d) {
        return d3.line()(dimensions.map(function(p) { return [x(p), y[p](d[p]) + (y[p].bandwidth ? y[p].bandwidth() / 2 : 0)]; }));
    }

    // Draw the lines
    svg
      .selectAll("myPath")
      .data(data)
      .join("path")
      .attr("d",  path)
      .style("fill", "none")
      .style("stroke", "#69b3a2")
      .style("opacity", 0.5)

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

