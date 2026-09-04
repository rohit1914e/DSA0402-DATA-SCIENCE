export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  created_at?: string;
}

export interface EnvironmentalData {
  id?: number;
  location_id: number;
  timestamp: string;
  pm25: number | null;
  pm10: number | null;
  co: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  pressure?: number | null;
  precipitation?: number | null;
  cloud_cover?: number | null;
  aqi: number | null;
  source?: string;
}

export interface AirQualityData {
  pm25: number | null;
  pm10: number | null;
  co: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  aqi: number;
  category: string;
  color: string;
  level: number;
  source: string;
  timestamp: string;
}

export interface WeatherData {
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  pressure?: number | null;
  precipitation?: number | null;
  cloud_cover?: number | null;
  source: string;
  timestamp: string;
}

export interface PredictionResult {
  location_id: number;
  predicted_aqi: number;
  category: string;
  color: string;
  level: number;
  model_name: string;
  predicted_at: string;
  features_used?: string[];
  error?: string;
}

export interface ModelMetric {
  id: number;
  model_name: string;
  mae: number;
  rmse: number;
  r2: number;
  trained_at: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface AQICategory {
  category: string;
  color: string;
  level: number;
  range: string;
}

export const AQI_CATEGORIES: AQICategory[] = [
  { category: 'Good', color: '#00e400', level: 1, range: '0-50' },
  { category: 'Moderate', color: '#ffff00', level: 2, range: '51-100' },
  { category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', level: 3, range: '101-150' },
  { category: 'Unhealthy', color: '#ff0000', level: 4, range: '151-200' },
  { category: 'Very Unhealthy', color: '#8f3f97', level: 5, range: '201-300' },
  { category: 'Hazardous', color: '#7e0023', level: 6, range: '301-500' },
];

export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return AQI_CATEGORIES[0];
  if (aqi <= 100) return AQI_CATEGORIES[1];
  if (aqi <= 150) return AQI_CATEGORIES[2];
  if (aqi <= 200) return AQI_CATEGORIES[3];
  if (aqi <= 300) return AQI_CATEGORIES[4];
  return AQI_CATEGORIES[5];
}

export interface HealthStatus {
  status: string;
  database: string;
  locations: number;
  data_records: number;
  model_available: boolean;
  timestamp: string;
}
