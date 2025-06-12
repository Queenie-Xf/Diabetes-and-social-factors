import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson';

const USHealthMap = () => {
  const mapRef = useRef(null);
  const radarRef = useRef(null);
  const tooltipRef = useRef(null);
  const colorLabelRef = useRef(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    // Clear any existing SVG elements to prevent duplicates on re-render
    d3.select(mapRef.current).selectAll("*").remove();
    d3.select(radarRef.current).selectAll("*").remove();
    d3.select(sliderRef.current).selectAll("*").remove();

    let mapG = null; // Store reference to the map layer

    let activeColorMetric = "Short Sleep Duration";
    let currentZoomK = 1;

    const radarMetrics = [
      "Short Sleep Duration",
      "Depression",
      "Binge Drinking",
      "Frequent Mental Distress",
      "Current Cigarette Smoking",
      "Physical Inactivity"
    ];

    const labels = {
      "Short Sleep Duration": "Sleep",
      "Depression": "Depression",
      "Binge Drinking": "Drinking",
      "Frequent Mental Distress": "Stress",
      "Current Cigarette Smoking": "Smoking",
      "Physical Inactivity": "Inactive"
    };

    const stateRadius = d3.scaleSqrt().domain([20, 45]).range([10, 50]);
    let color = d3.scaleSequential(d3.interpolateYlOrRd);

    // Create the SVG elements
    const svg = d3.select(mapRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const radarSVG = d3.select(radarRef.current);
    const colorLabel = d3.select(colorLabelRef.current);
    const sliderSVG = d3.select(sliderRef.current);

    // Create year slider (non-functional, for future implementation)
    const sliderWidth = 300;
    const sliderHeight = 50;
    const sliderMargin = { top: 10, right: 20, bottom: 20, left: 20 };
    const sliderScale = d3.scaleLinear()
      .domain([2000, 2025])
      .range([0, sliderWidth - sliderMargin.left - sliderMargin.right])
      .clamp(true);

    const sliderG = sliderSVG.append("g")
      .attr("transform", `translate(${sliderMargin.left},${sliderMargin.top})`);

    sliderG.append("line")
      .attr("class", "track")
      .attr("x1", sliderScale.range()[0])
      .attr("x2", sliderScale.range()[1])
      .attr("stroke", "#ccc")
      .attr("stroke-width", 10)
      .attr("stroke-linecap", "round");

    sliderG.append("line")
      .attr("class", "track-inset")
      .attr("x1", sliderScale.range()[0])
      .attr("x2", sliderScale.range()[1])
      .attr("stroke", "#ddd")
      .attr("stroke-width", 8)
      .attr("stroke-linecap", "round");

    sliderG.append("line")
      .attr("class", "track-overlay")
      .attr("x1", sliderScale.range()[0])
      .attr("x2", sliderScale.range()[1])
      .attr("stroke", "transparent")
      .attr("stroke-width", 40)
      .attr("stroke-linecap", "round")
      .style("cursor", "pointer");

    const handle = sliderG.append("circle")
      .attr("class", "handle")
      .attr("cx", sliderScale(2023))  // Default to 2023
      .attr("cy", 0)
      .attr("r", 9)
      .attr("fill", "#3182bd")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    sliderG.append("text")
      .attr("x", sliderScale(2000))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .text("2000");

    sliderG.append("text")
      .attr("x", sliderScale(2025))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .text("2025");

    sliderG.append("text")
      .attr("class", "year-label")
      .attr("x", sliderScale(2023))
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text("Year: 2023");

    // Load data
    Promise.all([
      d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
      d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"),
      d3.csv("state_health_map_data.csv"),
      d3.csv("county_health_map_data.csv")
    ]).then(([stateTopo, countyTopo, stateDataRaw, countyDataRaw]) => {
      const states = topojson.feature(stateTopo, stateTopo.objects.states);
      const counties = topojson.feature(countyTopo, countyTopo.objects.counties);
      const projection = d3.geoAlbersUsa().fitSize([960, 600], states);
      const path = d3.geoPath(projection);

      // First clear any existing map elements
      svg.selectAll("g.map-layer").remove();
      mapG = svg.append("g").attr("class", "map-layer");

      // Process state data
      const stateData = d3.groups(stateDataRaw, d => d.State).map(([state, values]) => {
        const entry = { State: state, State2: values[0].State2, StateName: state };
        entry.Lat = +values[0].Lat;
        entry.Long = +values[0].Long;
        values.forEach(v => {
          if (!isNaN(+v.Data_Value)) entry[v.Measure] = +v.Data_Value;
        });
        return entry;
      });

      // Process county data
      const countyDataMap = new Map();
      countyDataRaw.forEach(d => {
        const key = d.State + "|" + d.County;
        if (!countyDataMap.has(key)) {
          countyDataMap.set(key, {
            State: d.State,
            State2: d.State2,
            County: d.County,
            Lat: +d.Lat,
            Long: +d.Long
          });
        }
        const entry = countyDataMap.get(key);
        if (!isNaN(+d.Data_Value)) {
          entry[d["Short_Question_Text"]] = +d.Data_Value;
        }
      });

      const countyData = Array.from(countyDataMap.values());

      function updateColorScale(data) {
        const extent = d3.extent(data, d => +d[activeColorMetric]);
        color.domain(extent);
        // Update legend scale text
        d3.select(".legend text[x='0'][y='42']").text(extent[0] ? extent[0].toFixed(1) + "%" : "min");
        d3.select(".legend text[x='180'][y='42']").text(extent[1] ? extent[1].toFixed(1) + "%" : "max");
      }

      function renderBubbles(data, customRadius = null) {
        updateColorScale(data);
        mapG.selectAll("circle").remove();
        const isCountyView = data.length > 100;
        const radiusScale = customRadius || (isCountyView ? d3.scaleSqrt().domain([20, 45]).range([2, 8]) : stateRadius);

        mapG.selectAll("circle")
          .data(data)
          .join("circle")
          .attr("cx", d => projection([+d.Long, +d.Lat])[0])
          .attr("cy", d => projection([+d.Long, +d.Lat])[1])
          .attr("r", d => isNaN(+d.Obesity) ? 2 : radiusScale(+d.Obesity))
          .attr("fill", d => {
            const val = +d[activeColorMetric];
            return isNaN(val) ? "#ccc" : color(val);
          })
          .attr("fill-opacity", 0.75)
          .attr("stroke", isCountyView ? "white" : "none")
          .attr("stroke-width", isCountyView ? 0.5 : 0)
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`
              <strong>${d.County ? d.County + ', ' + d.State : d.State}</strong><br/>
              Obesity: ${isNaN(d.Obesity) ? 'N/A' : d.Obesity.toFixed(1)}%<br/>
              ${labels[activeColorMetric] || activeColorMetric}: ${isNaN(d[activeColorMetric]) ? 'N/A' : d[activeColorMetric].toFixed(1)}%
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
            const radarValues = {};
            radarMetrics.forEach(metric => radarValues[metric] = +d[metric]);
            drawRadar(d.Obesity, radarValues);
          })
          .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
      }

      function drawRadar(obesity, radarValues) {
        radarSVG.selectAll("*").remove();
        const radarRadius = 140;
        const center = { x: 180, y: 180 };
        const angleSlice = (2 * Math.PI) / radarMetrics.length;

        for (let i = 1; i <= 5; i++) {
          radarSVG.append("circle")
            .attr("cx", center.x)
            .attr("cy", center.y)
            .attr("r", radarRadius * i / 5)
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "2,2");

          radarSVG.append("text")
            .attr("x", center.x)
            .attr("y", center.y - radarRadius * i / 5 - 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text(`${i * 20}%`);
        }

        const radarPoints = radarMetrics.map((metric, i) => {
          const value = radarValues[metric];
          if (isNaN(value) || isNaN(obesity)) return null;
          const relative = (value - obesity) / 100;
          const r = Math.max(10, radarRadius * (0.7 + relative));
          const angle = i * angleSlice - Math.PI / 2;
          return {
            x: center.x + r * Math.cos(angle),
            y: center.y + r * Math.sin(angle),
            label: metric,
            angle
          };
        }).filter(p => p);

        if (radarPoints.length > 2) {
          radarSVG.append("polygon")
            .attr("points", radarPoints.map(p => `${p.x},${p.y}`).join(" "))
            .attr("fill", "#6baed6")
            .attr("fill-opacity", 0.4)
            .attr("stroke", "#3182bd")
            .attr("stroke-width", 2);
        }

        radarPoints.forEach(p => {
          radarSVG.append("circle")
            .attr("cx", p.x)
            .attr("cy", p.y)
            .attr("r", 4)
            .attr("fill", "#3182bd");
        });

        radarPoints.forEach((p, i) => {
          radarSVG.append("text")
            .attr("x", center.x + (radarRadius + 20) * Math.cos(p.angle))
            .attr("y", center.y + (radarRadius + 20) * Math.sin(p.angle))
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("class", "axis-label" + (p.label === activeColorMetric ? " active" : ""))
            .text(labels[p.label] || p.label)
            .on("click", () => {
              activeColorMetric = p.label;
              colorLabel.text(`Color: ${labels[p.label] || p.label} (%)`);
              renderBubbles(currentZoomK > 1.1 ? countyData : stateData);
            });
        });
      }

      mapG.selectAll("path.state")
        .data(states.features)
        .join("path")
        .attr("d", path)
        .attr("fill", "#eee")
        .attr("stroke", "#ccc")
        .on("click", (event, d) => {
          const stateId = d.id.toString().padStart(2, '0');
          // safer stateName detection
          const stateObj = stateTopo.objects.states.geometries.find(s => s.id == d.id);
          const stateName = stateObj ? stateObj.properties.name : "";
          const [[x0, y0], [x1, y1]] = path.bounds(d);
          svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(960 / 2, 600 / 2)
              .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / 960, (y1 - y0) / 600)))
              .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
          );

          const stateCounties = countyData.filter(row => (row.State2 || "").trim().toLowerCase() === stateName.toLowerCase());
          const validStateCounties = stateCounties.filter(d => !isNaN(d.Lat) && !isNaN(d.Long) && !isNaN(d.Obesity));

          mapG.selectAll("path.county")
            .data(counties.features.filter(c => c.id && c.id.substring(0, 2) === stateId))
            .join("path")
            .attr("class", "county")
            .attr("d", path)
            .attr("fill", "#fff")
            .attr("stroke", "#aaa");

          const obesityExtent = d3.extent(validStateCounties, d => +d.Obesity);
          const dynamicRadius = d3.scaleSqrt().domain(obesityExtent).range([1, 7]);
          renderBubbles(validStateCounties, dynamicRadius);
        });

      const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
          currentZoomK = event.transform.k;
          mapG.attr("transform", event.transform);
          if (event.transform.k <= 1.1) {
            mapG.selectAll("path.county").remove();
            renderBubbles(stateData);
          }
        });

      // Clear any existing zoom behavior before attaching new one
      svg.on(".zoom", null);
      svg.call(zoom);
      renderBubbles(stateData);
    });

    let cleanupFunction = () => {
      // Remove all event listeners and clear selections
      if (svg && !svg.empty()) {
        svg.on('.zoom', null); // Remove zoom listeners
        svg.selectAll('*').remove(); // Remove all child elements
      }
      if (radarSVG && !radarSVG.empty()) {
        radarSVG.selectAll('*').remove();
      }
      if (sliderSVG && !sliderSVG.empty()) {
        sliderSVG.selectAll('*').remove();
      }
    };

    // Call the cleanup function immediately to clear any existing elements
    cleanupFunction();

    // Return the cleanup function for when component unmounts
    return cleanupFunction;
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="obesity-map-container">
      <div className="header-container">

        <div className="intro">
          <h1>Exploring Obesity and Behavioral Health Patterns in the U.S.</h1>
          <p>
            This dashboard is a proportional symbols map, it visualizes the relationships between adult obesity rates and related behavioral health metrics including sleep deprivation, physical inactivity, and mental distress.<br />
            <b>Circle size</b>: Obesity prevalence.<br />
            <b>Circle color</b>: Select a metric by clicking a radar label.<br />
            Hover for health profile, click a state to zoom to counties.
          </p>
        </div>
      </div>
      <div className="container">
        <svg ref={mapRef} id="map" width="960" height="600"></svg>
        <div className="radar-container">
          <h3>Health Profile</h3>
          <svg ref={radarRef} id="radar" width="360" height="360"></svg>
          <div className="year-slider-container">
            <h4>Data Year</h4>
            <svg ref={sliderRef} id="year-slider" width="360" height="50"></svg>
            <p className="future-feature-note">Future Feature: Historical data exploration</p>
          </div>
        </div>
      </div>
      <div className="legend" style={{ marginTop: '20px', fontSize: '13px' }}>
        <svg width="360" height="90">
          <defs>
            <linearGradient id="colorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffb2" />
              <stop offset="50%" stopColor="#fe9929" />
              <stop offset="100%" stopColor="#d95f0e" />
            </linearGradient>
          </defs>
          <text x="0" y="12" id="colorLabel" ref={colorLabelRef}>Color: Sleep (%)</text>
          <rect x="0" y="18" width="200" height="10" fill="url(#colorGradient)"></rect>
          <text x="0" y="42">min</text>
          <text x="180" y="42">max</text>
          <text x="230" y="12">Obesity Rate</text>
          <circle cx="250" cy="45" r="10" fill="#999" opacity="0.6" />
          <text x="265" y="49">20%</text>
          <circle cx="250" cy="75" r="20" fill="#999" opacity="0.6" />
          <text x="275" y="80">45%</text>
        </svg>
      </div>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
};

// CSS for the component
const USHealthMapWithStyles = () => {
  return (
    <>
      <style>{`
        .obesity-map-container {
          font-family: sans-serif;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
        }
        .header-container {
          width: 100%;
          max-width: 1600px;
          position: relative;
          display: flex;
          align-items: flex-start;
        }
        .home-button {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          background: white;
          color: #333;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        .home-button:hover {
          background: #f0f0f0;
          box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
        .container {
          display: flex;
          width: 100%;
          max-width: 1600px;
          justify-content: space-between;
          gap: 60px;
          padding: 0 20px;
        }
        .tooltip {
          position: absolute;
          padding: 8px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          pointer-events: none;
          font-size: 12px;
          opacity: 0;
          z-index: 1000;
        }
        .radar-container {
          width: 420px;
          background: #f9f9f9;
          border-left: 1px solid #ccc;
          padding: 20px;
        }
        .year-slider-container {
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 15px;
        }
        .year-slider-container h4 {
          margin-bottom: 10px;
          color: #555;
        }
        .future-feature-note {
          color: #888;
          font-style: italic;
          font-size: 12px;
          text-align: center;
          margin-top: 5px;
        }
        .axis-label {
          font-size: 11px;
          cursor: pointer;
          user-select: none;
        }
        .axis-label.active {
          font-weight: bold;
          fill: #e6550d;
        }
        .intro {
          max-width: 1000px;
          padding: 40px 20px 10px;
          text-align: center;
          margin: 0 auto;
        }
        .intro h1 {
          font-size: 28px;
          margin-bottom: 12px;
        }
        .intro p {
          font-size: 16px;
          line-height: 1.5em;
        }
      `}</style>
      <USHealthMap />
    </>
  );
};

export default USHealthMapWithStyles;
