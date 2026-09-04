import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Legend, LineChart, Line
} from 'recharts';
import { api } from '../services/api';
import { ModelMetric, FeatureImportance } from '../types';
import { formatVariableName } from '../utils/helpers';

export default function ModelPerformance() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [featureImp, setFeatureImp] = useState<FeatureImportance[]>([]);
  const [trainingInfo, setTrainingInfo] = useState<any>({});
  const [bestModel, setBestModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, fRes] = await Promise.all([
        api.getModelMetrics(),
        api.getFeatureImportance(),
      ]);
      setMetrics(mRes.metrics || []);
      setBestModel(mRes.best_model || '');
      setTrainingInfo(mRes.training_info || {});
      setFeatureImp(fRes.features || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleTrain = async () => {
    setTraining(true);
    try {
      await api.trainModels();
      await fetchData();
    } catch {}
    setTraining(false);
  };

  const metricChartData = metrics.map(m => ({
    name: m.model_name.replace(/_/g, ' '),
    MAE: m.mae,
    RMSE: m.rmse,
    R2: m.r2,
  }));

  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f43f5e', '#10b981', '#eab308'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Model Performance</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>ML model evaluation metrics</p>
        </div>
        <button onClick={handleTrain} disabled={training}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'white', opacity: training ? 0.6 : 1 }}>
          {training ? 'Training...' : 'Retrain Models'}
        </button>
      </div>

      {loading ? (
        <div className="glass-card text-center py-10"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>
      ) : metrics.length === 0 ? (
        <div className="glass-card text-center py-10">
          <p style={{ color: 'var(--text-muted)' }}>No trained models found. Click "Retrain Models" to train.</p>
        </div>
      ) : (
        <>
          {/* Best Model */}
          <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Best Performing Model</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {bestModel?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Selected based on lowest validation RMSE
              {trainingInfo.training_samples && ` • Trained on ${trainingInfo.training_samples} samples`}
            </p>
          </motion.div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((m, i) => (
              <motion.div key={m.model_name} className="glass-card"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                style={{ borderLeft: m.model_name === bestModel ? '3px solid var(--accent)' : 'none' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {m.model_name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </h3>
                  {m.model_name === bestModel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>Best</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>MAE</p>
                    <p className="text-sm font-bold" style={{ color: '#f97316' }}>{m.mae.toFixed(4)}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>RMSE</p>
                    <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{m.rmse.toFixed(4)}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>R²</p>
                    <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{m.r2.toFixed(4)}</p>
                  </div>
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  Trained: {new Date(m.trained_at).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>

          {/* RMSE Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>RMSE Comparison</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="RMSE" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>MAE Comparison</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="MAE" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>R² Comparison</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} domain={[0, 1]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="R2" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Actual vs Predicted Scatter */}
          {trainingInfo.actual_vs_predicted && (
            <div className="glass-card">
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Actual vs Predicted AQI (Test Dataset)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="actual" name="Actual AQI" domain={[0, 'dataMax + 10']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis type="number" dataKey="predicted" name="Predicted AQI" domain={[0, 'dataMax + 10']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }} />
                    <Scatter name="AQI Predictions" data={trainingInfo.actual_vs_predicted} fill="var(--accent)" fillOpacity={0.7} />
                    {/* Ideal reference line y=x */}
                    <Line type="linear" dataKey="actual" stroke="var(--text-muted)" strokeDasharray="3 3" dot={false} activeDot={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Comparing model predictions on the withheld test dataset against actual recorded values. Dots closer to the diagonal line represent higher accuracy.
              </p>
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
                  return (
                    <motion.div key={f.feature} className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <span className="text-xs font-mono w-28 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {formatVariableName(f.feature)}
                      </span>
                      <div className="flex-1 h-6 rounded" style={{ background: 'var(--bg-primary)' }}>
                        <div className="feature-bar h-full" style={{ width: `${(f.importance / maxImp) * 100}%`, background: colors[i % colors.length] }} />
                      </div>
                      <span className="text-xs font-mono w-16" style={{ color: 'var(--text-muted)' }}>
                        {(f.importance * 100).toFixed(1)}%
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
