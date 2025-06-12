import React from "react";

const AgeGroupSelector = ({ selected, onChange }) => {
    const ageGroups = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"];

    return (
        <div style={{ padding: "1rem" }}>
            <label htmlFor="age-select">Select Age Group: </label>
            <select id="age-select" value={selected} onChange={e => onChange(e.target.value)}>
                {ageGroups.map(age => (
                    <option key={age} value={age}>{age}</option>
                ))}
            </select>
        </div>
    );
};

export default AgeGroupSelector;

