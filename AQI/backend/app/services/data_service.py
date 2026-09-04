"""Data service: fetches weather and air quality from Open-Meteo, stores in SQLite."""
import httpx
import os
from datetime import datetime, timedelta
from app.database.db import get_connection
from app.utils.aqi import calculate_aqi_from_pm25, calculate_composite_aqi

OPEN_METEO_API = os.getenv("OPEN_METEO_API_URL", "https://api.open-meteo.com/v1/forecast")
OPEN_METEO_AQ = os.getenv("OPEN_METEO_AIR_QUALITY_URL", "https://air-quality-api.open-meteo.com/v1/air-quality")
OPEN_METEO_GEO = os.getenv("OPEN_METEO_GEOCODING_URL", "https://geocoding-api.open-meteo.com/v1/search")


async def fetch_weather(lat: float, lon: float):
    """Fetch current weather from Open-Meteo."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,cloud_cover",
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,cloud_cover",
        "forecast_days": 3,
        "timezone": "auto"
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(OPEN_METEO_API, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"❌ Weather API error: {e}")
        return None


async def fetch_air_quality(lat: float, lon: float):
    """Fetch current air quality from Open-Meteo."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
        "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
        "forecast_days": 3,
        "timezone": "auto"
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(OPEN_METEO_AQ, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"❌ Air Quality API error: {e}")
        return None


