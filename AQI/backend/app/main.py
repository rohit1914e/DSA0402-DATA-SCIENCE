"""FastAPI Main Application - Air Quality Index Prediction."""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.database.db import init_db
from app.api.routes import router
from app.services.data_service import sync_location_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    print("🚀 Starting AQI Prediction Backend...")

    # 1. Initialize database
    init_db()

    # 2. Fetch initial data for default location (Chennai)
    print("📡 Fetching initial environmental data...")
    try:
        results = await sync_location_data(location_id=1)
        for r in results:
            print(f"   {r.get('location', 'Unknown')}: {r.get('status', 'unknown')}")
    except Exception as e:
        print(f"⚠️ Initial data sync failed (will retry on request): {e}")

    # 3. Train models if not already trained
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "trained_models")
    if not os.path.exists(os.path.join(models_dir, "best_model.pkl")):
        print("🤖 No trained model found. Will train after data collection.")

    print("✅ Backend ready!")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="AQI Prediction API",
    description="Air Quality Index Prediction using Environmental Data Analytics",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "AQI Prediction API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
