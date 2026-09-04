"""ML Training Pipeline: Train, evaluate, and select best AQI prediction model."""
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.database.db import get_connection

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "trained_models")

FEATURES = [
    "pm25", "pm10", "co", "no2", "so2", "o3",
    "temperature", "humidity", "wind_speed", "pressure",
    "precipitation", "cloud_cover",
    "hour", "day", "month"
]


def get_training_data():
    """Load training data from SQLite."""
    conn = get_connection()
    df = pd.read_sql_query(
        "SELECT * FROM environmental_data WHERE aqi IS NOT NULL ORDER BY timestamp",
        conn
    )
    conn.close()

    if len(df) == 0:
        return None

    # Feature engineering: extract time features
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", utc=True)
    df["hour"] = df["timestamp"].dt.hour
    df["day"] = df["timestamp"].dt.day
    df["month"] = df["timestamp"].dt.month

    return df


def prepare_features(df):
    """Prepare feature matrix and target."""
    available_features = [f for f in FEATURES if f in df.columns]
    X = df[available_features].copy()
    y = df["aqi"].copy()

    # Remove rows where target is NaN
    mask = y.notna()
    X = X[mask]
    y = y[mask]

    return X, y, available_features


def train_models():
    """Train all models and select the best one."""
    print("📊 Loading training data...")
    df = get_training_data()

    if df is None or len(df) < 10:
        print("❌ Not enough training data. Need at least 10 records with AQI values.")
        return None

    print(f"📊 Loaded {len(df)} records")

    X, y, feature_names = prepare_features(df)
    print(f"📊 Features: {feature_names}")
    print(f"📊 Training samples: {len(X)}")

    if len(X) < 10:
        print("❌ Not enough valid samples after cleaning.")
        return None

    # Impute missing values
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    print(f"📊 Train: {len(X_train)}, Test: {len(X_test)}")

    # Define models
    models = {
        "linear_regression": LinearRegression(),
        "random_forest": RandomForestRegressor(
            n_estimators=100, max_depth=15, random_state=42, n_jobs=-1
        ),
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42
        ),
    }

    # Create models directory
    os.makedirs(MODELS_DIR, exist_ok=True)

    results = {}
    best_rmse = float("inf")
    best_model_name = None

    conn = get_connection()
    cursor = conn.cursor()

    for name, model in models.items():
        print(f"\n🔧 Training {name}...")
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        print(f"   MAE:  {mae:.4f}")
        print(f"   RMSE: {rmse:.4f}")
        print(f"   R²:   {r2:.4f}")

        # Save model
        model_path = os.path.join(MODELS_DIR, f"{name}.pkl")
        joblib.dump(model, model_path)

        # Store metrics in DB
        cursor.execute("""
            INSERT INTO model_metrics (model_name, mae, rmse, r2, trained_at)
            VALUES (?, ?, ?, ?, ?)
        """, (name, round(mae, 4), round(rmse, 4), round(r2, 4), datetime.utcnow().isoformat()))

        results[name] = {"mae": mae, "rmse": rmse, "r2": r2}

        if rmse < best_rmse:
            best_rmse = rmse
            best_model_name = name

    conn.commit()
    conn.close()

    # Save best model
    if best_model_name:
        best_model = models[best_model_name]
        joblib.dump(best_model, os.path.join(MODELS_DIR, "best_model.pkl"))

        # Generate sample of actual vs predicted for frontend evaluation
        sample_size = min(100, len(y_test))
        indices = np.random.choice(len(y_test), sample_size, replace=False)
        actual_sample = y_test.iloc[indices].values.tolist()
        predicted_sample = best_model.predict(X_test[indices]).tolist()
        actual_vs_predicted = [{"actual": round(float(a), 2), "predicted": round(float(p), 2)} for a, p in zip(actual_sample, predicted_sample)]

        # Save metadata
        metadata = {
            "best_model": best_model_name,
            "features": feature_names,
            "metrics": {k: {mk: round(mv, 4) for mk, mv in v.items()} for k, v in results.items()},
            "trained_at": datetime.utcnow().isoformat(),
            "training_samples": len(X),
            "actual_vs_predicted": actual_vs_predicted
        }
        with open(os.path.join(MODELS_DIR, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)

        # Save scaler and imputer
        joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
        joblib.dump(imputer, os.path.join(MODELS_DIR, "imputer.pkl"))

        print(f"\n✅ Best model: {best_model_name} (RMSE: {best_rmse:.4f})")

    return results


def get_feature_importance():
    """Get feature importance from the best model."""
    metadata_path = os.path.join(MODELS_DIR, "metadata.json")
    if not os.path.exists(metadata_path):
        return None

    with open(metadata_path) as f:
        metadata = json.load(f)

    best_name = metadata.get("best_model", "random_forest")
    model_path = os.path.join(MODELS_DIR, f"{best_name}.pkl")

    if not os.path.exists(model_path):
        return None

    model = joblib.load(model_path)
    features = metadata.get("features", FEATURES)

    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "coef_"):
        importances = np.abs(model.coef_)
    else:
        return None

    # Normalize
    total = sum(importances)
    if total > 0:
        importances = importances / total

    result = []
    for i, feat in enumerate(features):
        if i < len(importances):
            result.append({"feature": feat, "importance": round(float(importances[i]), 4)})

    result.sort(key=lambda x: x["importance"], reverse=True)
    return result


if __name__ == "__main__":
    print("🚀 Starting ML Training Pipeline...")
    results = train_models()
    if results:
        print("\n📊 Training Complete!")
        for name, metrics in results.items():
            print(f"  {name}: MAE={metrics['mae']:.4f}, RMSE={metrics['rmse']:.4f}, R²={metrics['r2']:.4f}")
    else:
        print("❌ Training failed. Generate training data first.")
