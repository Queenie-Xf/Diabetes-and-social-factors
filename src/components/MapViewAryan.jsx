import React, { useEffect, useMemo, useState } from 'react';
import Map, { Source, Layer, Popup} from 'react-map-gl';
import Papa from 'papaparse';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, ResponsiveContainer } from 'recharts';

const MapView = () => {
  const [year, setYear] = useState(2010);
  const [viewState, setViewState] = useState({ longitude: -98, latitude: 39, zoom: 4 });
  const [allLocations, setAllLocations] = useState([]);
  const [obesityData, setObesityData] = useState([]);
  const [stateA, setStateA] = useState("California");
  const [stateB, setStateB] = useState("Texas");
  const [radiusCenter, setRadiusCenter] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [radiusCounts, setRadiusCounts] = useState({ fastFood: 0, grocery: 0 });
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    Papa.parse(import.meta.env.BASE_URL + 'locations.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data
          .filter(d => d.lat && d.lon && d.Year)
          .map(d => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [parseFloat(d.lon), parseFloat(d.lat)] },
            properties: {
              name: d.name,
              tag: d.Tag?.trim().toLowerCase(),
              state: d.State?.trim(),
              county: d.County?.trim().toLowerCase(),
              year: parseInt(d.Year)
            }
          }));
        setAllLocations(parsed);
      }
    });
  }, []);

  useEffect(() => {
    Papa.parse(import.meta.env.BASE_URL + 'obesity.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setObesityData(data);
      }
    });
  }, []);

  const geojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: allLocations.filter(f => f.properties.year === year)
  }), [allLocations, year]);

  const getObesityRateByState = (stateName, targetYear = year) => {
    if (!stateName || obesityData.length === 0) return "N/A";
    const match = obesityData.find(d =>
      parseInt(d.Year) === targetYear &&
      d.County?.trim().toLowerCase() === stateName.trim().toLowerCase()
    );
    return match ? parseFloat(match.Obesity_Rate).toFixed(2) : "N/A";
  };

  const stateOptions = useMemo(() => {
    const states = new Set(allLocations.map(f => f.properties.state));
    return Array.from(states).sort();
  }, [allLocations]);

  const fastFoodCount = (state, targetYear = year) =>
    allLocations.filter(f => f.properties.state === state && f.properties.tag === "fast food" && f.properties.year === targetYear).length;

  const groceryCount = (state, targetYear = year) =>
    allLocations.filter(f => f.properties.state === state && f.properties.tag === "grocery" && f.properties.year === targetYear).length;

  const fastFoodCountA = fastFoodCount(stateA);
  const fastFoodCountB = fastFoodCount(stateB);
  const groceryCountA = groceryCount(stateA);
  const groceryCountB = groceryCount(stateB);
  const obesityRateA = getObesityRateByState(stateA);
  const obesityRateB = getObesityRateByState(stateB);

  const barChartData = [
    { name: 'Fast Food', [stateA]: fastFoodCountA, [stateB]: fastFoodCountB },
    { name: 'Grocery', [stateA]: groceryCountA, [stateB]: groceryCountB }
  ];

  const scatterFoodDataA = [2010, 2015, 2020, 2025].map(yr => ({
    year: yr,
    fastFood: fastFoodCount(stateA, yr),
    grocery: groceryCount(stateA, yr)
  }));

  const scatterFoodDataB = [2010, 2015, 2020, 2025].map(yr => ({
    year: yr,
    fastFood: fastFoodCount(stateB, yr),
    grocery: groceryCount(stateB, yr)
  }));

  const scatterObesityDataA = [2010, 2015, 2020, 2025].map(yr => ({
    year: yr,
    obesity: getObesityRateByState(stateA, yr)
  }));

  const scatterObesityDataB = [2010, 2015, 2020, 2025].map(yr => ({
    year: yr,
    obesity: getObesityRateByState(stateB, yr)
  }));

  const radiusCircleGeoJSON = useMemo(() => {
    if (!radiusCenter) return null;
    return turf.circle(radiusCenter, radiusKm, { steps: 64, units: 'kilometers' });
  }, [radiusCenter, radiusKm]);

  const updateRadiusCounts = (clickedPoint) => {
    const center = turf.point(clickedPoint);
    const fastFoodNearby = [];
    const groceryNearby = [];

    geojson.features.forEach(f => {
      const dist = turf.distance(center, turf.point(f.geometry.coordinates), { units: 'kilometers' });
      if (dist <= radiusKm) {
        if (f.properties.tag === "fast food") fastFoodNearby.push(f);
        if (f.properties.tag === "grocery") groceryNearby.push(f);
      }
    });

    setRadiusCounts({ fastFood: fastFoodNearby.length, grocery: groceryNearby.length });
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Side - Map */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ maxWidth: '90%', margin: '0 auto', fontSize: '0.95rem' }}>
           This dashboard visualizes how access to fast food and grocery stores may relate to adult obesity rates across U.S. states from 2010 to 2025.
           <br />
           <b>Map points</b>: Locations of fast food (red) and grocery (green) stores.
           <br />
           <b>Radius circle</b>: Click anywhere on the map to see the number of stores within a given distance.
           <br />
           <b>Charts</b>: Compare food access and obesity trends over time between any two states.
           </p>
        </div>

          <label>Year: {year}</label><br />
          <input
            type="range"
            min="2010"
            max="2025"
            step="5"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{ width: '60%' }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <Map
            initialViewState={viewState}
            mapLib={maplibregl}
            interactiveLayerIds={['location-points']}
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            style={{ width: '100%', height: '100%' }}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onClick={(e) => {
              const clicked = [e.lngLat.lng, e.lngLat.lat];
              setRadiusCenter(clicked);
              updateRadiusCounts(clicked);
            }}
            onMouseMove={(event) => {
              const feature = event.features && event.features.find(f => f.layer.id === 'location-points');
              if (feature) {
                setHoverInfo({
                  longitude: event.lngLat.lng,
                  latitude: event.lngLat.lat,
                  name: feature.properties.name,
                  tag: feature.properties.tag
                });
              } else {
                setHoverInfo(null);
              }
            }}
          >
            <Source id="locations" type="geojson" data={geojson}>
              <Layer
                id="location-points"
                type="circle"
                paint={{
                  'circle-radius': 5,
                  'circle-color': [
                    'match',
                    ['get', 'tag'],
                    'fast food', '#ff0000',
                    'grocery', '#00aa00',
                    '#888888'
                  ],
                  'circle-opacity': 0.85,
                  'circle-stroke-color': '#000',
                  'circle-stroke-width': 0.5
                }}
              />
            </Source>

            {radiusCircleGeoJSON && (
              <Source id="radius" type="geojson" data={radiusCircleGeoJSON}>
                <Layer id="radius-fill" type="fill" paint={{ 'fill-color': '#0000ff', 'fill-opacity': 0.1 }} />
                <Layer id="radius-outline" type="line" paint={{ 'line-color': '#0000ff', 'line-width': 2 }} />
              </Source>
            )}

            {/* Hover Popup */}
            {hoverInfo && (
              <Popup
                 longitude = {hoverInfo.longitude}
                 latitude = {hoverInfo.latitude}
                 closeButton = {false}
                 closeOnClick = {false}
                 anchor = "top"
              >
                <div>
                  <strong>{hoverInfo.name}</strong><br />
                  {hoverInfo.tag}
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Radius Control */}
        <div style={{ height: '25%', padding: '1rem', background: '#eef' }}>
          <h4>Accessibility to stores in: </h4>
          <label>Radius: {radiusKm} km</label><br />
          <input
            type="range"
            min="0.5"
            max="50"
            step="0.5"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
            style={{ width: '80%', marginTop: '10px' }}
          />
          <table style={{ marginTop: '10px', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>Type</th><th>Count</th></tr>
            </thead>
            <tbody>
              <tr><td>Fast Food</td><td>{radiusCounts.fastFood}</td></tr>
              <tr><td>Grocery</td><td>{radiusCounts.grocery}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Side - Tables and Charts */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'scroll' }}>
        <div style={{ padding: '1rem' }}>
          <h3>Compare States ({year})</h3>
          <div style={{ marginBottom: '1rem' }}>
            <select value={stateA} onChange={e => setStateA(e.target.value)}>
              {stateOptions.map(s => <option key={s}>{s}</option>)}
            </select>{' '}
            <select value={stateB} onChange={e => setStateB(e.target.value)}>
              {stateOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th></th><th>{stateA}</th><th>{stateB}</th></tr>
            </thead>
            <tbody>
              <tr><td>Fast Food</td><td>{fastFoodCountA}</td><td>{fastFoodCountB}</td></tr>
              <tr><td>Grocery</td><td>{groceryCountA}</td><td>{groceryCountB}</td></tr>
              <tr><td>Obesity Rate</td><td>{obesityRateA}</td><td>{obesityRateB}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Bar Chart */}
        <div style={{ height: 300, padding: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={stateA} fill="#8884d8" />
              <Bar dataKey={stateB} fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Food Growth Line Chart */}
        <div style={{ height: 300, padding: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="year" type="number" domain={[2010, 2025]} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="fastFood" data={scatterFoodDataA} name={`${stateA} Fast Food`} stroke="#ff0000" />
              <Line dataKey="grocery" data={scatterFoodDataA} name={`${stateA} Grocery`} stroke="#00aa00" />
              <Line dataKey="fastFood" data={scatterFoodDataB} name={`${stateB} Fast Food`} stroke="#ff9999" strokeDasharray="3 3" />
              <Line dataKey="grocery" data={scatterFoodDataB} name={`${stateB} Grocery`} stroke="#88cc88" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Obesity Chart */}
        <div style={{ height: 300, padding: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="year" type="number" domain={[2010, 2025]} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="obesity" data={scatterObesityDataA} name={`${stateA} Obesity`} stroke="#0000ff" />
              <Line dataKey="obesity" data={scatterObesityDataB} name={`${stateB} Obesity`} stroke="#8888ff" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MapView;
