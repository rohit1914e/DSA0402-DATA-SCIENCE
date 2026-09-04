"""Prediction service: load trained model and predict AQI."""
import os
import json
import joblib
import numpy as np
from datetime import datetime
from app.database.db import get_connection

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "trained_models")


def load_model():
    """Load the best trained model and preprocessors."""
    best_path = os.path.join(MODELS_DIR, "best_model.pkl")
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    imputer_path = os.path.join(MODELS_DIR, "imputer.pkl")
    metadata_path = os.path.join(MODELS_DIR, "metadata.json")

    if not os.path.exists(best_path):
        return None, None, None, None

    model = joblib.load(best_path)
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    imputer = joblib.load(imputer_path) if os.path.exists(imputer_path) else None

    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            metadata = json.load(f)

    return model, scaler, imputer, metadata


def predict_aqi(location_id: int, env_data: dict = None):
    """Predict AQI for a location using current environmental data."""
    model, scaler, imputer, metadata = load_model()

    if model is None:
        return {"error": "No trained model available. Please train the model first."}

    # Get latest data if not provided
    if env_data is None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM environmental_data 
            WHERE location_id=? ORDER BY timestamp DESC LIMIT 1
        """, (location_id,))
        row = cursor.fetchone()
        conn.close()

        if row is None:
            return {"error": "No environmental data available for this location."}

        env_data = dict(row)

    features = metadata.get("features", [
        "pm25", "pm10", "co", "no2", "so2", "o3",
        "temperature", "humidity", "wind_speed", "pressure",
        "precipitation", "cloud_cover", "hour", "day", "month"
    ])

    # Add time features
    now = datetime.utcnow()
    env_data.setdefault("hour", now.hour)
    env_data.setdefault("day", now.day)
    env_data.setdefault("month", now.month)

    # Build feature vector
    feature_vector = []
    for f in features:
        val = env_data.get(f)
        feature_vector.append(val if val is not None else 0.0)

    X = np.array([feature_vector])

    # Apply preprocessing
    if imputer:
        X = imputer.transform(X)
    if scaler:
        X = scaler.transform(X)

    predicted_aqi = float(model.predict(X)[0])
    predicted_aqi = max(0, min(500, round(predicted_aqi, 1)))

    # Get AQI category
    from app.utils.aqi import get_aqi_category
    category_info = get_aqi_category(predicted_aqi)

    # Store prediction
    conn = get_connection()
    cursor = conn.cursor()
    best_model_name = metadata.get("best_model", "unknown")
    cursor.execute("""
        INSERT INTO predictions (location_id, predicted_for, predicted_aqi, model_name)
        VALUES (?, ?, ?, ?)
    """, (location_id, now.isoformat(), predicted_aqi, best_model_name))
    conn.commit()
    conn.close()

    return {
        "location_id": location_id,
        "predicted_aqi": predicted_aqi,
        "category": category_info["category"],
        "color": category_info["color"],
        "level": category_info["level"],
        "model_name": best_model_name,
        "predicted_at": now.isoformat(),
        "features_used": features,
    }
