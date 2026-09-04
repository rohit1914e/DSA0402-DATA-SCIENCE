import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wind, Droplets, Thermometer, Cloud, RefreshCw, MapPin, Search,
  TrendingUp, AlertTriangle, Activity, Gauge
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { useDashboardData, useLocalStorage } from '../hooks/useData';
import { api } from '../services/api';
import { Location, getAQICategory } from '../types';

interface Props {
  location: Location;
  setLocation: (loc: Location) => void;
}

export default function Dashboard({ location, setLocation }: Props) {
  const { airQuality, weather, prediction, history, loading, error, lastUpdated, refresh } = useDashboardData(location.id, location.latitude, location.longitude);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.getLocations().then(r => setLocations(r.locations || [])).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchLocations(searchQuery);
      setSearchResults(res.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const selectSearchResult = async (r: any) => {
    const newLoc: Location = { id: 0, name: r.name, latitude: r.latitude, longitude: r.longitude, country: r.country };
    // Check if location already exists
    const existing = locations.find(l => Math.abs(l.latitude - r.latitude) < 0.01 && Math.abs(l.longitude - r.longitude) < 0.01);
    if (existing) {
      setLocation(existing);
    } else {
      newLoc.id = locations.length + 1;
      setLocation(newLoc);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const aqi = airQuality?.aqi ?? 0;
  const cat = getAQICategory(aqi);

  const trendData = history.slice(-24).map((h, i) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    aqi: h.aqi, pm25: h.pm25, pm10: h.pm10, temperature: h.temperature,
  }));

  const pollutants = [
    { key: 'pm25', label: 'PM2.5', value: airQuality?.pm25, unit: 'μg/m³', icon: '🔴', color: '#ef4444' },
    { key: 'pm10', label: 'PM10', value: airQuality?.pm10, unit: 'μg/m³', icon: '🟠', color: '#f97316' },
    { key: 'co', label: 'CO', value: airQuality?.co, unit: 'μg/m³', icon: '🟡', color: '#eab308' },
    { key: 'no2', label: 'NO₂', value: airQuality?.no2, unit: 'μg/m³', icon: '🟣', color: '#a855f7' },
    { key: 'so2', label: 'SO₂', value: airQuality?.so2, unit: 'μg/m³', icon: '🔵', color: '#3b82f6' },
    { key: 'o3', label: 'O₃', value: airQuality?.o3, unit: 'μg/m³', icon: '🟢', color: '#22c55e' },
  ];

  const weatherVars = [
    { label: 'Temperature', value: weather?.temperature, unit: '°C', icon: <Thermometer className="w-5 h-5" />, color: '#f97316' },
    { label: 'Humidity', value: weather?.humidity, unit: '%', icon: <Droplets className="w-5 h-5" />, color: '#3b82f6' },
    { label: 'Wind Speed', value: weather?.wind_speed, unit: 'km/h', icon: <Wind className="w-5 h-5" />, color: '#22c55e' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Air Quality Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--text-secondary)' }}>
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{location.name}, {location.country}</span>
            {lastUpdated && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>• Updated {lastUpdated}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Location Search */}
          <div className="relative">
            <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search location..."
                className="px-3 py-2 text-sm bg-transparent outline-none w-40"
                style={{ color: 'var(--text-primary)' }}
              />
              <button onClick={handleSearch} className="p-2" style={{ color: 'var(--text-muted)' }}>
                <Search className="w-4 h-4" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden z-50 shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => selectSearchResult(r)} className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                    {r.name}, {r.country}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Location selector */}
          <select
            value={location.id}
            onChange={e => {
              const loc = locations.find(l => l.id === Number(e.target.value));
              if (loc) setLocation(loc);
            }}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button onClick={refresh} className="p-2 rounded-xl transition-colors" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card flex items-center gap-3 border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}. Using cached data if available.</p>
        </div>
      )}

      {/* AQI Hero + Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AQI Gauge */}
        <motion.div className="glass-card flex flex-col items-center justify-center py-8"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Current AQI</p>
          <div className="aqi-gauge" style={{ background: `conic-gradient(${cat.color} ${(aqi / 500) * 360}deg, var(--border) 0deg)` }}>
            <span className="aqi-gauge-value" style={{ color: cat.color }}>{Math.round(aqi)}</span>
          </div>
          <div className="aqi-badge mt-4" style={{ background: cat.color + '22', color: cat.color }}>
            <span className="pulse-dot" style={{ background: cat.color }} />
            {cat.category}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>AQI Standard: US AQI</p>
          {airQuality?.source === 'cached' && (
            <p className="text-xs mt-1 text-yellow-500">⚠️ Cached data</p>
          )}
        </motion.div>

        {/* Prediction */}
        <motion.div className="glass-card flex flex-col justify-center"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ML Prediction</h3>
          </div>
          {prediction && !prediction.error ? (
            <>
              <div className="text-4xl font-bold mb-2" style={{ color: prediction.color }}>
                {prediction.predicted_aqi}
              </div>
              <div className="aqi-badge w-fit" style={{ background: prediction.color + '22', color: prediction.color }}>
                {prediction.category}
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                Model: {prediction.model_name?.replace(/_/g, ' ')}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {prediction?.error || 'Train the ML model to see predictions'}
            </p>
          )}
        </motion.div>

        {/* AQI Trend */}
        <motion.div className="glass-card"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent AQI Trend</h3>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="aqi" stroke="#3b82f6" fill="url(#aqiGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Environmental Conditions Panel */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Environmental Conditions
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Air Pollution Data & Meteorological Data used for AQI prediction
        </p>

        {/* Pollutants */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Air Pollutants</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {pollutants.map((p, i) => (
            <motion.div key={p.key} className="glass-card text-center"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
              <span className="text-lg">{p.icon}</span>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{p.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: p.color }}>
                {p.value != null ? (typeof p.value === 'number' ? p.value.toFixed(1) : p.value) : '—'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.unit}</p>
            </motion.div>
          ))}
        </div>

        {/* Weather */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Meteorological Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weatherVars.map((w, i) => (
            <motion.div key={w.label} className="glass-card flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}>
              <div className="p-3 rounded-xl" style={{ background: w.color + '22', color: w.color }}>
                {w.icon}
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {w.value != null ? (typeof w.value === 'number' ? w.value.toFixed(1) : w.value) : '—'}
                  <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{w.unit}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* PM2.5 & PM10 trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>PM2.5 Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="pm25" stroke="#ef4444" strokeWidth={2} dot={false} name="PM2.5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>PM10 Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="pm10" stroke="#f97316" strokeWidth={2} dot={false} name="PM10" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {airQuality?.source === 'synthetic-development' && (
        <div className="glass-card text-center text-xs" style={{ color: 'var(--text-muted)', borderColor: '#f59e0b44' }}>
          ⚠️ Development / Synthetic Dataset — This data is for model training, not real-world measurements.
        </div>
      )}
    </div>
  );
}

function Brain(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
      <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
      <path d="M6 18a4 4 0 0 1-1.967-.516"/>
      <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
    </svg>
  );
}
