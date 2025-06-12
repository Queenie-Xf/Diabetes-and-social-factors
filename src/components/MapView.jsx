import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import './MapView.css';

const CompactMapView = ({ data, selectedYear, selectedState, setSelectedState }) => {
  // Use CDN for reliable GeoJSON source
  const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
  
  // Store FIPS to state abbreviation mapping
  const [stateMapping, setStateMapping] = useState({});
  // Store the GeoJSON data
  const [geoData, setGeoData] = useState(null);
  // State for hover info
  const [hoverInfo, setHoverInfo] = useState(null);
  // State for year data
  const [yearData, setYearData] = useState([]);
  
  // Update year data when selectedYear changes
  useEffect(() => {
    // Filter data for the selected year
    const filteredData = data.filter(d => d.Year === selectedYear);
    setYearData(filteredData);
  }, [data, selectedYear]);
  
  // Set up mapping from FIPS codes to state abbreviations
  useEffect(() => {
    const fipsToPostal = {
      "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
      "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
      "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
      "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
      "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
      "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
      "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
      "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
      "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
      "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
      "56": "WY"
    };
    setStateMapping(fipsToPostal);
  }, []);

  // Find maximum value for color scale
  const maxValue = yearData.length > 0 
    ? Math.max(...yearData.map(d => d.No_Public_Coverage_Percent || 0))
    : 70;
  
  // Color scale for the map
  const colorScale = scaleQuantize()
    .domain([0, Math.max(70, maxValue)])
    .range([
      "#f7fbff", "#e3eef9", "#cfe1f2", "#b5d4e9", "#93c3df", 
      "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"
    ]);

  // Get color for a state based on its ID
  const getStateColor = (geo) => {
    // Get the state abbreviation directly from geo.id
    // For TopoJSON from us-atlas, use the mapping
    const stateCode = stateMapping[geo.id] || geo.id;
    
    // Special case for Kentucky to make it yellow
    if (stateCode === "KY") {
      return "#FFC107"; // Amber/yellow color for Kentucky
    }
    
    // Find data for this state
    const stateData = yearData.find(d => d.Region === stateCode);
    
    if (stateData && !isNaN(stateData.No_Public_Coverage_Percent)) {
      return colorScale(stateData.No_Public_Coverage_Percent);
    }
    
    return "#EEE"; // Default color for states without data
  };

  return (
    <div className="compact-map-view">
      <div className="map-title">
        Percentage Without Public Health Coverage ({selectedYear})
      </div>
      
      <div className="compact-map-container">
        {/* Fixed tooltip display */}
        {hoverInfo && (
          <div className="state-info-box">
            <strong>{hoverInfo.state}</strong>: {hoverInfo.value}%
          </div>
        )}
        
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 800
          }}
          className="compact-us-map"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => {
                // Get state abbreviation
                const stateCode = stateMapping[geo.id] || geo.id;
                const isSelected = selectedState === stateCode;
                
                // Get data for this state
                const stateData = yearData.find(d => d.Region === stateCode);
                const percentage = stateData ? 
                  Math.round(stateData.No_Public_Coverage_Percent * 10) / 10 : 
                  'N/A';
                
                return (
                  <Geography
                    key={geo.rsmKey || geo.id}
                    geography={geo}
                    fill={getStateColor(geo)}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 1.5 : 0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#FFD700', cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => {
                      if (stateCode) {
                        setSelectedState(stateCode === selectedState ? null : stateCode);
                      }
                    }}
                    onMouseEnter={() => {
                      if (stateCode && percentage !== null) {
                        setHoverInfo({
                          state: stateCode,
                          value: percentage
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverInfo(null);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      
      <div className="compact-map-legend">
        <div className="legend-title">Percentage Without Public Coverage</div>
        <div className="legend-scale">
          {[0, 10, 20, 30, 40, 50, 60, 70].map((value, index) => (
            <div 
              key={`legend-${index}`}
              className="legend-item"
            >
              <div 
                className="legend-color" 
                style={{ backgroundColor: colorScale(value) }}
              ></div>
              <div className="legend-label">{value}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompactMapView;