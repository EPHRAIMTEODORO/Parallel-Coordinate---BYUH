// Parallel Coordinates Visualization with D3.js

class ParallelCoordinates {
    constructor() {
        this.data = null;
        this.dimensions = [];
        this.selectedData = null;
        this.margin = { top: 40, right: 20, bottom: 40, left: 60 };
        this.width = document.getElementById('chart').clientWidth - this.margin.left - this.margin.right;
        this.height = document.getElementById('chart').clientHeight - this.margin.top - this.margin.bottom;
        
        // Setup event listeners
        document.getElementById('dataset-2012').addEventListener('click', () => this.loadDataset('2012'));
        document.getElementById('dataset-2019').addEventListener('click', () => this.loadDataset('2019'));
        
        // Initialize with first dataset
        this.loadDataset('2012');
    }

    loadDataset(year) {
        const filename = `data/cis-${year}.csv`;
        d3.csv(filename).then(rawData => {
            this.data = rawData;
            this.selectedData = rawData;
            this.setupDimensions();
            this.render();
        }).catch(error => {
            console.error(`Error loading dataset for ${year}:`, error);
            alert(`Could not load CIS ${year} dataset. Make sure ${filename} exists in the data folder.`);
        });
    }

    setupDimensions() {
        // Get all column names (dimensions)
        if (this.data.length === 0) return;
        
        this.dimensions = Object.keys(this.data[0]).map(d => ({
            name: d,
            type: this.inferType(d),
            scale: null,
            values: null
        }));

        // Setup scales for each dimension
        this.dimensions.forEach(dim => {
            if (dim.type === 'numeric') {
                const values = this.data.map(d => +d[dim.name]).filter(v => !isNaN(v));
                const min = d3.min(values);
                const max = d3.max(values);
                dim.scale = d3.scaleLinear()
                    .domain([min, max])
                    .range([this.height, 0]);
                dim.values = values;
            } else {
                const uniqueValues = [...new Set(this.data.map(d => d[dim.name]))];
                dim.scale = d3.scalePoint()
                    .domain(uniqueValues)
                    .range([this.height, 0]);
                dim.values = uniqueValues;
            }
        });
    }

    inferType(columnName) {
        // Simple type inference - check first few values
        const samples = this.data.slice(0, Math.min(5, this.data.length)).map(d => d[columnName]);
        const numericCount = samples.filter(v => !isNaN(parseFloat(v))).length;
        return numericCount > samples.length * 0.7 ? 'numeric' : 'nominal';
    }

    render() {
        // Clear previous chart
        d3.select('#chart').selectAll('*').remove();

        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

        // Draw lines for each data row
        const lineGroup = svg.append('g').attr('class', 'lines');
        
        this.selectedData.forEach((row, idx) => {
            const pathData = this.dimensions.map((dim, i) => {
                const x = (this.width / (this.dimensions.length - 1)) * i;
                const y = dim.scale(dim.type === 'numeric' ? +row[dim.name] : row[dim.name]);
                return [x, y];
            });

            const line = d3.line();
            lineGroup.append('path')
                .attr('class', 'line')
                .attr('d', line(pathData))
                .attr('data-row-index', idx)
                .on('mouseover', (event) => this.onLineHover(event, row))
                .on('mouseleave', () => this.onLineLeave());
        });

        // Draw axes
        this.dimensions.forEach((dim, i) => {
            const xPos = (this.width / (this.dimensions.length - 1)) * i;
            const axisGroup = svg.append('g')
                .attr('class', 'axis')
                .attr('transform', `translate(${xPos}, 0)`);

            // Axis line
            axisGroup.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 0)
                .attr('y2', this.height)
                .attr('stroke', '#999')
                .attr('stroke-width', 1);

            // Axis label
            axisGroup.append('text')
                .attr('class', 'axis-label')
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text(dim.name);

            // Tick labels
            if (dim.type === 'numeric') {
                const tickValues = dim.scale.ticks(4);
                axisGroup.selectAll('.tick-label')
                    .data(tickValues)
                    .enter()
                    .append('text')
                    .attr('class', 'axis-tick')
                    .attr('y', d => dim.scale(d))
                    .attr('x', -5)
                    .attr('text-anchor', 'end')
                    .attr('alignment-baseline', 'middle')
                    .text(d => d.toFixed(2));
            } else {
                axisGroup.selectAll('.tick-label')
                    .data(dim.values)
                    .enter()
                    .append('text')
                    .attr('class', 'axis-tick')
                    .attr('y', d => dim.scale(d))
                    .attr('x', -5)
                    .attr('text-anchor', 'end')
                    .attr('alignment-baseline', 'middle')
                    .text(d => d);
            }
        });

        // Add brushing capability
        this.addBrushing(svg);
    }

    onLineHover(event, row) {
        const tooltip = document.getElementById('tooltip');
        const mousePos = d3.pointer(event);
        
        // Create tooltip content
        let content = '<strong>Data Values:</strong><br>';
        this.dimensions.forEach(dim => {
            content += `${dim.name}: ${row[dim.name]}<br>`;
        });
        
        tooltip.innerHTML = content;
        tooltip.classList.add('visible');
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';

        // Highlight this line
        d3.selectAll('.line').classed('highlighted', false);
        d3.select(event.target).classed('highlighted', true);
    }

    onLineLeave() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('visible');
        
        d3.selectAll('.line').classed('highlighted', false);
    }

    addBrushing(svg) {
        const brush = d3.brush()
            .on('brush', (event) => this.onBrush(event))
            .on('end', (event) => this.onBrushEnd(event));

        svg.append('g')
            .attr('class', 'brush')
            .call(brush)
            .attr('style', 'pointer-events: all');
    }

    onBrush(event) {
        if (!event.selection) return;
        
        const [[x0, y0], [x1, y1]] = event.selection;
        
        d3.selectAll('.line').classed('faded', d => {
            // Check if line passes through brushed region
            // This is simplified - you may want more sophisticated collision detection
            return true; // Placeholder
        });
    }

    onBrushEnd(event) {
        // Update selected data based on brush
        // TODO: Implement proper brushing logic
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParallelCoordinates();
});
