import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { fetchStateHospitalData } from '../utils/dataUtils';

const HospitalMap = ({ selectedState, hospitalData, countyData }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stateGeoData, setStateGeoData] = useState(null);

  // Fetch GeoJSON for the selected state
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch GeoJSON for the selected state - using unpkg instead of github
        const stateDataUrl = 'https://unpkg.com/us-atlas@3/counties-10m.json';
        const us = await d3.json(stateDataUrl);
        
        setStateGeoData(us);
        setIsLoading(false);
      } catch (error) {
        console.error(`Error loading ${selectedState} data:`, error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedState]);

  // Render the map when data is loaded
  useEffect(() => {
    if (!hospitalData || !countyData || !stateGeoData || !svgRef.current) return;

    // Set up the SVG dimensions
    const width = 800;
    const height = 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
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

    // Convert TopoJSON to GeoJSON for counties
    const stateCode = selectedState === 'Colorado' ? 'CO' : 'MO';
    const countiesGeo = feature(stateGeoData, stateGeoData.objects.counties);
    
    // Filter counties for the selected state
    const stateCounties = countiesGeo.features.filter(d => 
      d.properties.state === stateCode || d.id.startsWith(stateCode === 'CO' ? '08' : '29')
    );
    
    // Create a color scale based on population
    const populationExtent = d3.extent(countyData, d => d.pop2025);
    const colorScale = d3.scaleSequential()
      .domain(populationExtent)
      .interpolator(d3.interpolateBlues);

    // Set up projection and path generator for the selected state
    const stateFeature = {
      type: "FeatureCollection",
      features: stateCounties
    };
    
    const projection = d3.geoAlbersUsa()
      .fitSize([innerWidth, innerHeight], stateFeature);

    const path = d3.geoPath()
      .projection(projection);

    // Draw the counties with color based on population
    g.selectAll('.county')
      .data(stateCounties)
      .enter()
      .append('path')
      .attr('class', 'county')
      .attr('d', path)
      .attr('fill', d => {
        const fips = d.id;
        const county = countyData.find(c => c.fips === +fips);
        return county ? colorScale(county.pop2025) : '#ccc';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event, d) {
        const fips = d.id;
        const county = countyData.find(c => c.fips === +fips);
        
        d3.select(this)
          .attr('stroke', '#000')
          .attr('stroke-width', 1.5);
        
        tooltip
          .style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px')
          .html(`
            <strong>${county ? county.name : 'Unknown County'}</strong><br/>
            Population (2025): ${county ? county.pop2025.toLocaleString() : 'N/A'}
          `);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5);
        
        tooltip.style('opacity', 0);
      });

    // Add hospital locations as dots
    g.selectAll('.hospital')
      .data(hospitalData)
      .enter()
      .append('circle')
      .attr('class', 'hospital')
      .attr('cx', d => {
        if (!d.coordinates || !Array.isArray(d.coordinates) || d.coordinates.length !== 2) return null;
        const coords = projection(d.coordinates);
        return coords ? coords[0] : null;
      })
      .attr('cy', d => {
        if (!d.coordinates || !Array.isArray(d.coordinates) || d.coordinates.length !== 2) return null;
        const coords = projection(d.coordinates);
        return coords ? coords[1] : null;
      })
      .attr('r', 4)
      .attr('fill', 'red')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('opacity', 0.7)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('r', 6)
          .attr('opacity', 1);
        
        tooltip
          .style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px')
          .html(`
            <strong>${d.name}</strong>
          `);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('r', 4)
          .attr('opacity', 0.7);
        
        tooltip.style('opacity', 0);
      });

    // Add a legend for population
    const legendWidth = 200;
    const legendHeight = 15;
    
    const defs = svg.append('defs');
    
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'population-gradient');
    
    linearGradient.selectAll('stop')
      .data(d3.ticks(0, 1, 10))
      .enter()
      .append('stop')
      .attr('offset', d => d * 100 + '%')
      .attr('stop-color', d => colorScale(d3.interpolate(populationExtent[0], populationExtent[1])(d)));
    
    const legend = svg.append('g')
      .attr('transform', `translate(${margin.left},${height - margin.bottom + 10})`);
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#population-gradient)');
    
    // Add legend labels
    legend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'start')
      .text(d3.format(',.0f')(populationExtent[0]));
    
    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'end')
      .text(d3.format(',.0f')(populationExtent[1]));
    
    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', legendHeight + 30)
      .attr('text-anchor', 'middle')
      .text('Population (2025)');

    // Add a legend for hospitals
    const hospitalLegend = svg.append('g')
      .attr('transform', `translate(${margin.left + legendWidth + 50},${height - margin.bottom + 10})`);
    
    hospitalLegend.append('circle')
      .attr('r', 4)
      .attr('cx', 5)
      .attr('cy', legendHeight / 2)
      .attr('fill', 'red')
      .attr('opacity', 0.7);
    
    hospitalLegend.append('text')
      .attr('x', 15)
      .attr('y', legendHeight / 2 + 5)
      .text('Hospital Location');

  }, [hospitalData, countyData, stateGeoData, selectedState]);

  if (isLoading) {
    return <div>Loading map...</div>;
  }

  return (
    <div className="hospital-map-container">
      <h3>{selectedState} Hospitals and County Populations</h3>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
};

export default HospitalMap; 