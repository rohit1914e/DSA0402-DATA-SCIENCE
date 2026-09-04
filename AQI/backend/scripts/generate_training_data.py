"""
Generate synthetic training data for ML model development.
This creates realistic environmental + AQI data based on known relationships.

⚠️ DEVELOPMENT / SYNTHETIC DATASET
This data is for model training during development only.
It is NOT real-world measured data.
"""
import os
import sys
import random
import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db import get_connection, init_db


def generate_realistic_record(timestamp, lat, lon, location_id):
    """Generate a single realistic environmental data record."""
    hour = timestamp.hour
    month = timestamp.month
    day_of_year = timestamp.timetuple().tm_yday

    # Seasonal temperature variation
    base_temp = 25 + 10 * math.sin(2 * math.pi * (day_of_year - 80) / 365)
    # Latitude effect
    base_temp -= abs(lat - 20) * 0.3
    # Diurnal variation
    base_temp += 5 * math.sin(2 * math.pi * (hour - 6) / 24)
    temperature = base_temp + random.gauss(0, 2)

    # Humidity inversely related to temperature
    base_humidity = 70 - 0.8 * (temperature - 25)
    humidity = max(20, min(100, base_humidity + random.gauss(0, 8)))

    # Wind speed
    wind_speed = max(0, 3 + 2 * math.sin(2 * math.pi * hour / 24) + random.gauss(0, 1.5))

    # Pressure
    pressure = 1013 + random.gauss(0, 5) - abs(lat) * 0.1

    # Precipitation (more likely in monsoon months for Indian cities)
    precip_chance = 0.1
    if 6 <= month <= 9 and 5 <= lat <= 35:
        precip_chance = 0.4
    precipitation = max(0, random.expovariate(2)) if random.random() < precip_chance else 0

    cloud_cover = max(0, min(100, 30 + precipitation * 20 + humidity * 0.3 + random.gauss(0, 15)))

    # Pollutants - realistic relationships
    # Rush hour effect
    traffic_factor = 1.0
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        traffic_factor = 1.8
    elif 0 <= hour <= 5:
        traffic_factor = 0.5

    # Wind dilution effect
    wind_factor = max(0.3, 1.0 - wind_speed * 0.08)

    # Humidity trapping effect
    humidity_factor = 1.0 + max(0, (humidity - 60)) * 0.01

    # Urban base PM2.5 varies by location
    base_pm25 = 25 + abs(lat - 28) * 0.5  # Delhi-like cities have higher baseline

    pm25 = max(1, base_pm25 * traffic_factor * wind_factor * humidity_factor + random.gauss(0, 8))
    pm10 = max(2, pm25 * 1.6 + random.gauss(0, 10))

    # Gases
    co = max(0.1, 400 * traffic_factor * wind_factor + random.gauss(0, 50))
    no2 = max(1, 20 * traffic_factor * wind_factor + random.gauss(0, 5))
    so2 = max(0.5, 8 * wind_factor + random.gauss(0, 2))

    # Ozone - higher in afternoon with sunlight, lower at night
    solar_factor = max(0, math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0
    o3 = max(1, 40 * solar_factor + 20 * (1 - wind_factor) + random.gauss(0, 8))

    # Calculate AQI from PM2.5 (US EPA standard)
    from app.utils.aqi import calculate_composite_aqi
    aqi = calculate_composite_aqi(pm25=pm25, pm10=pm10)
    if aqi is None:
        aqi = pm25 * 2  # rough fallback

    return {
        "location_id": location_id,
        "timestamp": timestamp.isoformat(),
        "pm25": round(pm25, 2),
        "pm10": round(pm10, 2),
        "co": round(co, 2),
        "no2": round(no2, 2),
        "so2": round(so2, 2),
        "o3": round(o3, 2),
        "temperature": round(temperature, 1),
        "humidity": round(humidity, 1),
        "wind_speed": round(wind_speed, 1),
        "pressure": round(pressure, 1),
        "precipitation": round(precipitation, 2),
        "cloud_cover": round(cloud_cover, 1),
        "aqi": round(aqi, 1),
        "source": "synthetic-development"
    }


def generate_training_data(days=90, locations=None):
    """Generate synthetic training data for all locations."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    if locations is None:
        cursor.execute("SELECT * FROM locations")
        locations = [dict(r) for r in cursor.fetchall()]

    if not locations:
        print("❌ No locations found in database.")
        return

    # Check if there's already enough data
    cursor.execute("SELECT COUNT(*) as c FROM environmental_data")
    existing = cursor.fetchone()["c"]
    print(f"📊 Existing records: {existing}")

    total_generated = 0
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    for loc in locations:
        print(f"📍 Generating data for {loc['name']} ({loc['country']})...")
        current = start_date
        count = 0

        while current <= end_date:
            record = generate_realistic_record(
                current, loc["latitude"], loc["longitude"], loc["id"]
            )

            cursor.execute("""
                INSERT INTO environmental_data 
                (location_id, timestamp, pm25, pm10, co, no2, so2, o3,
                 temperature, humidity, wind_speed, pressure, precipitation, cloud_cover, aqi, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record["location_id"], record["timestamp"],
                record["pm25"], record["pm10"], record["co"],
                record["no2"], record["so2"], record["o3"],
                record["temperature"], record["humidity"],
                record["wind_speed"], record["pressure"],
                record["precipitation"], record["cloud_cover"],
                record["aqi"], record["source"]
            ))
            count += 1
            current += timedelta(hours=1)

        total_generated += count
        print(f"   ✅ Generated {count} hourly records")

    conn.commit()
    conn.close()
    print(f"\n✅ Total records generated: {total_generated}")
    print("⚠️ This is SYNTHETIC development data, not real-world measurements.")
    return total_generated


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate synthetic training data")
    parser.add_argument("--days", type=int, default=90, help="Number of days of data to generate")
    args = parser.parse_args()

    print("🔧 Generating Synthetic Training Data")
    print("=" * 50)
    print(f"⚠️  DEVELOPMENT / SYNTHETIC DATASET")
    print(f"    This data is for ML training during development.")
    print(f"    It is NOT real-world measured data.")
    print("=" * 50)

    generate_training_data(days=args.days)
