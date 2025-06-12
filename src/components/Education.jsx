import React, { useState, useEffect } from "react";
import AgeGroupSelector from "./AgeGroupSelector";
import ObesityMap from "./ObesityMap";
import SidebarInfo from "./SidebarInfo";

const questionLabelMap = {
  "Obesity": "Obesity Rate",
  "Overweight": "Overweight Rate",
  "No leisure activity": "Physically Inactive"
};

function App() {
  const [selectedAge, setSelectedAge] = useState("18–24");
  const [selectedYear, setSelectedYear] = useState(2023);
  const [hoveredState, setHoveredState] = useState(null);
  const [comparisonState, setComparisonState] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState("Obesity");

  const [obesityData, setObesityData] = useState({});
  const [educationData, setEducationData] = useState({});
  const [multiLayerData, setMultiLayerData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const obesityRes = await fetch(`${import.meta.env.BASE_URL}obesity_agegroup_data.json`);
      const educationRes = await fetch(`${import.meta.env.BASE_URL}education_by_state_years.json`);
      const multiLayerRes = await fetch(`${import.meta.env.BASE_URL}multi_layer_agegroup_data.json`);

      setObesityData(await obesityRes.json());
      setEducationData(await educationRes.json());
      setMultiLayerData(await multiLayerRes.json());
    };
    fetchData();
  }, []);

  const years = [2019, 2020, 2021, 2022, 2023];
  const filteredObesity = obesityData[selectedAge]?.filter(d => d.year === selectedYear) || [];
  const stateOptions = Array.from(new Set(filteredObesity.map(d => d.state))).sort();
  const layerOptions = Object.keys(multiLayerData[selectedAge] || {});
  const layerData = (multiLayerData[selectedAge]?.[selectedLayer] || []).filter(d => d.year === selectedYear);

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div style={{ flex: 1 }}>
        <div style={{ padding: "1rem" }}>
          <AgeGroupSelector selected={selectedAge} onChange={setSelectedAge} />

          <label htmlFor="year">Select Year: </label>
          <input
            type="range"
            min={2019}
            max={2023}
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            step={1}
          />
          <span style={{ marginLeft: "0.5rem" }}>{selectedYear}</span>

          <div style={{ marginTop: "1rem" }}>
            <label htmlFor="compare">Compare to state: </label>
            <select id="compare" value={comparisonState || ""} onChange={e => setComparisonState(e.target.value || null)}>
              <option value="">-- Select a state --</option>
              {stateOptions.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <label htmlFor="layer">Choropleth Layer: </label>
            <select id="layer" value={selectedLayer} onChange={e => setSelectedLayer(e.target.value)}>
              {layerOptions.map(layer => (
                <option key={layer} value={layer}>{questionLabelMap[layer] || layer}</option>
              ))}
            </select>
          </div>
        </div>

        <ObesityMap
          ageGroup={selectedAge}
          year={selectedYear}
          obesityData={filteredObesity}
          educationData={educationData}
          onHoverState={setHoveredState}
          layerName={questionLabelMap[selectedLayer] || selectedLayer}
          layerData={layerData}
        />
      </div>

      <SidebarInfo
        state={hoveredState}
        comparisonState={comparisonState}
        layerData={layerData}
        educationData={educationData}
        year={selectedYear}
        layerName={questionLabelMap[selectedLayer] || selectedLayer}
      />
    </div>
  );
}

export default App;
