# Parallel-Coordinate---BYUH

## Part 1: Building a Parallel Coordinates Visualization with D3.js

### Introduction
This project demonstrates how to create an interactive **Parallel Coordinates** visualization using D3.js. A parallel coordinates plot is a powerful way to visualize multivariate datasets by representing each observation as a line that crosses multiple vertical axes, with each axis representing a different dimension (variable) of the data.

### What is a Parallel Coordinates Plot?
In a parallel coordinates visualization:
- Each **vertical axis** represents a different variable/dimension
- Each **line** represents a single data point across all dimensions
- The **position** of a line on an axis shows the value of that data point for that dimension
- **Patterns** in the lines reveal correlations and relationships between variables

### Core D3.js Concepts Used

#### 1. **Setting Up Dimensions & Margins**
```javascript
const margin = {top: 30, right: 10, bottom: 10, left: 0};
const container = d3.select("#my_dataviz").node();
const width = container.clientWidth - margin.left - margin.right;
const height = container.clientHeight - margin.top - margin.bottom;
```
- **Margins** are set to control spacing around the visualization
- **Width & Height** are calculated dynamically from the container size, allowing the graph to be **responsive**
- The container is selected using `d3.select()`, which finds the DOM element where the SVG will be placed

#### 2. **Creating the SVG Canvas**
```javascript
const svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
```
- An **SVG (Scalable Vector Graphics)** element is appended to the page
- A **group (g)** element is created and translated to account for margins
- Everything drawn inside this group will automatically be offset by the margin values

#### 3. **Loading Data Dynamically**
```javascript
function loadData(csvFile) {
  d3.select("#my_dataviz").selectAll("svg").remove();
  // ... visualization code ...
}
```
- The `loadData()` function wraps the visualization logic, allowing **different datasets to be loaded**
- Before loading new data, all previous SVG elements are **removed** to prevent overlapping
- This enables the **toggle between 2012 and 2019 datasets** via button clicks

#### 4. **Automatic Data Type Detection**
```javascript
const sampleValues = data.map(d => d[name]).filter(v => v !== null && v !== "");
const isNumeric = sampleValues.every(v => !isNaN(+v));

if (isNumeric) {
  y[name] = d3.scaleLinear()
    .domain(d3.extent(data, function(d) { return +d[name]; }))
    .range([height, 0])
} else {
  const uniqueValues = [...new Set(sampleValues)];
  y[name] = d3.scaleBand()
    .domain(uniqueValues)
    .range([height, 0])
}
```
- The code **inspects each column** to determine if it contains numeric or categorical data
- **Numeric columns** use a `d3.scaleLinear()` to map values proportionally along the axis
  - `domain()`: the actual data range (min to max)
  - `range()`: the pixel range [height, 0] (inverted so high values are at the top)
- **Categorical columns** (like gender, major) use a `d3.scaleBand()` to create discrete sections
  - This allows categorical values to have equally-spaced positions

#### 5. **Positioning Axes on the X-Axis**
```javascript
x = d3.scalePoint()
  .range([0, width])
  .padding(1)
  .domain(dimensions);
```
- Uses `d3.scalePoint()` to space out each dimension axis evenly across the width
- `.padding(1)` adds spacing between axes for clarity

#### 6. **Drawing the Lines (Polylines)**
```javascript
function path(d) {
  return d3.line()(dimensions.map(function(p) {
    return [x(p), y[p](d[p]) + (y[p].bandwidth ? y[p].bandwidth() / 2 : 0)];
  }));
}

svg.selectAll("myPath")
  .data(data)
  .join("path")
  .attr("d", path)
  .style("stroke", "#69b3a2")
  .style("opacity", 0.5)
```
- For **each data point** (row in the CSV), a path is created
- The `path()` function generates the **SVG path string** by:
  1. Iterating through each dimension
  2. Getting the x-position from the dimension axis: `x(p)`
  3. Getting the y-position from the value scale: `y[p](d[p])`
  4. For categorical data, centering the point by adding `bandwidth() / 2`
- All paths are bound to data using `d3.join()`, which handles enter/update/exit automatically
- The lines use a **teal color (#69b3a2)** with **50% opacity** to show overlapping patterns

#### 7. **Drawing Axes and Labels**
```javascript
svg.selectAll("myAxis")
  .data(dimensions).enter()
  .append("g")
  .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
  .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
  .append("text")
    .style("text-anchor", "middle")
    .attr("y", -9)
    .text(function(d) { return d; })
    .style("fill", "black")
```
- For **each dimension**, a group (g) element is created and positioned at the correct x location
- `d3.axisLeft().scale(y[d])` renders the axis with tick marks and labels
- A text label is added above each axis showing the dimension name

### How Dynamic Changes Work

#### **Button Interactions**
```javascript
document.getElementById("btn2012").addEventListener("click", function() {
  loadData("./data/cis-2012.csv");
});
```
- JavaScript event listeners detect button clicks
- Each button triggers `loadData()` with a different CSV file
- The previous visualization is cleared, and a new one is rendered

#### **Responsive Sizing**
```javascript
const container = d3.select("#my_dataviz").node();
const width = container.clientWidth;
const height = container.clientHeight;
```
- The visualization reads the **actual container size** each time data loads
- If the browser window is resized, the graph dynamically adjusts (via CSS `#my_dataviz` sizing)

#### **Dynamic Dimension Handling**
- The code reads **all columns** from the CSV file
- If 2012 has 6 columns and 2019 has 8 columns, the visualization automatically creates the correct number of axes
- Each dataset's unique structure is preserved

### Key Takeaways
1. **D3.js uses a data-binding approach**: bind data → enter → append elements → set attributes
2. **Scales are the bridge**: they map data values to visual properties (position, size, color)
3. **SVG is the canvas**: all visual elements (lines, axes, text) are drawn as SVG primitives
4. **Functions are reusable**: wrapping logic in `loadData()` makes the visualization interactive
5. **Dynamic calculations**: reading container size, detecting data types, and filtering columns make the code flexible and robust