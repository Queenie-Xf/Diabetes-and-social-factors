// File: src/components/SidebarInfo.jsx
import React from "react";
import Plot from "react-plotly.js";

const SidebarInfo = ({ state, comparisonState, layerData, educationData, year, layerName }) => {
    const renderInfo = (label, stateKey, showPie = false) => {
        if (!stateKey) return null;

        const dataRow = Array.isArray(layerData)
            ? layerData.find(row => row.state === stateKey)
            : null;

        const eduYear = educationData[stateKey]?.[year];
        const pieData = eduYear
            ? {
                labels: ["High School", "Some College", "Bachelor's+"],
                values: [
                    eduYear["High school graduate"],
                    eduYear["Some college"],
                    eduYear["Bachelor's degree or higher"]
                ]
            }
            : null;

        return (
            <div style={{ marginBottom: "1rem" }}>
                <h4>{label}: {stateKey}</h4>
                <p><strong>Year:</strong> {year}</p>
                <p><strong>{layerName}:</strong> {dataRow?.value?.toFixed(1) || "--"}%</p>
                <p><strong>Education:</strong></p>
                {eduYear ? (
                    <ul>
                        <li>High School: {eduYear["High school graduate"]}%</li>
                        <li>Some College: {eduYear["Some college"]}%</li>
                        <li>Bachelor's+: {eduYear["Bachelor's degree or higher"]}%</li>
                    </ul>
                ) : (
                    <p>No education data for {year}</p>
                )}

                {showPie && pieData && (
                    <Plot
                        data={[{
                            type: "pie",
                            labels: pieData.labels,
                            values: pieData.values,
                            hole: 0.4,
                            textinfo: "label+percent",
                            showlegend: false
                        }]}
                        layout={{
                            margin: { t: 10, b: 10, l: 10, r: 20 },
                            height: 220,
                            width: 280,  // Ensure left positioning fits the sidebar
                            showlegend: false,
                            xaxis: { domain: [0, 0.5] }  // Moves the pie chart to the left
                        }}
                        config={{ displayModeBar: false }}
                    />
                )}
            </div>
        );
    };

    return (
        <div style={{ width: "280px", padding: "1rem", backgroundColor: "#f9f9f9" }}>
            {state ? renderInfo("Selected", state) : <p>Hover over a state</p>}
            {comparisonState && renderInfo("Compared", comparisonState, true)}
        </div>
    );
};

export default SidebarInfo;
