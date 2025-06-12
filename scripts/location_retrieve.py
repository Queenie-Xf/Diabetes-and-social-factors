import overpy
import pandas as pd
import time
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

api = overpy.Overpass()

years = [2010, 2015, 2020, 2025]
states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming", "District of Columbia"
]

query_templates = {
    "Fast Food": """
        [out:json][timeout:1800][date:"{year}-01-01T00:00:00Z"];
        area["name"="{state}"]["admin_level"="4"]->.searchArea;
        (
          node["amenity"="fast_food"](area.searchArea);
        );
        out center;
    """,
    "Grocery": """
        [out:json][timeout:1800][date:"{year}-01-01T00:00:00Z"];
        area["name"="{state}"]["admin_level"="4"]->.searchArea;
        (
          node["shop"="supermarket"](area.searchArea);
        );
        out center;
    """
}

def fetch_data(year, state, tag, query_template):
    query = query_template.format(year=year, state=state)
    try:
        result = api.query(query)
        return [{
            "name": node.tags.get("name", "Unknown"),
            "lat": node.lat,
            "lon": node.lon,
            "Tag": tag,
            "Year": year,
            "State": state
        } for node in result.nodes]
    except Exception as e:
        print(f"❌ Error for {tag} in {state} {year}: {e}")
        return []

for year in tqdm(years, desc="Processing Years"):
    all_results = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(fetch_data, year, state, tag, query_templates[tag])
            for state in states
            for tag in query_templates
        ]
        for future in tqdm(as_completed(futures), total=len(futures), desc=f"Year {year}", leave=False):
            all_results.extend(future.result())

    df = pd.DataFrame(all_results)
    df.to_csv(f"locations_{year}.csv", index=False)
    print(f"✅ Saved locations_{year}.csv with {len(df)} entries")
