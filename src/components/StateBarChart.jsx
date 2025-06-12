import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './StateBarChart.css';

const StateBarChart = ({ data, selectedYear, selectedState, setSelectedState, chartType }) => {
  const [chartData, setChartData] = useState([]);
  
  // Use useEffect to update chart data when selectedYear changes
  useEffect(() => {
    // Filter data for the selected year
    const yearData = data.filter(d => d.Year === selectedYear);
    
    // Prepare chart data based on filtered data
    let preparedData = yearData.map(d => ({
      stateCode: d.Region,
      value: d.No_Public_Coverage_Percent || 0
    }));
    
    // Sort data based on the chart type
    if (chartType === 'top') {
      preparedData = preparedData
        .sort((a, b) => b.value - a.value) // Sort descending for top states
        .slice(0, 5); // Take only top 5
    } else if (chartType === 'bottom') {
      preparedData = preparedData
        .sort((a, b) => a.value - b.value) // Sort ascending for bottom states
        .slice(0, 5); // Take only bottom 5
    }
    
    // Update state with prepared data
    setChartData(preparedData);
  }, [data, selectedYear, chartType]); // Re-run effect when these dependencies change
  
  // Determine chart title
  const getChartTitle = () => {
    if (chartType === 'top') {
      return 'Top 5 States Without Public Coverage';
    } else if (chartType === 'bottom') {
      return 'Bottom 5 States Without Public Coverage';
    }
    return 'States Without Public Coverage';
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`State: ${payload[0].payload.stateCode}`}</p>
          <p className="tooltip-value">
            {`Without Public Coverage: ${payload[0].value.toFixed(1)}%`}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Get bar color based on chart type
  const getBarColor = () => {
    return chartType === 'top' ? '#1976d2' : '#66bb6a';
  };
  
  // Render vertical bar chart for top states
  const renderVerticalBarChart = () => {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="stateCode" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 70]} 
            label={{ value: '%', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill={getBarColor()}
            onClick={(data) => {
              setSelectedState(data.stateCode === selectedState ? null : data.stateCode);
            }}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.stateCode === selectedState ? '#FF8C00' : getBarColor()} 
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render horizontal bar chart for bottom states
  const renderHorizontalBarChart = () => {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" domain={[0, 70]} />
          <YAxis 
            type="category" 
            dataKey="stateCode" 
            tick={{ fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill={getBarColor()}
            onClick={(data) => {
              setSelectedState(data.stateCode === selectedState ? null : data.stateCode);
            }}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.stateCode === selectedState ? '#FF8C00' : getBarColor()} 
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  return (
    <div className="state-bar-chart">
      <div className="chart-header">
        <h3 className="chart-title">{getChartTitle()}</h3>
      </div>
      
      <div className="chart-container">
        {chartType === 'top' ? renderVerticalBarChart() : renderHorizontalBarChart()}
      </div>
      
      <div className="chart-instructions">
        {chartType === 'top' ? 
          'Showing states with highest percentages without public coverage' : 
          'Showing states with lowest percentages without public coverage'}
      </div>
    </div>
  );
};

export default StateBarChart;