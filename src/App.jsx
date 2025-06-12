import React, { useState } from 'react';
import MapView from './components/MapViewAryan';
import USHealthMap from './components/USHealthMap';
import DataDashboard from './components/DataDashboard';
import HealthCoverageMap from './components/HealthCoverageMap';
import Education from './components/Education';

function App() {
  const [activeTab, setActiveTab] = useState('Behavioral Health');

  const renderContent = () => {
    switch (activeTab) {
      case 'Food Access':
        return <MapView year={2010} />;
      case 'Behavioral Health':
        return <USHealthMap />;
      case 'Health Data':
        return <DataDashboard />;
      case 'Health Coverage':
        return <HealthCoverageMap />;
      case 'Education':
        return <Education />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Blue top banner */}
      <div style={{
        backgroundColor: '#007BFF',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px'
      }}>
        <h2 style={{ margin: 0 }}>Peace and Love</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={buttonStyle} onClick={() => setActiveTab('Behavioral Health')}>Behavioral Health</button>
          <button style={buttonStyle} onClick={() => setActiveTab('Food Access')}>Food Access</button>
          <button style={buttonStyle} onClick={() => setActiveTab('Health Data')}>Health Data</button>
          <button style={buttonStyle} onClick={() => setActiveTab('Health Coverage')}>Health Coverage</button>
          <button style={buttonStyle} onClick={() => setActiveTab('Education')}>Education</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '20px' }}>
        <h1 style={{ textAlign: 'center' }}>{activeTab}</h1>
        {renderContent()}
      </div>
    </div>
  );
}

const buttonStyle = {
  backgroundColor: 'white',
  color: '#007BFF',
  border: 'none',
  borderRadius: '5px',
  padding: '8px 12px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

export default App;
