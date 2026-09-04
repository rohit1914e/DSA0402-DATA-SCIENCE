"""
Sync historical environmental data from Open-Meteo APIs.
Retrieves past days of weather and air quality data and stores in SQLite.
"""
import os
import sys
import asyncio
import httpx
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db import get_connection, init_db
from app.utils.aqi import calculate_composite_aqi

OPEN_METEO_HISTORY = "https://archive-api.open-meteo.com/v1/archive"
OPEN_METEO_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality"


async def fetch_historical_weather(lat, lon, start_date, end_date):
    """Fetch historical weather data."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,cloud_cover",
        "timezone": "auto"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(OPEN_METEO_HISTORY, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"  ⚠️ Historical weather API error: {e}")
        return None


async def fetch_historical_air_quality(lat, lon, start_date, end_date):
    """Fetch historical air quality data (past 5 days available on Open-Meteo)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
        "past_days": 5,
        "timezone": "auto"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(OPEN_METEO_AQ, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"  ⚠️ Historical AQ API error: {e}")
        return None


async def sync_historical_data(days=7, location_ids=None):
    """Sync historical data for specified locations."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    if location_ids:
        placeholders = ",".join("?" * len(location_ids))
        cursor.execute(f"SELECT * FROM locations WHERE id IN ({placeholders})", location_ids)
    else:
        cursor.execute("SELECT * FROM locations LIMIT 5")

    locations = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not locations:
        print("❌ No locations found.")
        return

    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    total = 0
    for loc in locations:
        print(f"\n📍 Syncing {loc['name']} ({loc['country']})...")

        weather = await fetch_historical_weather(loc["latitude"], loc["longitude"], start_date, end_date)
        aq = await fetch_historical_air_quality(loc["latitude"], loc["longitude"], start_date, end_date)

        if not weather and not aq:
            print(f"  ❌ No data available for {loc['name']}")
            continue

        hourly_w = weather.get("hourly", {}) if weather else {}
        hourly_aq = aq.get("hourly", {}) if aq else {}

        times = hourly_w.get("time", []) or hourly_aq.get("time", [])

        conn = get_connection()
        cursor = conn.cursor()
        count = 0

        for i, t in enumerate(times):
            # Skip if exists
            cursor.execute(
                "SELECT id FROM environmental_data WHERE location_id=? AND timestamp=?",
                (loc["id"], t)
            )
            if cursor.fetchone():
                continue

            pm25 = hourly_aq.get("pm2_5", [])[i] if i < len(hourly_aq.get("pm2_5", [])) else None
            pm10 = hourly_aq.get("pm10", [])[i] if i < len(hourly_aq.get("pm10", [])) else None
            co = hourly_aq.get("carbon_monoxide", [])[i] if i < len(hourly_aq.get("carbon_monoxide", [])) else None
            no2 = hourly_aq.get("nitrogen_dioxide", [])[i] if i < len(hourly_aq.get("nitrogen_dioxide", [])) else None
            so2 = hourly_aq.get("sulphur_dioxide", [])[i] if i < len(hourly_aq.get("sulphur_dioxide", [])) else None
            o3 = hourly_aq.get("ozone", [])[i] if i < len(hourly_aq.get("ozone", [])) else None
            aqi = hourly_aq.get("us_aqi", [])[i] if i < len(hourly_aq.get("us_aqi", [])) else None

            if aqi is None and pm25 is not None:
                aqi = calculate_composite_aqi(pm25=pm25, pm10=pm10)

            temp = hourly_w.get("temperature_2m", [])[i] if i < len(hourly_w.get("temperature_2m", [])) else None
            hum = hourly_w.get("relative_humidity_2m", [])[i] if i < len(hourly_w.get("relative_humidity_2m", [])) else None
            ws = hourly_w.get("wind_speed_10m", [])[i] if i < len(hourly_w.get("wind_speed_10m", [])) else None
            pres = hourly_w.get("surface_pressure", [])[i] if i < len(hourly_w.get("surface_pressure", [])) else None
            prec = hourly_w.get("precipitation", [])[i] if i < len(hourly_w.get("precipitation", [])) else None
            cc = hourly_w.get("cloud_cover", [])[i] if i < len(hourly_w.get("cloud_cover", [])) else None

            cursor.execute("""
                INSERT INTO environmental_data
                (location_id, timestamp, pm25, pm10, co, no2, so2, o3,
                 temperature, humidity, wind_speed, pressure, precipitation, cloud_cover, aqi, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (loc["id"], t, pm25, pm10, co, no2, so2, o3,
                  temp, hum, ws, pres, prec, cc, aqi, "open-meteo-historical"))
            count += 1

        conn.commit()
        conn.close()
        total += count
        print(f"  ✅ Stored {count} records for {loc['name']}")

    print(f"\n✅ Total historical records synced: {total}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Sync historical data from Open-Meteo")
    parser.add_argument("--days", type=int, default=7, help="Number of days to sync")
    args = parser.parse_args()

    print("📡 Syncing Historical Environmental Data")
    print("=" * 50)
    asyncio.run(sync_historical_data(days=args.days))
