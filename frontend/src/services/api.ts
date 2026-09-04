const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

export const api = {
  // Health
  health: () => fetchAPI('/api/health'),

  // Locations
  getLocations: () => fetchAPI('/api/locations'),
  searchLocations: (query: string) => fetchAPI(`/api/locations?search=${encodeURIComponent(query)}`),

  // Air Quality
  getAirQuality: (lat: number, lon: number, locationId?: number) =>
    fetchAPI(`/api/air-quality?lat=${lat}&lon=${lon}${locationId ? `&location_id=${locationId}` : ''}`),

  // Weather
  getWeather: (lat: number, lon: number) =>
    fetchAPI(`/api/weather?lat=${lat}&lon=${lon}`),

  // Environmental Data
  getEnvironmentalData: (locationId: number, days = 7, limit = 500) =>
    fetchAPI(`/api/environmental-data?location_id=${locationId}&days=${days}&limit=${limit}`),

  // History
  getHistory: (locationId: number, days = 30, limit = 1000) =>
    fetchAPI(`/api/history?location_id=${locationId}&days=${days}&limit=${limit}`),

  // Prediction
  getPrediction: (locationId: number) =>
    fetchAPI(`/api/prediction?location_id=${locationId}`),

  createPrediction: (locationId: number, lat?: number, lon?: number) =>
    fetchAPI(`/api/prediction?location_id=${locationId}${lat ? `&lat=${lat}&lon=${lon}` : ''}`, { method: 'POST' }),

  // Model Metrics
  getModelMetrics: () => fetchAPI('/api/model-metrics'),

  // Feature Importance
  getFeatureImportance: () => fetchAPI('/api/feature-importance'),

  // Compare Locations
  compareLocations: (ids: number[]) =>
    fetchAPI(`/api/locations/compare?ids=${ids.join(',')}`),

  // Export
  exportData: (locationId: number, days = 30) =>
    `${API_BASE}/api/export?location_id=${locationId}&days=${days}`,

  // Data Sync
  syncData: (locationId?: number) =>
    fetchAPI(`/api/data/sync${locationId ? `?location_id=${locationId}` : ''}`, { method: 'POST' }),

  // Train
  trainModels: () => fetchAPI('/api/train', { method: 'POST' }),
};
