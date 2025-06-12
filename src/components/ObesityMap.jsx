import React, { useState } from "react";
import Plot from "react-plotly.js";

const ObesityMap = ({ ageGroup, year, educationData, layerName, layerData, onHoverState }) => {
    const [hoveredState, setHoveredState] = useState(null);

    const locations = layerData.map(d => d.state);
    const z = layerData.map(d => d.value);
    const hoverText = layerData.map(
        d => `${d.state}<br>${layerName}: ${d.value?.toFixed(1)}%<br>Year: ${year}`
    );

    const pieTrace = (() => {
        if (!hoveredState || !educationData[hoveredState]?.[year]) return null;
        const edu = educationData[hoveredState][year];
        return {
            type: "pie",
            name: hoveredState,
            labels: ["High school", "Some college", "Bachelor's+"],
            values: [
                edu["High school graduate"],
                edu["Some college"],
                edu["Bachelor's degree or higher"]
            ],
            domain: { x: [0.8, 0.98], y: [0.1, 0.35] },
            textinfo: "label+percent",
            showlegend: false,
            hole: 0.4
        };
    })();

    return (
        <Plot
            data={[
                {
                    type: "choropleth",
                    locationmode: "USA-states",
                    locations,
                    z,
                    text: hoverText,
                    hoverinfo: "text",
                    colorscale: "Reds",
                    zmin: Math.min(...z),
                    zmax: Math.max(...z),
                    colorbar: { title: `% ${layerName}` }
                },
                ...(pieTrace ? [pieTrace] : [])
            ]}
            layout={{
                geo: {
                    scope: "usa",
                    showlakes: true,
                    lakecolor: "white"
                },
                margin: { t: 50, b: 0, l: 0, r: 0 },
                title: `${layerName} and Education Breakdown – Age ${ageGroup} (${year})`,
                annotations: hoveredState ? [{
                    x: 0.89, y: 0.05, showarrow: false,
                    text: `<b>${hoveredState}</b>`, xanchor: "center"
                }] : []
            }}
            onHover={e => {
                const state = e.points?.[0]?.location || null;
                setHoveredState(state);
                onHoverState(state);
            }}
            config={{ responsive: true }}
            style={{ width: "100%", height: "80vh" }}
        />
    );
};

export default ObesityMap;
