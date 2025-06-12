import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { aggregateByStateAndYear } from '../utils/dataUtils';

const LineChart = ({ data, metric }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [aggregatedData, setAggregatedData] = useState(null);
  const [selectedStates, setSelectedStates] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);

  // Process and aggregate data when it changes
  useEffect(() => {
    if (!data) return;

    // If the data is already in the right format, use it directly
    if (data.some(d => d.values && Array.isArray(d.values))) {
      setAggregatedData(data);
      setAvailableStates(data.map(d => d.state).sort());
      return;
    }

    // Otherwise, aggregate the data
    const processed = aggregateByStateAndYear(data);
    setAggregatedData(processed);
    
    // Extract available states for selection
    const states = [...new Set(data.map(d => d.state))].sort();
    setAvailableStates(states);
    
    // Select the first 5 states by default
    setSelectedStates(states.slice(0, 5));
  }, [data]);

  // Update the chart when aggregated data or selections change
  useEffect(() => {
    if (!aggregatedData || !svgRef.current) return;

    // Filter data based on selected states
    const filteredData = aggregatedData.filter(d => 
      selectedStates.includes(d.state)
    );

    if (filteredData.length === 0) return;

    // Set up the SVG dimensions
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 80, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear any existing elements
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up the SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create a container group with margin
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a tooltip
    const tooltip = d3.select(tooltipRef.current)
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '3px')
      .style('padding', '5px')
      .style('pointer-events', 'none');

    // Extract all years and values for scaling
    const allYears = new Set();
    const allValues = [];

    filteredData.forEach(stateData => {
      stateData.values.forEach(d => {
        allYears.add(d.year);
        allValues.push(d.value);
      });
    });

    const years = Array.from(allYears).sort((a, b) => a - b);
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(years), d3.max(years)])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allValues) * 1.1]) // Add 10% padding at the top
      .range([innerHeight, 0]);

    // Create the line generator
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Create a color scale for states
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(selectedStates);

    // Add the x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')).ticks(5));
    
    // Add the y-axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale));

    // Add the lines
    const lines = g.selectAll('.line')
      .data(filteredData)
      .enter()
      .append('path')
      .attr('class', 'line')
      .attr('d', d => line(d.values))
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(d.state))
      .attr('stroke-width', 2);

    // Add data points with hover effect
    filteredData.forEach(stateData => {
      g.selectAll(`.point-${stateData.state}`)
        .data(stateData.values)
        .enter()
        .append('circle')
        .attr('class', `point-${stateData.state}`)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', colorScale(stateData.state))
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('r', 6)
            .attr('stroke', '#000')
            .attr('stroke-width', 1);
          
          tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .html(`
              <strong>${stateData.state}</strong><br/>
              Year: ${d.year}<br/>
              ${metric === 'obesity' ? 'Obesity Rate: ' : 'Hospital Count: '}${d.value.toFixed(1)}${metric === 'obesity' ? '%' : ''}
            `);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('r', 4)
            .attr('stroke', 'none');
          
          tooltip.style('opacity', 0);
        });
    });

    // Add a legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right + 10},${margin.top})`);

    filteredData.forEach((d, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0,${i * 20})`);
      
      legendItem.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colorScale(d.state));
      
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 12.5)
        .attr('text-anchor', 'start')
        .text(d.state);
    });

    // Add axis labels
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .text('Year');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .text(metric === 'obesity' ? 'Obesity Rate (%)' : 'Hospital Count');

  }, [aggregatedData, selectedStates, metric]);

  const handleStateSelect = (e) => {
    const selectedState = e.target.value;
    if (selectedState === "") return;
    
    // If we already have 5 states, remove the first one
    if (selectedStates.length >= 5) {
      setSelectedStates([...selectedStates.slice(1), selectedState]);
    } else {
      setSelectedStates([...selectedStates, selectedState]);
    }
  };
  
  const handleStateRemove = (stateToRemove) => {
    setSelectedStates(selectedStates.filter(state => state !== stateToRemove));
  };

  return (
    <div className="line-chart-container">
      <div className="state-selector">
        <div className="selected-states">
          <p>Selected states (max 5):</p>
          <div className="state-tags">
            {selectedStates.map(state => (
              <div key={state} className="state-tag">
                {state}
                <button 
                  className="remove-state" 
                  onClick={() => handleStateRemove(state)}
                  aria-label={`Remove ${state}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="state-dropdown">
          <label htmlFor="state-select">Add a state: </label>
          <select 
            id="state-select" 
            onChange={handleStateSelect} 
            value=""
            disabled={selectedStates.length >= 5}
          >
            <option value="">Select a state</option>
            {availableStates.map(state => (
              !selectedStates.includes(state) && (
                <option key={state} value={state}>
                  {state}
                </option>
              )
            ))}
          </select>
        </div>
      </div>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
};

export default LineChart; 