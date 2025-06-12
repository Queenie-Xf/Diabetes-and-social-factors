import React from 'react';
import './YearSelector.css';

const YearSelector = ({ selectedYear, setSelectedYear, availableYears }) => {
  // Sort years in ascending order
  const sortedYears = [...availableYears].sort((a, b) => a - b);
  
  return (
    <div className="year-selector-compact">
      <div className="selector-container">
        <div className="year-selector-label">Select Year:</div>
        
        <div className="year-buttons">
          {sortedYears.map(year => (
            <button
              key={`year-${year}`}
              className={`year-button ${year === selectedYear ? 'active' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      
      <div className="current-year-display">
        Current Year: <span className="current-year">{selectedYear}</span>
      </div>
    </div>
  );
};

export default YearSelector;