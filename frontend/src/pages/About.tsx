import { motion } from 'framer-motion';
import { Wind, Database, Brain, BarChart3, Map, Cpu } from 'lucide-react';

export default function About() {
  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Air Quality Index Prediction
        </h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-secondary)' }}>
          Using Environmental Data Analytics
        </p>
      </motion.div>

      <div className="glass-card">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Project Overview</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This capstone project analyzes environmental conditions and predicts the Air Quality Index (AQI)
          using machine learning. The system collects real-time environmental data, processes it through
          a data pipeline, trains ML models, and provides AQI predictions with explanations.
        </p>
      </div>

      <div className="glass-card">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Environmental Variables Analyzed</h2>

        <h3 className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>Air Pollutants</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { name: 'PM2.5', desc: 'Fine particulate matter (≤2.5μm). Major contributor to respiratory issues.' },
            { name: 'PM10', desc: 'Coarse particulate matter (≤10μm). Includes dust, pollen, and mold.' },
            { name: 'CO', desc: 'Carbon monoxide. Produced by incomplete combustion of fuels.' },
            { name: 'NO₂', desc: 'Nitrogen dioxide. Primarily from vehicle emissions and power plants.' },
            { name: 'SO₂', desc: 'Sulfur dioxide. Released by burning fossil fuels containing sulfur.' },
            { name: 'O₃', desc: 'Ozone. Formed by photochemical reactions in the atmosphere.' },
          ].map(p => (
            <div key={p.name} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{p.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold mb-2" style={{ color: '#3b82f6' }}>Meteorological Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'Temperature', desc: 'Affects chemical reaction rates and pollutant behavior.' },
            { name: 'Humidity', desc: 'Influences particulate formation and pollutant concentration.' },
            { name: 'Wind Speed', desc: 'Determines pollutant dispersion and transport patterns.' },
          ].map(w => (
            <div key={w.name} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{w.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          These variables are used to study environmental conditions and support AQI prediction using machine-learning techniques.
        </p>
      </div>

      <div className="glass-card">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Technology Stack</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Frontend</h4>
            <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>• React + TypeScript</li>
              <li>• Vite</li>
              <li>• Tailwind CSS</li>
              <li>• Recharts</li>
              <li>• Leaflet + OpenStreetMap</li>
              <li>• Framer Motion</li>
              <li>• Lucide React</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Backend</h4>
            <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>• Python + FastAPI</li>
              <li>• SQLite</li>
              <li>• scikit-learn</li>
              <li>• pandas + numpy</li>
              <li>• Open-Meteo APIs (no key required)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Methodology Pipeline</h2>
        <div className="flex justify-center">
          <div className="flex flex-col gap-2 relative max-w-sm w-full">
            {[
              { id: 1, label: 'Environmental Data', desc: 'Sourced from local sensors or Open-Meteo' },
              { id: 2, label: 'Data Collection & Storage', desc: 'Ingested into local SQLite database' },
              { id: 3, label: 'Data Cleaning', desc: 'Missing value handling, outlier removal' },
              { id: 4, label: 'Feature Engineering', desc: 'Generating structured input features' },
              { id: 5, label: 'Historical Dataset', desc: 'Compiled tabular representations' },
              { id: 6, label: 'Machine Learning', desc: 'Training pipeline via scikit-learn' },
              { id: 7, label: 'Model Evaluation', desc: 'RMSE, MAE, R² metrics computing' },
              { id: 8, label: 'AQI Prediction', desc: 'Live environment forecasting & inference' },
            ].map((step, idx) => (
              <motion.div key={step.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex flex-col items-center">
                <div className="w-full text-center px-4 py-3 rounded-xl shadow-sm border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{step.label}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                </div>
                {idx < 7 && (
                  <div className="h-4 border-l-2 my-1" style={{ borderColor: 'var(--text-muted)', opacity: 0.5 }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>ML Models</h2>
        <div className="grid grid-cols-3 gap-3">
          {['Linear Regression', 'Random Forest Regressor', 'Gradient Boosting Regressor'].map(m => (
            <div key={m} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-primary)' }}>
              <Cpu className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          The best model is automatically selected based on lowest validation RMSE. Metrics stored include MAE, RMSE, and R².
        </p>
      </div>

      <div className="glass-card">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>AQI Categories (US EPA Standard)</h2>
        <div className="space-y-2">
          {[
            { range: '0–50', label: 'Good', color: '#00e400' },
            { range: '51–100', label: 'Moderate', color: '#ffff00' },
            { range: '101–150', label: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
            { range: '151–200', label: 'Unhealthy', color: '#ff0000' },
            { range: '201–300', label: 'Very Unhealthy', color: '#8f3f97' },
            { range: '301–500', label: 'Hazardous', color: '#7e0023' },
          ].map(c => (
            <div key={c.range} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ background: c.color }} />
              <span className="text-xs font-mono w-16" style={{ color: 'var(--text-secondary)' }}>{c.range}</span>
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card text-xs" style={{ color: 'var(--text-muted)' }}>
        <p>📡 Data source: Open-Meteo (free, no API key required)</p>
        <p className="mt-1">💻 Runs 100% locally — no cloud services, authentication, or paid APIs required.</p>
      </div>
    </div>
  );
}