async def search_locations(query: str):
    """Search locations using Open-Meteo Geocoding."""
    params = {"name": query, "count": 10, "language": "en", "format": "json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OPEN_METEO_GEO, params=params)
            resp.raise_for_status()
            data = resp.json()
            results = []
            for r in data.get("results", []):
                results.append({
                    "name": r.get("name", ""),
                    "latitude": r.get("latitude"),
                    "longitude": r.get("longitude"),
                    "country": r.get("country", ""),
                    "admin1": r.get("admin1", ""),
                })
            return results
    except Exception as e:
        print(f"❌ Geocoding API error: {e}")
        return []


def store_environmental_data(location_id: int, weather_data: dict, aq_data: dict, source: str = "open-meteo"):
    """Store combined weather + air quality data in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    current_w = weather_data.get("current", {}) if weather_data else {}
    current_aq = aq_data.get("current", {}) if aq_data else {}

    pm25 = current_aq.get("pm2_5")
    pm10 = current_aq.get("pm10")
    co = current_aq.get("carbon_monoxide")
    no2 = current_aq.get("nitrogen_dioxide")
    so2 = current_aq.get("sulphur_dioxide")
    o3 = current_aq.get("ozone")
    aqi = current_aq.get("us_aqi")

    if aqi is None and pm25 is not None:
        aqi = calculate_composite_aqi(pm25=pm25, pm10=pm10)

    temperature = current_w.get("temperature_2m")
    humidity = current_w.get("relative_humidity_2m")
    wind_speed = current_w.get("wind_speed_10m")
    pressure = current_w.get("surface_pressure")
    precipitation = current_w.get("precipitation")
    cloud_cover = current_w.get("cloud_cover")

    cursor.execute("""
        INSERT INTO environmental_data 
        (location_id, timestamp, pm25, pm10, co, no2, so2, o3, 
         temperature, humidity, wind_speed, pressure, precipitation, cloud_cover, aqi, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (location_id, now, pm25, pm10, co, no2, so2, o3,
          temperature, humidity, wind_speed, pressure, precipitation, cloud_cover, aqi, source))

    conn.commit()
    conn.close()

    return {
        "location_id": location_id,
        "timestamp": now,
        "pm25": pm25, "pm10": pm10, "co": co, "no2": no2, "so2": so2, "o3": o3,
        "temperature": temperature, "humidity": humidity, "wind_speed": wind_speed,
        "pressure": pressure, "precipitation": precipitation, "cloud_cover": cloud_cover,
        "aqi": aqi, "source": source
    }


def store_hourly_data(location_id: int, weather_data: dict, aq_data: dict, source: str = "open-meteo"):
    """Store hourly forecast data for charts."""
    conn = get_connection()
    cursor = conn.cursor()

    hourly_w = weather_data.get("hourly", {}) if weather_data else {}
    hourly_aq = aq_data.get("hourly", {}) if aq_data else {}

    times_w = hourly_w.get("time", [])
    times_aq = hourly_aq.get("time", [])

    # Use whichever has more data
    times = times_w if len(times_w) >= len(times_aq) else times_aq
    count = 0

    for i, t in enumerate(times):
        # Check if we already have data for this timestamp
        cursor.execute(
            "SELECT id FROM environmental_data WHERE location_id=? AND timestamp=?",
            (location_id, t)
        )
        if cursor.fetchone():
            continue

        pm25 = hourly_aq.get("pm2_5", [None] * len(times))[i] if i < len(hourly_aq.get("pm2_5", [])) else None
        pm10 = hourly_aq.get("pm10", [None] * len(times))[i] if i < len(hourly_aq.get("pm10", [])) else None
        co = hourly_aq.get("carbon_monoxide", [None] * len(times))[i] if i < len(hourly_aq.get("carbon_monoxide", [])) else None
        no2 = hourly_aq.get("nitrogen_dioxide", [None] * len(times))[i] if i < len(hourly_aq.get("nitrogen_dioxide", [])) else None
        so2 = hourly_aq.get("sulphur_dioxide", [None] * len(times))[i] if i < len(hourly_aq.get("sulphur_dioxide", [])) else None
        o3 = hourly_aq.get("ozone", [None] * len(times))[i] if i < len(hourly_aq.get("ozone", [])) else None
        aqi = hourly_aq.get("us_aqi", [None] * len(times))[i] if i < len(hourly_aq.get("us_aqi", [])) else None

        if aqi is None and pm25 is not None:
            aqi = calculate_composite_aqi(pm25=pm25, pm10=pm10)

        temperature = hourly_w.get("temperature_2m", [None] * len(times))[i] if i < len(hourly_w.get("temperature_2m", [])) else None
        humidity = hourly_w.get("relative_humidity_2m", [None] * len(times))[i] if i < len(hourly_w.get("relative_humidity_2m", [])) else None
        wind_speed = hourly_w.get("wind_speed_10m", [None] * len(times))[i] if i < len(hourly_w.get("wind_speed_10m", [])) else None
        pressure = hourly_w.get("surface_pressure", [None] * len(times))[i] if i < len(hourly_w.get("surface_pressure", [])) else None
        precipitation = hourly_w.get("precipitation", [None] * len(times))[i] if i < len(hourly_w.get("precipitation", [])) else None
        cloud_cover = hourly_w.get("cloud_cover", [None] * len(times))[i] if i < len(hourly_w.get("cloud_cover", [])) else None

        cursor.execute("""
            INSERT INTO environmental_data 
            (location_id, timestamp, pm25, pm10, co, no2, so2, o3,
             temperature, humidity, wind_speed, pressure, precipitation, cloud_cover, aqi, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (location_id, t, pm25, pm10, co, no2, so2, o3,
              temperature, humidity, wind_speed, pressure, precipitation, cloud_cover, aqi, source))
        count += 1

    conn.commit()
    conn.close()
    return count


async def sync_location_data(location_id: int = None):
    """Sync data for a specific location or all locations."""
    conn = get_connection()
    cursor = conn.cursor()

    if location_id:
        cursor.execute("SELECT * FROM locations WHERE id=?", (location_id,))
        locations = [cursor.fetchone()]
    else:
        cursor.execute("SELECT * FROM locations")
        locations = cursor.fetchall()

    conn.close()
    results = []

    for loc in locations:
        if loc is None:
            continue
        lat, lon = loc["latitude"], loc["longitude"]
        weather = await fetch_weather(lat, lon)
        aq = await fetch_air_quality(lat, lon)

        if weather or aq:
            current = store_environmental_data(loc["id"], weather, aq)
            hourly_count = store_hourly_data(loc["id"], weather, aq)
            results.append({
                "location": loc["name"],
                "status": "synced",
                "current": current,
                "hourly_records": hourly_count
            })
        else:
            results.append({
                "location": loc["name"],
                "status": "failed",
                "error": "Could not reach Open-Meteo APIs"
            })

    return results


def get_latest_data(location_id: int):
    """Get the most recent environmental data for a location."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM environmental_data 
        WHERE location_id=? 
        ORDER BY timestamp DESC LIMIT 1
    """, (location_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_historical_data(location_id: int, days: int = 7, limit: int = 500):
    """Get historical environmental data for a location."""
    conn = get_connection()
    cursor = conn.cursor()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    cursor.execute("""
        SELECT * FROM environmental_data 
        WHERE location_id=? AND timestamp >= ?
        ORDER BY timestamp ASC
        LIMIT ?
    """, (location_id, since, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
