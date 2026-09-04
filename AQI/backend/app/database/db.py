"""Database initialization and connection management for SQLite."""
import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/aqi.db")


def get_db_path():
    """Get absolute path to the database file."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, "data", "aqi.db")
    return db_path


def get_connection():
    """Get a SQLite connection."""
    db_path = get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize database tables and default data."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            country TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS environmental_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            pm25 REAL,
            pm10 REAL,
            co REAL,
            no2 REAL,
            so2 REAL,
            o3 REAL,
            temperature REAL,
            humidity REAL,
            wind_speed REAL,
            pressure REAL,
            precipitation REAL,
            cloud_cover REAL,
            aqi REAL,
            source TEXT DEFAULT 'open-meteo',
            FOREIGN KEY (location_id) REFERENCES locations(id)
        );

        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER NOT NULL,
            timestamp TEXT DEFAULT (datetime('now')),
            predicted_for TEXT,
            predicted_aqi REAL,
            model_name TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (location_id) REFERENCES locations(id)
        );

        CREATE TABLE IF NOT EXISTS model_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            mae REAL,
            rmse REAL,
            r2 REAL,
            trained_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_env_data_location ON environmental_data(location_id);
        CREATE INDEX IF NOT EXISTS idx_env_data_timestamp ON environmental_data(timestamp);
        CREATE INDEX IF NOT EXISTS idx_predictions_location ON predictions(location_id);
    """)

    # Insert default locations if empty
    cursor.execute("SELECT COUNT(*) FROM locations")
    count = cursor.fetchone()[0]
    if count == 0:
        default_locations = [
            ("Chennai", 13.0827, 80.2707, "India"),
            ("Delhi", 28.6139, 77.2090, "India"),
            ("Mumbai", 19.0760, 72.8777, "India"),
            ("Bangalore", 12.9716, 77.5946, "India"),
            ("Kolkata", 22.5726, 88.3639, "India"),
            ("Hyderabad", 17.3850, 78.4867, "India"),
            ("London", 51.5074, -0.1278, "United Kingdom"),
            ("New York", 40.7128, -74.0060, "United States"),
            ("Beijing", 39.9042, 116.4074, "China"),
            ("Tokyo", 35.6762, 139.6503, "Japan"),
        ]
        cursor.executemany(
            "INSERT INTO locations (name, latitude, longitude, country) VALUES (?, ?, ?, ?)",
            default_locations
        )

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")
