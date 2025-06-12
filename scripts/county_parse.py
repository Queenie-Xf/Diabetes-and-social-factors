import os
import pandas as pd
import time
import requests
from tqdm import tqdm

# Define path and years
base_path = "Aryan_Data/location_data"
years = [2010, 2015, 2020, 2025]

# Reverse geocode using Nominatim
def get_county(lat, lon):
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                'lat': lat,
                'lon': lon,
                'format': 'json',
                'zoom': 10,
                'addressdetails': 1
            },
            headers={'User-Agent': 'AryanVizApp/1.0 (contact@example.com)'}
        )
        if response.status_code == 200:
            data = response.json()
            return data['address'].get('county', None)
    except Exception as e:
        print(f"Error for ({lat}, {lon}): {e}")
    return None

# Process and overwrite each file
def process_and_overwrite(year):
    file_path = os.path.join(base_path, f"locations_{year}.csv")
    if not os.path.exists(file_path):
        print(f"[!] File not found: {file_path}")
        return

    df = pd.read_csv(file_path)
    if 'County' not in df.columns:
        df['County'] = None

    for i in tqdm(range(len(df)), desc=f"Updating {year}"):
        lat, lon = df.at[i, 'lat'], df.at[i, 'lon']
        if pd.notnull(lat) and pd.notnull(lon) and not pd.notnull(df.at[i, 'County']):
            df.at[i, 'County'] = get_county(lat, lon)
            time.sleep(1)  # Respect Nominatim rate limit

    df.to_csv(file_path, index=False)
    print(f"[✓] Overwritten: {file_path}")

if __name__ == "__main__":
    for year in years:
        process_and_overwrite(year)
