"""API routes for the AQI application."""
import csv
import io
import json
import os
from datetime import datetime
from fastapi import APIRouter, Query, Response
from fastapi.responses import StreamingResponse

from app.database.db import get_connection
from app.services.data_service import (
    fetch_weather, fetch_air_quality, search_locations,
    store_environmental_data, sync_location_data,
    get_latest_data, get_historical_data
)
from app.ml.predict import predict_aqi, load_model
from app.ml.train import get_feature_importance, train_models, MODELS_DIR
from app.utils.aqi import get_aqi_category

router = APIRouter(prefix="/api")


@router.get("/health")
async def health():
    """Health check endpoint."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM locations")
    loc_count = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM environmental_data")
    data_count = cursor.fetchone()["count"]
    conn.close()

    model_available = os.path.exists(os.path.join(MODELS_DIR, "best_model.pkl"))

    return {
        "status": "healthy",
        "database": "connected",
        "locations": loc_count,
        "data_records": data_count,
        "model_available": model_available,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/locations")
async def get_locations(search: str = None):
    """Get locations or search for new ones."""
    if search:
        results = await search_locations(search)
        return {"results": results, "source": "geocoding"}

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations ORDER BY name")
    locations = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"locations": locations}


@router.get("/air-quality")
async def get_air_quality(lat: float = 13.0827, lon: float = 80.2707, location_id: int = None):
    """Get current air quality data."""
    aq_data = await fetch_air_quality(lat, lon)

    if location_id and aq_data:
        weather = await fetch_weather(lat, lon)
        store_environmental_data(location_id, weather, aq_data)

    if aq_data:
        current = aq_data.get("current", {})
        aqi = current.get("us_aqi", 0)
        category = get_aqi_category(aqi)
        return {
            "pm25": current.get("pm2_5"),
            "pm10": current.get("pm10"),
            "co": current.get("carbon_monoxide"),
            "no2": current.get("nitrogen_dioxide"),
            "so2": current.get("sulphur_dioxide"),
            "o3": current.get("ozone"),
            "aqi": aqi,
            "category": category["category"],
            "color": category["color"],
            "level": category["level"],
            "source": "open-meteo",
            "timestamp": datetime.utcnow().isoformat()
        }

    # Fallback to stored data
    if location_id:
        stored = get_latest_data(location_id)
        if stored:
            cat = get_aqi_category(stored.get("aqi", 0))
            stored["category"] = cat["category"]
            stored["color"] = cat["color"]
            stored["level"] = cat["level"]
            stored["source"] = "cached"
            return stored

    return {"error": "Air quality data unavailable", "source": "none"}


@router.get("/weather")
async def get_weather(lat: float = 13.0827, lon: float = 80.2707):
    """Get current weather data."""
    weather = await fetch_weather(lat, lon)
    if weather:
        current = weather.get("current", {})
        return {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "pressure": current.get("surface_pressure"),
            "precipitation": current.get("precipitation"),
            "cloud_cover": current.get("cloud_cover"),
            "source": "open-meteo",
            "timestamp": datetime.utcnow().isoformat()
        }
    return {"error": "Weather data unavailable"}


@router.get("/environmental-data")
async def get_environmental_data(location_id: int = 1, days: int = 7, limit: int = 500):
    """Get environmental data for a location."""
    data = get_historical_data(location_id, days=days, limit=limit)

    # Get location info
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations WHERE id=?", (location_id,))
    loc = cursor.fetchone()
    conn.close()

    return {
        "location": dict(loc) if loc else None,
        "data": data,
        "count": len(data)
    }


@router.get("/history")
async def get_history(location_id: int = 1, days: int = 30, limit: int = 1000):
    """Get historical data for charts."""
    data = get_historical_data(location_id, days=days, limit=limit)
    return {"data": data, "count": len(data)}


@router.get("/prediction")
async def get_prediction(location_id: int = 1):
    """Get AQI prediction for a location."""
    result = predict_aqi(location_id)
    return result


@router.post("/prediction")
async def create_prediction(location_id: int = 1, lat: float = None, lon: float = None):
    """Create a new prediction after fetching latest data."""
    if lat and lon:
        weather = await fetch_weather(lat, lon)
        aq = await fetch_air_quality(lat, lon)
        if weather or aq:
            store_environmental_data(location_id, weather, aq)

    result = predict_aqi(location_id)
    return result


@router.get("/model-metrics")
async def get_model_metrics():
    """Get model performance metrics."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get latest metrics for each model
    cursor.execute("""
        SELECT m1.* FROM model_metrics m1
        INNER JOIN (
            SELECT model_name, MAX(trained_at) as latest
            FROM model_metrics GROUP BY model_name
        ) m2 ON m1.model_name = m2.model_name AND m1.trained_at = m2.latest
        ORDER BY m1.rmse ASC
    """)
    metrics = [dict(r) for r in cursor.fetchall()]
    conn.close()

    best_model = metrics[0]["model_name"] if metrics else None

    # Load metadata
    metadata_path = os.path.join(MODELS_DIR, "metadata.json")
    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            metadata = json.load(f)

    return {
        "metrics": metrics,
        "best_model": best_model,
        "training_info": metadata
    }


@router.get("/feature-importance")
async def feature_importance():
    """Get feature importance from the best model."""
    importance = get_feature_importance()
    if importance:
        return {"features": importance}
    return {"features": [], "message": "No model trained yet"}


@router.get("/locations/compare")
async def compare_locations(ids: str = "1,2"):
    """Compare environmental data across multiple locations."""
    location_ids = [int(x.strip()) for x in ids.split(",")]
    conn = get_connection()
    cursor = conn.cursor()

    results = []
    for lid in location_ids:
        cursor.execute("SELECT * FROM locations WHERE id=?", (lid,))
        loc = cursor.fetchone()
        if not loc:
            continue

        latest = get_latest_data(lid)
        category = get_aqi_category(latest.get("aqi", 0)) if latest else {"category": "Unknown", "color": "#9e9e9e"}

        results.append({
            "location": dict(loc),
            "latest_data": latest,
            "category": category
        })

    conn.close()
    return {"comparisons": results}


@router.get("/export")
async def export_data(location_id: int = 1, days: int = 30, format: str = "csv"):
    """Export data as CSV."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM locations WHERE id=?", (location_id,))
    loc = cursor.fetchone()
    location_name = loc["name"] if loc else "unknown"

    data = get_historical_data(location_id, days=days, limit=10000)

    if not data:
        return {"error": "No data available for export"}

    # Build CSV
    output = io.StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        for row in data:
            writer.writerow(row)

    output.seek(0)
    filename = f"aqi_data_{location_name}_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/data/sync")
async def sync_data(location_id: int = None):
    """Sync data from Open-Meteo for locations."""
    results = await sync_location_data(location_id)
    return {"results": results, "synced_at": datetime.utcnow().isoformat()}


@router.post("/train")
async def trigger_training():
    """Trigger ML model training."""
    results = train_models()
    if results:
        return {
            "status": "success",
            "models": {k: {mk: round(mv, 4) for mk, mv in v.items()} for k, v in results.items()}
        }
    return {"status": "failed", "message": "Not enough training data"}
