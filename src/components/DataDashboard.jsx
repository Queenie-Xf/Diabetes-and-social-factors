import React, { useState, useEffect } from 'react';
import ChoroplethMap from './ChoroplethMap';
import LineChart from './LineChart';
import HospitalMap from './HospitalMap';
import {
  fetchObesityData,
  fetchHospitalData,
  fetchStateHospitalData,
  fetchCountyData
} from '../utils/dataUtils';

const DataDashboard = () => {
  const [obesityData, setObesityData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [stateHospitalData, setStateHospitalData] = useState(null);
  const [selectedState, setSelectedState] = useState('Colorado');
  const [countyData, setCountyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [componentErrors, setComponentErrors] = useState({
    obesity: null,
    hospital: null,
    state: null,
    county: null
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const newErrors = { ...componentErrors };
        let newObesityData = [];
        let newHospitalData = [];
        let newStateHospitalData = [];
        let newCountyData = [];

        try {
          const obesityResults = await fetchObesityData();
          newObesityData = obesityResults;
          setObesityData(obesityResults);
          newErrors.obesity = obesityResults?.length ? null : "Could not load obesity data";
        } catch {
          newErrors.obesity = "Error loading obesity data";
        }

        try {
          const hospitalResults = await fetchHospitalData();
          newHospitalData = hospitalResults;
          setHospitalData(hospitalResults);
          newErrors.hospital = hospitalResults?.length ? null : "Could not load hospital data";
        } catch {
          newErrors.hospital = "Error loading hospital data";
        }

        try {
          const stateHospitals = await fetchStateHospitalData(selectedState);
          newStateHospitalData = stateHospitals;
          setStateHospitalData(stateHospitals);
          newErrors.state = stateHospitals?.length ? null : `Could not load hospital data for ${selectedState}`;
        } catch {
          newErrors.state = `Error loading hospital data for ${selectedState}`;
        }

        try {
          const counties = await fetchCountyData(selectedState);
          newCountyData = counties;
          setCountyData(counties);
          newErrors.county = counties?.length ? null : `Could not load county data for ${selectedState}`;
        } catch {
          newErrors.county = `Error loading county data for ${selectedState}`;
        }

        setComponentErrors(newErrors);
        setIsLoading(false);

        const hasAnyData = newObesityData.length || newHospitalData.length || newStateHospitalData.length || newCountyData.length;
        if (!hasAnyData) setError('Failed to load any data. Please check your network connection and try again.');
        else setError(null);
      } catch {
        setError('An unexpected error occurred. Please try again later.');
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedState]);

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
  };

  if (isLoading) return <div className="loading">Loading data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-container" style={{ padding: '20px' }}>
      <header className="dashboard-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>U.S. Obesity and Hospital Data Dashboard</h1>
      </header>

      {/* First Row: Choropleth Map */}
      <section style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2>National Health Data Map</h2>
        {componentErrors.obesity && componentErrors.hospital ? (
          <div className="map-error">
            <p>Could not load national map data</p>
            <p>Please check your network connection and refresh the page</p>
          </div>
        ) : (
          <ChoroplethMap
            data={obesityData || []}
            hospitalData={hospitalData || []}
            mapType="national"
          />
        )}
      </section>

      {/* Second Row: Line Chart + Hospital Map */}
      <section style={{ display: 'flex', gap: '2rem' }}>
        {/* Line Chart */}
        <div style={{ flex: 1 }}>
          <h2>Trends Over Time</h2>
          <h3>Obesity Rates Trends</h3>
          {componentErrors.obesity ? (
            <div className="map-error">
              <p>Could not load obesity trend data</p>
              <p>Please check your network connection and refresh the page</p>
            </div>
          ) : (
            <LineChart data={obesityData || []} metric="obesity" />
          )}
        </div>

        {/* State Hospital Map */}
        <div style={{ flex: 1 }}>
          <h2>Hospital Locations by State</h2>
          <select value={selectedState} onChange={handleStateChange} style={{ marginBottom: '1rem' }}>
            <option value="Colorado">Colorado</option>
            <option value="Missouri">Missouri</option>
          </select>
          {(componentErrors.state || componentErrors.county) ? (
            <div className="map-error">
              <p>Could not load {selectedState} map data</p>
              <p>Please check your network connection and refresh the page</p>
            </div>
          ) : (
            <HospitalMap
              selectedState={selectedState}
              hospitalData={stateHospitalData || []}
              countyData={countyData || []}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default DataDashboard;
