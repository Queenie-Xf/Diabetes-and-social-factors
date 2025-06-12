import * as d3 from 'd3';
import { feature } from 'topojson-client';

const base = import.meta.env.BASE_URL; // Ensure correct base path for deployed environments

export const fetchObesityData = async () => {
  try {
    console.log("Fetching obesity data...");
    const data = await d3.csv(`${base}strat_Total_Total.csv`);
    console.log(`Loaded ${data.length} rows of obesity data`);

    const obesityData = data.filter(d =>
      d.Topic === 'Obesity / Weight Status' &&
      d.Question === 'Percent of adults aged 18 years and older who have obesity' &&
      d.StratificationCategory1 === 'Total'
    );

    const processedData = obesityData.map(d => {
      let dataValue = 0;
      try {
        dataValue = parseFloat(d.Data_Value.replace(/,/g, ''));
        if (isNaN(dataValue)) dataValue = 0;
      } catch {
        dataValue = 0;
      }

      return {
        state: d.LocationAbbr,
        stateName: d.LocationDesc,
        year: parseInt(d.YearStart, 10) || 0,
        value: dataValue,
        geoLocation: d.GeoLocation ? d.GeoLocation.replace(/[()]/g, '').split(',').map(Number) : null
      };
    });

    return processedData;
  } catch (error) {
    console.error('Error fetching obesity data:', error);
    return [];
  }
};

export const fetchHospitalData = async () => {
  try {
    console.log("Fetching hospital data...");
    const data = await d3.csv(`${base}chsp-hospital-linkage-2022-rev.csv`);

    const processedData = data.map(d => ({
      id: d.compendium_hospital_id || '',
      name: d.hospital_name || 'Unknown Hospital',
      state: d.hospital_state || '',
      city: d.hospital_city || '',
      beds: +d.hos_beds || 0,
      isAcute: d.acutehosp_flag === '1',
      coordinates: [+d.lon || 0, +d.lat || 0]
    })).filter(d => d.state.length === 2);

    return processedData;
  } catch (error) {
    console.error('Error fetching hospital data:', error);
    return [];
  }
};

export const fetchStateHospitalData = async (state) => {
  try {
    console.log(`Fetching hospital data for ${state}...`);
    const fileName = state.toLowerCase() === 'colorado'
      ? 'colorado_hospital.json'
      : 'missouri_hospital.json';

    const data = await d3.json(`${base}${fileName}`);

    if (!data || !Array.isArray(data.hospitals)) return [];

    return data.hospitals.map(h => ({
      ...h,
      coordinates: h.coordinates?.length === 2
        ? h.coordinates
        : [+h.lon || 0, +h.lat || 0]
    }));
  } catch (error) {
    console.error(`Error fetching ${state} hospital data:`, error);
    return [];
  }
};

export const fetchCountyData = async (state) => {
  try {
    console.log(`Fetching county data for ${state}...`);
    const fileName = state.toLowerCase() === 'colorado'
      ? 'colorado-counties-by-population-(2025).json'
      : 'missouri-counties-by-population-(2025).json';

    const data = await d3.json(`${base}${fileName}`);
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${state} county data:`, error);
    return [];
  }
};

export const fetchStateGeoData = async (state) => {
  try {
    const us = await d3.json('https://unpkg.com/us-atlas@3/states-10m.json');
    const statesGeo = feature(us, us.objects.states);

    if (state === 'Colorado' || state === 'Missouri') {
      return {
        type: "FeatureCollection",
        features: statesGeo.features.filter(
          d => d.properties.name === state
        )
      };
    }

    return statesGeo;
  } catch (error) {
    console.error('Error fetching state geo data:', error);
    return { type: "FeatureCollection", features: [] };
  }
};

export const aggregateByStateAndYear = (data) => {
  try {
    const aggregated = d3.group(data, d => d.state, d => d.year);

    return Array.from(aggregated, ([state, yearMap]) => ({
      state,
      values: Array.from(yearMap, ([year, values]) => ({
        year,
        value: d3.mean(values, d => d.value)
      })).sort((a, b) => a.year - b.year)
    }));
  } catch (error) {
    console.error('Error aggregating data:', error);
    return [];
  }
};

export const getValueDomain = (data) => {
  try {
    const values = data.flatMap(d =>
      d.values ? d.values.map(v => v.value) : [d.value]
    ).filter(v => v > 0);

    return values.length ? [d3.min(values), d3.max(values)] : [0, 100];
  } catch (error) {
    console.error('Error calculating value domain:', error);
    return [0, 100];
  }
};

export const getColorScale = (domain) => {
  try {
    return d3.scaleSequential()
      .domain(domain)
      .interpolator(d3.interpolateRdYlBu);
  } catch (error) {
    console.error('Error creating color scale:', error);
    return d3.scaleSequential().domain([0, 100]).interpolator(d3.interpolateRdYlBu);
  }
};
