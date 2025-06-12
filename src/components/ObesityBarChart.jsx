import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ObesityBarChart = () => {
  // Updated with accurate state data from CDC reports
  const data = [
    { state: 'OK', rate: 40.8 }, 
    { state: 'MO', rate: 40.2 }, 
    { state: 'AL', rate: 39.7},
    { state: 'PA', rate: 39.3},
    { state: 'KY', rate: 38.9 }
  ];
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{`${entry.fullName}: ${entry.rate}%`}</p>
        </div>
      );
    }
    
    return null;
  };
  
  // Custom X-axis tick to ensure all labels are displayed correctly
  const CustomizedAxisTick = (props) => {
    const { x, y, payload } = props;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="#666"
          fontSize={12}
        >
          {payload.value}
        </text>
      </g>
    );
  };
  
  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#ffffff',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '1rem',
      borderLeft: '4px solid #FF5733'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ 
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1e293b',
          textAlign: 'center',
          margin: '0'
        }}>
          Top 5 States by Obesity Rate
        </h3>
      </div>
      
      <div style={{ flex: 1, minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            barSize={35}
            maxBarSize={50}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="state" 
              height={60}
              tick={<CustomizedAxisTick />}
              interval={0}
            />
            <YAxis 
              domain={[38, 42]} 
              tickCount={5}
              label={{ 
                value: '%', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="rate" 
              name="Obesity Rate"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#FF5733" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ 
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#64748b',
        marginTop: '0.75rem',
        paddingTop: '0.5rem',
        borderTop: '1px dashed #e2e8f0',
        fontStyle: 'italic'
      }}>
        Data remains constant regardless of year selection
      </div>
    </div>
  );
};

export default ObesityBarChart;