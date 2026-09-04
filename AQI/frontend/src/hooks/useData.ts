import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { EnvironmentalData, AirQualityData, WeatherData, Location, PredictionResult } from '../types';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function useTheme() {
  const [dark, setDark] = useLocalStorage('theme', true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);

  return { dark, toggle: () => setDark(!dark) };
}

export function useDashboardData(locationId: number, lat: number, lon: number) {
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<EnvironmentalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aqRes, wRes, histRes] = await Promise.allSettled([
        api.getAirQuality(lat, lon, locationId),
        api.getWeather(lat, lon),
        api.getHistory(locationId, 7, 200),
      ]);

      if (aqRes.status === 'fulfilled' && !aqRes.value.error) setAirQuality(aqRes.value as AirQualityData);
      if (wRes.status === 'fulfilled' && !wRes.value.error) setWeather(wRes.value as WeatherData);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data || []);

      // Try prediction
      try {
        const pred = await api.getPrediction(locationId);
        if (!pred.error) setPrediction(pred as PredictionResult);
      } catch {}

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [locationId, lat, lon]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { airQuality, weather, prediction, history, loading, error, lastUpdated, refresh: fetchAll };
}
