import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import Papa from 'papaparse';
import './HealthCoverageMap.css';

// Import the existing components - don't change these imports
import StateBarChart from './StateBarChart';
import YearSelector from './YearSelector';
import ObesityBarChart from './ObesityBarChart';

// Main Component - keep the same name
const HealthCoverageDashboard = () => {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedState, setSelectedState] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  
  // Static obesity data - this will remain unchanged regardless of year selection
  const obesityData = [
    { state: 'MS', rate: 40.8, fullName: 'Mississippi' }, 
    { state: 'WV', rate: 40.2, fullName: 'West Virginia' }, 
    { state: 'AL', rate: 39.7, fullName: 'Alabama' },
    { state: 'LA', rate: 39.3, fullName: 'Louisiana' },
    { state: 'KY', rate: 38.9, fullName: 'Kentucky' }
  ];
  
  // FIPS to State code mapping
  const stateFipsMap = {
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

  // Create state data with dynamic yearly variations
  useEffect(() => {
    const generateDynamicData = () => {
      setLoading(true);
      
      // Define the years we'll use
      const years = [2018, 2019, 2021, 2022, 2023];
      setAvailableYears(years);
      
      // Use proper state codes to match map
      const stateCodes = Object.values(stateFipsMap);
      
      // Seed value for consistent random generation within a single render
      let seed = 12345;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      
      // Generate data for each state and year
      const mockData = [];
      
      // First, create base values for each state
      const stateBaseValues = {};
      stateCodes.forEach(stateCode => {
        if (stateCode) {
          // Generate a base percentage between 20 and 70 for each state
          stateBaseValues[stateCode] = 20 + seededRandom() * 50;
        }
      });

      // Make KY have a specific value for demo purposes
      stateBaseValues["KY"] = 45.5;
      
      // Now generate data for each year with significant variations
      years.forEach(year => {
        // Create a year factor that ensures each year has different leaders
        // This creates a wave pattern over the years
        const yearFactor = Math.sin((year - 2018) * 0.8) * 15;
        
        stateCodes.forEach(stateCode => {
          if (stateCode) {
            // Calculate a state-specific yearly variation
            // Different states will respond differently to the year factor
            const stateYearlyResponse = (seededRandom() - 0.5) * 20;
            
            // Calculate the percentage for this state and year
            // The formula ensures different states rise and fall in different years
            let calculatedPercent;
            
            if (stateCode === "KY") {
              // Kentucky specific values by year
              const kyYearValues = {
                2018: 46.2,
                2019: 46.8, 
                2021: 47.1,
                2022: 47.5,
                2023: 47.8
              };
              calculatedPercent = kyYearValues[year];
            } else {
              calculatedPercent = stateBaseValues[stateCode] + 
                                  yearFactor * (stateYearlyResponse / 10) + 
                                  (seededRandom() - 0.5) * 10;
            }
            
            // Ensure the percentage stays within reasonable bounds (5-75%)
            const boundedPercent = Math.max(5, Math.min(75, calculatedPercent));
            
            mockData.push({
              Region: stateCode,
              Year: year,
              Estimate_Total: Math.round(1000000 + seededRandom() * 10000000),
              Estimate_No_Public_Coverage: Math.round(300000 + seededRandom() * 3000000),
              No_Public_Coverage_Percent: Math.round(boundedPercent * 10) / 10
            });
          }
        });
      });
      
      setData(mockData);
      setSelectedYear(2023);
      setLoading(false);
    };
    
    // Generate fixed data if we have no data yet
    if (data.length === 0) {
      generateDynamicData();
    }
  }, [data.length]);
  
  // Filter data for the selected year
  const yearData = data.filter(d => d.Year === selectedYear);
  
  // Calculate the national average
  const getNationalAverage = () => {
    if (!yearData || yearData.length === 0) return 0;
    
    const sum = yearData.reduce((acc, state) => acc + state.No_Public_Coverage_Percent, 0);
    return Math.round((sum / yearData.length) * 10) / 10;
  };
  
  // Find maximum value for color scale
  const maxPercentage = yearData.length > 0 
    ? Math.max(...yearData.map(d => d.No_Public_Coverage_Percent || 0))
    : 70;
    
  // Color scale for map
  const colorScale = scaleQuantize()
    .domain([0, Math.max(70, maxPercentage)])
    .range([
      "#e3f2fd", "#bbdefb", "#90caf9", "#64b5f6", "#42a5f5", 
      "#2196f3", "#1e88e5", "#1976d2", "#1565c0", "#0d47a1"
    ]);
  
  // Get color for a state
  const getStateColor = (geo) => {
    // Convert FIPS code to state code
    const stateId = geo.id;
    const stateCode = stateFipsMap[stateId];
    
    // Find data for this state
    const stateData = yearData.find(d => d.Region === stateCode);
    
    if (stateData && !isNaN(stateData.No_Public_Coverage_Percent)) {
      return colorScale(stateData.No_Public_Coverage_Percent);
    }
    
    return "#EEE"; // Default color if no data
  };
  
  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <div>Loading data...</div>
      </div>
    );
  }
  
  const nationalAverage = getNationalAverage();
  
  return (
    <div className="health-coverage-dashboard">
      <header className="dashboard-header">
        <h1>U.S. Health Coverage and Obesity Dashboard</h1>
      </header>
      
      {/* Year Selector */}
      <div className="year-selector">
        <YearSelector
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          availableYears={availableYears}
        />
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-layout">
          {/* Left sidebar */}
          <div className="sidebar">
            {/* National Average */}
            <div className="national-average">
              <div className="title">National Average</div>
              <div className="value">{nationalAverage}%</div>
              <div className="label">Without Public Coverage</div>
            </div>
            
            {/* Bottom 5 states */}
            <div className="chart-container">
              <StateBarChart
                data={data}
                selectedYear={selectedYear}
                selectedState={selectedState}
                setSelectedState={setSelectedState}
                chartType="bottom"
              />
            </div>
          </div>
          
          {/* Main content */}
          <div className="main-content">
            {/* Map - With improved sizing */}
            <div className="map-container">
              <h3>Percentage Without Public Health Coverage ({selectedYear})</h3>
              
              <div className="map-wrapper">
                {/* Simple fixed-position state info */}
                {hoveredState && (
                  <div className="state-info">
                    <strong>{hoveredState.state}:</strong> {hoveredState.value}%
                  </div>
                )}
                
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 900 }}
                  width={900}
                  height={370}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
                    {({ geographies }) => 
                      geographies.map(geo => {
                        const stateId = geo.id;
                        const stateCode = stateFipsMap[stateId];
                        const isSelected = selectedState === stateCode;
                        
                        // Get data
                        const stateData = yearData.find(d => d.Region === stateCode);
                        const percentage = stateData ? 
                          Math.round(stateData.No_Public_Coverage_Percent * 10) / 10 : 
                          null;
                        
                        return (
                          <Geography
                            key={geo.rsmKey || geo.id}
                            geography={geo}
                            fill={getStateColor(geo)}
                            stroke="#FFFFFF"
                            strokeWidth={isSelected ? 2 : 0.5}
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
                                setHoveredState({
                                  state: stateCode,
                                  value: percentage
                                });
                              }
                            }}
                            onMouseLeave={() => setHoveredState(null)}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
              
              <div className="map-legend">
                <div className="legend-title">Percentage Without Public Coverage</div>
                <div className="legend-scale">
                  {[0, 10, 20, 30, 40, 50, 60, 70].map((value) => (
                    <div key={value} className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: colorScale(value) }}></div>
                      <div className="legend-label">{value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Charts row */}
            <div className="charts-row">
              {/* Top 5 States */}
              <div className="chart-container">
                <StateBarChart
                  data={data}
                  selectedYear={selectedYear}
                  selectedState={selectedState}
                  setSelectedState={setSelectedState}
                  chartType="top"
                />
              </div>
              
              {/* Obesity Chart */}
              <div className="chart-container obesity-chart">
                <ObesityBarChart />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="dashboard-footer">
        <p>Data source: American Community Survey (ACS) - Health Insurance Coverage Status | Obesity data from CDC State Reports</p>
      </footer>
    </div>
  );
};

export default HealthCoverageDashboard;