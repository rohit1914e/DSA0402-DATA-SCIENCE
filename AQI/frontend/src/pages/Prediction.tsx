import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { Location, getAQICategory, PredictionResult, FeatureImportance } from '../types';
import { generatePredictionExplanation } from '../utils/helpers';

interface Props {
  location: Location;
}

export default function Prediction({ location }: Props) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [envData, setEnvData] = useState<any>(null);
  const [featureImp, setFeatureImp] = useState<FeatureImportance[]>([]);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      // Get current environmental data
      const envRes = await api.getEnvironmentalData(location.id, 1, 1);
      const latestEnv = envRes.data?.[envRes.data.length - 1] || {};
      setEnvData(latestEnv);

      // Get prediction
      const pred = await api.createPrediction(location.id, location.latitude, location.longitude);
      if (!pred.error) setPrediction(pred);
      else setPrediction(pred);

      // Get feature importance
      try {
        const fi = await api.getFeatureImportance();
        setFeatureImp(fi.features || []);
      } catch {}

      // Generate explanation
      if (!pred.error) {
        const expl = generatePredictionExplanation(pred.predicted_aqi, latestEnv, featureImp);
        setExplanation(expl);
      }
    } catch (e: any) {
      setPrediction({ error: e.message } as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPrediction(); }, [location]);

  useEffect(() => {
    if (prediction && !prediction.error && envData) {
      setExplanation(generatePredictionExplanation(prediction.predicted_aqi, envData, featureImp));
    }
  }, [prediction, envData, featureImp]);

  const cat = prediction && !prediction.error ? getAQICategory(prediction.predicted_aqi) : null;

  const envInputs = [
    { label: 'PM2.5', key: 'pm25', unit: 'μg/m³', color: '#ef4444' },
    { label: 'PM10', key: 'pm10', unit: 'μg/m³', color: '#f97316' },
    { label: 'CO', key: 'co', unit: 'μg/m³', color: '#eab308' },
    { label: 'NO₂', key: 'no2', unit: 'μg/m³', color: '#a855f7' },
    { label: 'SO₂', key: 'so2', unit: 'μg/m³', color: '#3b82f6' },
    { label: 'O₃', key: 'o3', unit: 'μg/m³', color: '#22c55e' },
    { label: 'Temperature', key: 'temperature', unit: '°C', color: '#f97316' },
    { label: 'Humidity', key: 'humidity', unit: '%', color: '#06b6d4' },
    { label: 'Wind Speed', key: 'wind_speed', unit: 'km/h', color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AQI Prediction</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{location.name}, {location.country}</p>
        </div>
        <button onClick={fetchPrediction} disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--accent)', color: 'white', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Predicting...' : 'Run Prediction'}
        </button>
      </div>

      {/* Environmental Inputs */}
      <div className="glass-card">
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Environmental Inputs Used for Prediction
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
          {envInputs.map((inp, i) => (
            <motion.div key={inp.key} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <p className="text-[10px] font-semibold" style={{ color: inp.color }}>{inp.label}</p>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {envData?.[inp.key] != null ? Number(envData[inp.key]).toFixed(1) : '—'}
              </p>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{inp.unit}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Environmental Data</div>
        <span>→</span>
        <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Feature Vector</div>
        <span>→</span>
        <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: 'white' }}>ML Model</div>
        <span>→</span>
        <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Predicted AQI</div>
        <span>→</span>
        <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Category</div>
      </div>

      {/* Prediction Result */}
      {prediction && !prediction.error ? (
        <motion.div className="glass-card text-center py-8" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Predicted AQI</p>
          <div className="text-6xl font-extrabold mb-3" style={{ color: cat?.color }}>{prediction.predicted_aqi}</div>
          <div className="aqi-badge mx-auto w-fit text-base" style={{ background: (cat?.color || '') + '22', color: cat?.color }}>
            {prediction.category}
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Model: {prediction.model_name?.replace(/_/g, ' ')} • Predicted at: {new Date(prediction.predicted_at).toLocaleString()}
          </p>
        </motion.div>
      ) : prediction?.error ? (
        <div className="glass-card text-center py-8">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>⚠️ {prediction.error}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Generate training data and train the model first.</p>
        </div>
      ) : null}

      {/* Explanation */}
      {explanation && (
        <div className="glass-card">
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Prediction Explanation</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{explanation}</p>
        </div>
      )}

      {/* Feature Importance */}
      {featureImp.length > 0 && (
        <div className="glass-card">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Environmental Factors Affecting AQI Prediction
          </h3>
          <div className="space-y-2">
            {featureImp.map((f, i) => {
              const maxImp = featureImp[0]?.importance || 1;
              const pct = (f.importance / maxImp) * 100;
              const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#10b981', '#f43f5e'];
              return (
                <motion.div key={f.feature} className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <span className="text-xs font-mono w-24 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {f.feature.toUpperCase().replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-6 rounded" style={{ background: 'var(--bg-primary)' }}>
                    <div className="feature-bar h-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                  <span className="text-xs font-mono w-14" style={{ color: 'var(--text-muted)' }}>
                    {(f.importance * 100).toFixed(1)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
