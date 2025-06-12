import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { getValueDomain, getColorScale } from '../utils/dataUtils';

const ChoroplethMap = ({ data, hospitalData, mapType = 'national' }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [usGeoData, setUsGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState('obesity'); // 'obesity' or 'hospitals'
  const [selectedYear, setSelectedYear] = useState(null); // Start with null to select latest year
  const [availableYears, setAvailableYears] = useState([]);
  const [error, setError] = useState(null);
  const [stateCodeMapping, setStateCodeMapping] = useState(null);

  // Extract available years from data
  useEffect(() => {
    if (data && data.length > 0) {
      // Get all unique years, including years from 2011 to 2023
      const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
      console.log("All available years from data:", years);
      
      setAvailableYears(years);
      
      // Set the default selected year to the most recent year
      if (years.length > 0 && !selectedYear) {
        const latestYear = years[years.length - 1];
        console.log("Setting latest year as default:", latestYear);
        setSelectedYear(latestYear);
      }
    }
  }, [data, selectedYear]);

  // Fetch US geographic data and state code mapping when the component mounts
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching US map data...");
        
        // Load state code mapping
        const stateMapping = {
          "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", 
          "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", 
          "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", 
          "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", 
          "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", 
          "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", 
          "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", 
          "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", 
          "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", 
          "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", 
          "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", 
          "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", 
          "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
        };
        setStateCodeMapping(stateMapping);
        
        // Load US map data
        const us = await d3.json('https://unpkg.com/us-atlas@3/states-10m.json');
        console.log("US map data loaded:", us ? "success" : "failed");
        
        if (us && us.objects && us.objects.states) {
          // Extract state names and codes for debugging
          const statesGeo = feature(us, us.objects.states);
          console.log(`Loaded ${statesGeo.features.length} state features`);
          
          // Log a few state features for debugging
          console.log("Sample state features:");
          statesGeo.features.slice(0, 3).forEach(feature => {
            console.log(`State: ${feature.properties.name}, ID: ${feature.id}`);
          });
          
          // Specifically log PA and KY features
          const paFeature = statesGeo.features.find(f => f.properties.name === "Pennsylvania");
          const kyFeature = statesGeo.features.find(f => f.properties.name === "Kentucky");
          console.log("Pennsylvania feature:", paFeature ? `ID: ${paFeature.id}` : "Not found");
          console.log("Kentucky feature:", kyFeature ? `ID: ${kyFeature.id}` : "Not found");
          
          setUsGeoData(us);
          setIsLoading(false);
        } else {
          console.error("Invalid US map data format");
          setError("Failed to load US map data - invalid format");
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading US map data:', error);
        setError('Failed to load US map data');
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, []);

  // Draw the map when data, geo data, or selected year changes
  useEffect(() => {
    if (!usGeoData || !svgRef.current || !stateCodeMapping) {
      console.log("Missing required data:", { 
        hasGeoData: !!usGeoData, 
        hasSvgRef: !!svgRef.current,
        hasStateMapping: !!stateCodeMapping
      });
      return;
    }

    console.log("Rendering map with data:", {
      hasObesityData: data ? data.length : 0,
      hasHospitalData: hospitalData ? hospitalData.length : 0,
      displayMode,
      selectedYear,
      availableYears: availableYears.length > 0 ? `${availableYears[0]}-${availableYears[availableYears.length-1]}` : "none"
    });

    // Process data based on display mode
    let processedData = [];
    let domain = [0, 100];
    let colorScale;
    let legendTitle = '';
    let legendFormat = '';
    
    // Set up the SVG dimensions
    const width = 800;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 80, left: 40 }; // Increased bottom margin for slider
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    try {
      if (displayMode === 'obesity' && data && data.length > 0) {
        console.log("Processing obesity data for year:", selectedYear);
        
        // Filter data for the selected year
        const yearData = data.filter(d => d.year === selectedYear);
        console.log(`Found ${yearData.length} records for year ${selectedYear}`);
        
        // Check for PA and KY in the filtered data
        const paData = yearData.filter(d => d.state === "PA");
        const kyData = yearData.filter(d => d.state === "KY");
        console.log(`Year ${selectedYear} data: ${paData.length} records for PA, ${kyData.length} records for KY`);
        console.log("PA data sample:", paData.length > 0 ? paData[0] : "None");
        console.log("KY data sample:", kyData.length > 0 ? kyData[0] : "None");
        
        // Use the data for the selected year directly (no need to find latest year per state)
        processedData = yearData;
        
        // Get the value domain and create a color scale
        domain = getValueDomain(processedData);
        colorScale = getColorScale(domain.reverse()); // Reverse to make high values red
        legendTitle = 'Obesity Rate';
        legendFormat = '0.1f';
      } else if (displayMode === 'hospitals' && hospitalData && hospitalData.length > 0) {
        console.log("Processing hospital data");
        
        // Check for PA and KY in the hospital data
        const paHospitals = hospitalData.filter(d => d.state === "PA");
        const kyHospitals = hospitalData.filter(d => d.state === "KY");
        console.log(`Found ${paHospitals.length} hospitals for PA, ${kyHospitals.length} hospitals for KY`);
        
        // Group hospital data by state and count hospitals per state
        const stateHospitalCounts = d3.rollup(
          hospitalData.filter(h => h && h.state), 
          v => v.length, 
          d => d.state
        );
        
        // Convert to array format for visualization
        processedData = Array.from(stateHospitalCounts, ([state, count]) => ({
          state,
          value: count
        }));
        
        console.log(`Processed ${processedData.length} states for hospital data`);
        
        // Specifically check the final processed hospital data for PA and KY
        const paHospitalProcessed = processedData.find(d => d.state === "PA");
        const kyHospitalProcessed = processedData.find(d => d.state === "KY");
        console.log("Final PA hospital count:", paHospitalProcessed ? paHospitalProcessed.value : "Not found");
        console.log("Final KY hospital count:", kyHospitalProcessed ? kyHospitalProcessed.value : "Not found");
        
        // Set domain for hospital counts
        domain = [0, d3.max(processedData, d => d.value) || 100];
        colorScale = d3.scaleSequential()
          .domain(domain)
          .interpolator(d3.interpolateBlues);
        legendTitle = 'Hospital Count';
        legendFormat = ',d';
      }
    } catch (err) {
      console.error("Error processing data:", err);
      setError("Error processing data: " + err.message);
    }
    
    // Use default color scale if none was created
    if (!colorScale) {
      colorScale = d3.scaleSequential()
        .domain([0, 100])
        .interpolator(displayMode === 'obesity' ? d3.interpolateRdYlBu : d3.interpolateBlues);
      legendTitle = displayMode === 'obesity' ? 'Obesity Rate' : 'Hospital Count';
      legendFormat = displayMode === 'obesity' ? '0.1f' : ',d';
    }
    
    // Clear any existing elements
    d3.select(svgRef.current).selectAll('*').remove();

    try {
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

      // Convert TopoJSON to GeoJSON
      const states = feature(usGeoData, usGeoData.objects.states);
      console.log(`Working with ${states.features.length} state features`);

      // Create a mapping from state id to state abbreviation
      const stateIdToCode = new Map();
      states.features.forEach(feature => {
        // Find the state abbreviation based on the state name
        const stateName = feature.properties.name;
        for (const [code, name] of Object.entries(stateCodeMapping)) {
          if (name === stateName) {
            stateIdToCode.set(feature.id, code);
            break;
          }
        }
      });
      
      console.log(`Created mapping for ${stateIdToCode.size} states`);
      
      // Specifically log PA and KY mappings
      const paId = states.features.find(f => f.properties.name === "Pennsylvania")?.id;
      const kyId = states.features.find(f => f.properties.name === "Kentucky")?.id;
      console.log(`PA ID: ${paId}, maps to code: ${stateIdToCode.get(paId)}`);
      console.log(`KY ID: ${kyId}, maps to code: ${stateIdToCode.get(kyId)}`);

      // Set up projection and path generator
      const projection = d3.geoAlbersUsa()
        .fitSize([innerWidth, innerHeight], states);

      const path = d3.geoPath()
        .projection(projection);

      // Draw the map
      g.selectAll('path')
        .data(states.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => {
          if (!processedData || processedData.length === 0) return '#ccc';
          
          // Get state code from the mapping
          const stateCode = stateIdToCode.get(d.id);
          
          if (!stateCode) {
            console.log(`No state code found for feature with id ${d.id}`);
            return '#ccc';
          }
          
          // Add specific debug for PA and KY
          if (d.properties.name === "Pennsylvania" || d.properties.name === "Kentucky") {
            console.log(`Filling ${d.properties.name} (${stateCode}) with id ${d.id} for year ${selectedYear}`);
          }
          
          // Find matching data for this state
          const stateData = processedData.find(s => s && s.state === stateCode);
          
          if (!stateData) {
            // Debug output for missing state data
            if (displayMode === 'obesity' && processedData.length > 0) {
              console.log(`No obesity data for state ${stateCode} (${d.properties.name}) in year ${selectedYear}`);
            }
            return '#ccc'; // Use light gray for missing data
          }
          
          // Add specific debug for PA and KY values
          if (d.properties.name === "Pennsylvania" || d.properties.name === "Kentucky") {
            console.log(`${d.properties.name} value for year ${selectedYear}: ${stateData.value}, color: ${colorScale(stateData.value)}`);
          }
          
          return colorScale(stateData.value);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
          if (!processedData || processedData.length === 0) return;
          
          const stateCode = stateIdToCode.get(d.id);
          const stateData = processedData.find(s => s && s.state === stateCode);
          
          d3.select(this)
            .attr('stroke', '#000')
            .attr('stroke-width', 1.5);
          
          tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .html(`
              <strong>${d.properties.name}</strong><br/>
              ${stateData 
                ? displayMode === 'obesity' 
                  ? `Obesity Rate (${selectedYear}): ${stateData.value.toFixed(1)}%` 
                  : `Hospitals: ${stateData.value.toLocaleString()}`
                : displayMode === 'obesity' 
                  ? `No obesity data for ${selectedYear}` 
                  : 'No hospital data'}
            `);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5);
          
          tooltip.style('opacity', 0);
        });

      // Create an enhanced legend
      const legendWidth = 300;
      const legendHeight = 15;
      const legendY = height - margin.bottom + 10;
      
      // Create a legend container with a border
      const legendContainer = svg.append('g')
        .attr('transform', `translate(${margin.left},${legendY})`);
      
      legendContainer.append('rect')
        .attr('width', legendWidth + 50) // Extra space for title
        .attr('height', 60)
        .attr('fill', '#f8f9fa')
        .attr('stroke', '#dee2e6')
        .attr('stroke-width', 1)
        .attr('rx', 5)
        .attr('ry', 5);
      
      // Add legend title
      legendContainer.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .text(legendTitle);
      
      // Create the color gradient
      const defs = svg.append('defs');
      
      const linearGradient = defs.append('linearGradient')
        .attr('id', `linear-gradient-${displayMode}`);
      
      linearGradient.selectAll('stop')
        .data(d3.ticks(0, 1, 10))
        .enter()
        .append('stop')
        .attr('offset', d => d * 100 + '%')
        .attr('stop-color', d => colorScale(d3.interpolate(domain[0], domain[1])(d)));
      
      // Draw the color bar
      legendContainer.append('rect')
        .attr('x', 10)
        .attr('y', 30)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#linear-gradient-${displayMode})`);
      
      // Add tick marks
      const legendScale = d3.scaleLinear()
        .domain(domain)
        .range([0, legendWidth]);
      
      const tickValues = displayMode === 'obesity' 
        ? d3.ticks(domain[0], domain[1], 5) 
        : d3.ticks(0, domain[1], 5);
      
      const legendAxis = d3.axisBottom(legendScale)
        .tickValues(tickValues)
        .tickFormat(d => {
          const format = d3.format(legendFormat);
          return displayMode === 'obesity' ? format(d) + '%' : format(d);
        });
      
      legendContainer.append('g')
        .attr('transform', `translate(10, ${30 + legendHeight})`)
        .call(legendAxis);
      
      // Add contextual information about the data
      const dataYear = displayMode === 'obesity' && processedData.length > 0
        ? selectedYear
        : 2022; // Hospital data is from 2022
      
      legendContainer.append('text')
        .attr('x', legendWidth / 2 + 10)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#666')
        .text(`Data from ${dataYear}`);

      // Add toggle buttons
      const buttonGroup = svg.append('g')
        .attr('transform', `translate(${width - 180}, 20)`);
      
      const buttonWidth = 140;
      const buttonHeight = 30;
      const buttonRadius = 5;
      
      // Button container with border
      buttonGroup.append('rect')
        .attr('width', buttonWidth + 20)
        .attr('height', 2 * buttonHeight + 30)
        .attr('rx', buttonRadius + 2)
        .attr('ry', buttonRadius + 2)
        .attr('fill', '#f8f9fa')
        .attr('stroke', '#dee2e6')
        .attr('stroke-width', 1);
      
      // Label for buttons
      buttonGroup.append('text')
        .attr('x', buttonWidth / 2 + 10)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Display Option');
      
      // Obesity button
      const obesityButton = buttonGroup.append('g')
        .attr('transform', `translate(10, 30)`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          setDisplayMode('obesity');
        });
      
      obesityButton.append('rect')
        .attr('width', buttonWidth)
        .attr('height', buttonHeight)
        .attr('rx', buttonRadius)
        .attr('ry', buttonRadius)
        .attr('fill', displayMode === 'obesity' ? '#4299e1' : '#e2e8f0')
        .attr('stroke', '#cbd5e0');
      
      obesityButton.append('text')
        .attr('x', buttonWidth / 2)
        .attr('y', buttonHeight / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', displayMode === 'obesity' ? 'white' : 'black')
        .text('Obesity Rate (%)');
      
      // Hospital button
      const hospitalButton = buttonGroup.append('g')
        .attr('transform', `translate(10, ${buttonHeight + 40})`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          setDisplayMode('hospitals');
        });
      
      hospitalButton.append('rect')
        .attr('width', buttonWidth)
        .attr('height', buttonHeight)
        .attr('rx', buttonRadius)
        .attr('ry', buttonRadius)
        .attr('fill', displayMode === 'hospitals' ? '#4299e1' : '#e2e8f0')
        .attr('stroke', '#cbd5e0');
      
      hospitalButton.append('text')
        .attr('x', buttonWidth / 2)
        .attr('y', buttonHeight / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', displayMode === 'hospitals' ? 'white' : 'black')
        .text('Hospital Count');

      // Add year slider if we're in obesity mode and we have multiple years
      if (displayMode === 'obesity' && availableYears.length > 1) {
        const sliderHeight = 60;
        const sliderY = height - sliderHeight;
        
        // Create a slider container
        const sliderContainer = svg.append('g')
          .attr('transform', `translate(${margin.left}, ${sliderY})`);
        
        // Add a background for the slider
        sliderContainer.append('rect')
          .attr('width', innerWidth)
          .attr('height', sliderHeight)
          .attr('fill', '#f8f9fa')
          .attr('stroke', '#dee2e6')
          .attr('stroke-width', 1)
          .attr('rx', 5)
          .attr('ry', 5);
        
        // Add title for the slider
        sliderContainer.append('text')
          .attr('x', 10)
          .attr('y', 20)
          .attr('font-weight', 'bold')
          .attr('font-size', '14px')
          .text('Select Year');
        
        // Create the scale for the slider
        const sliderScale = d3.scalePoint()
          .domain(availableYears)
          .range([20, innerWidth - 40])
          .padding(0.5);
        
        // Create the slider track
        sliderContainer.append('line')
          .attr('x1', sliderScale.range()[0])
          .attr('x2', sliderScale.range()[1])
          .attr('y1', 40)
          .attr('y2', 40)
          .attr('stroke', '#aaa')
          .attr('stroke-width', 2);
        
        // Add tick marks for each year
        availableYears.forEach(year => {
          sliderContainer.append('line')
            .attr('x1', sliderScale(year))
            .attr('x2', sliderScale(year))
            .attr('y1', 35)
            .attr('y2', 45)
            .attr('stroke', year === selectedYear ? '#4299e1' : '#aaa')
            .attr('stroke-width', 1);
          
          sliderContainer.append('text')
            .attr('x', sliderScale(year))
            .attr('y', 55)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', year === selectedYear ? '#4299e1' : '#666')
            .text(year);
        });
        
        // Create click areas for each year
        availableYears.forEach(year => {
          sliderContainer.append('rect')
            .attr('x', sliderScale(year) - 15)
            .attr('y', 30)
            .attr('width', 30)
            .attr('height', 20)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer')
            .on('click', () => {
              if (year !== selectedYear) {
                setSelectedYear(year);
              }
            });
        });
        
        // Create the slider handle
        // eslint-disable-next-line no-unused-vars
        const handle = sliderContainer.append('circle')
          .attr('r', 8)
          .attr('cx', sliderScale(selectedYear))
          .attr('cy', 40)
          .attr('fill', '#4299e1')
          .attr('cursor', 'pointer')
          .call(d3.drag()
            .on('drag', function(event) {
              const mouseX = event.x;
              
              // Find the closest year based on x position
              let minDistance = Infinity;
              let closestYear = selectedYear;
              
              availableYears.forEach(year => {
                const yearX = sliderScale(year);
                const distance = Math.abs(mouseX - yearX);
                
                if (distance < minDistance) {
                  minDistance = distance;
                  closestYear = year;
                }
              });
              
              // Update the handle position
              d3.select(this).attr('cx', sliderScale(closestYear));
              
              // Update the selected year if it's different
              if (closestYear !== selectedYear) {
                setSelectedYear(closestYear);
              }
            })
          );
        
        // Show the current year above the handle
        sliderContainer.append('text')
          .attr('x', sliderScale(selectedYear))
          .attr('y', 30)
          .attr('text-anchor', 'middle')
          .attr('font-weight', 'bold')
          .attr('font-size', '12px')
          .attr('fill', '#4299e1')
          .text(selectedYear);
      }

      // Add a caption explaining the map
      svg.append('text')
        .attr('x', margin.left + 10)
        .attr('y', margin.top - 5)
        .attr('font-size', '12px')
        .attr('fill', '#666')
        .text(`This map shows ${displayMode === 'obesity' ? `obesity rates for ${selectedYear}` : 'hospital counts'} by state. ${availableYears.length > 1 ? 'Use the slider to view different years.' : ''}`);

    } catch (err) {
      console.error("Error rendering map:", err);
      setError("Error rendering map: " + err.message);
    }

  }, [data, hospitalData, usGeoData, displayMode, selectedYear, stateCodeMapping, availableYears]);

  if (isLoading) {
    return <div>Loading map...</div>;
  }

  if (error) {
    return (
      <div className="map-error">
        <p>{error}</p>
        <p>Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="choropleth-map-container">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
};

export default ChoroplethMap; 