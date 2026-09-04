import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Legend
} from 'recharts';
import { Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { Location, EnvironmentalData } from '../types';
import { buildCorrelationMatrix, formatVariableName } from '../utils/helpers';

interface Props { location: Location; }

const CORR_VARS = ['pm25', 'pm10', 'co', 'no2', 'so2', 'o3', 'temperature', 'humidity', 'wind_speed', 'aqi'];

function getCorrColor(v: number): string {
  if (v >= 0.7) return '#ef4444';
  if (v >= 0.4) return '#f97316';
  if (v >= 0.2) return '#eab308';
  if (v >= -0.2) return '#94a3b8';
  if (v >= -0.4) return '#06b6d4';
  if (v >= -0.7) return '#3b82f6';
  return '#8b5cf6';
}

const COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'pm25', label: 'PM2.5', unit: 'μg/m³' },
  { key: 'pm10', label: 'PM10', unit: 'μg/m³' },
  { key: 'co', label: 'CO', unit: 'μg/m³' },
  { key: 'no2', label: 'NO₂', unit: 'μg/m³' },
  { key: 'so2', label: 'SO₂', unit: 'μg/m³' },
  { key: 'o3', label: 'O₃', unit: 'μg/m³' },
  { key: 'temperature', label: 'Temp', unit: '°C' },
  { key: 'humidity', label: 'Humidity', unit: '%' },
  { key: 'wind_speed', label: 'Wind', unit: 'km/h' },
  { key: 'aqi', label: 'AQI' }
];
const PAGE_SIZE = 15;

export default function HistoricalAnalytics({ location }: Props) {
  const [data, setData] = useState<EnvironmentalData[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  // Table state
  const [showTable, setShowTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.getHistory(location.id, days, 2000)
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [location, days]);

  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    ...d,
  }));

  const { matrix, labels } = buildCorrelationMatrix(data, CORR_VARS);

  // Table filtering and sorting
  const filtered = [...data].filter(r => {
    if (!searchTerm) return true;
    return JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    const va = (a as any)[sortKey];
    const vb = (b as any)[sortKey];
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); setPage(0); }
  };

  // Pollutant stats
  const getStats = (key: string) => {
    const vals = data.map(d => (d as any)[key]).filter((v: any) => v != null) as number[];
    if (vals.length === 0) return { avg: 0, min: 0, max: 0, current: 0 };
    return {
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      current: vals[vals.length - 1],
    };
  };

  const pollutantKeys = [
    { key: 'pm25', label: 'PM2.5', color: '#ef4444' },
    { key: 'pm10', label: 'PM10', color: '#f97316' },
    { key: 'co', label: 'CO', color: '#eab308' },
    { key: 'no2', label: 'NO₂', color: '#a855f7' },
    { key: 'so2', label: 'SO₂', color: '#3b82f6' },
    { key: 'o3', label: 'O₃', color: '#22c55e' },
  ];

  const weatherKeys = [
    { key: 'temperature', label: 'Temperature (°C)', color: '#f97316' },
    { key: 'humidity', label: 'Humidity (%)', color: '#3b82f6' },
    { key: 'wind_speed', label: 'Wind Speed (km/h)', color: '#22c55e' },
  ];

  const scatterVars = [
    ...pollutantKeys.map(p => ({ ...p, label: `AQI vs ${p.label}` })),
    ...weatherKeys.map(w => ({ ...w, label: `AQI vs ${w.label.split(' (')[0]}` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Historical Analytics</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{location.name} • {data.length} records</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: days === d ? 'var(--accent)' : 'var(--bg-card)', color: days === d ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card text-center py-10"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>
      ) : data.length === 0 ? (
        <div className="glass-card text-center py-10"><p style={{ color: 'var(--text-muted)' }}>No historical data available. Sync data first.</p></div>
      ) : (
        <>
          {/* AQI Line Chart */}
          <div className="glass-card">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>AQI Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={2} dot={false} name="AQI" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pollutant Comparison */}
          <div className="glass-card">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Pollutant Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                  {pollutantKeys.map(p => (
                    <Line key={p.key} type="monotone" dataKey={p.key} stroke={p.color} strokeWidth={1.5} dot={false} name={p.label} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weather time series */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {weatherKeys.map(w => (
              <div key={w.key} className="glass-card">
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{w.label} Over Time</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }} />
                      <Line type="monotone" dataKey={w.key} stroke={w.color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* Scatter Plots: AQI vs each variable */}
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              AQI Correlation Scatter Plots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scatterVars.map(sv => (
                <div key={sv.key} className="glass-card">
                  <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{sv.label}</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey={sv.key} name={sv.label.split('vs ')[1]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} type="number" />
                        <YAxis dataKey="aqi" name="AQI" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} type="number" />
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }} />
                        <Scatter data={data.filter(d => (d as any)[sv.key] != null && d.aqi != null)} fill={sv.color} fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pollutant Analysis */}
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Pollutant Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {pollutantKeys.map(p => {
                const stats = getStats(p.key);
                return (
                  <div key={p.key} className="glass-card">
                    <p className="text-xs font-bold" style={{ color: p.color }}>{p.label}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px]"><span style={{ color: 'var(--text-muted)' }}>Current</span><span style={{ color: 'var(--text-primary)' }}>{stats.current.toFixed(1)}</span></div>
                      <div className="flex justify-between text-[10px]"><span style={{ color: 'var(--text-muted)' }}>Average</span><span style={{ color: 'var(--text-primary)' }}>{stats.avg.toFixed(1)}</span></div>
                      <div className="flex justify-between text-[10px]"><span style={{ color: 'var(--text-muted)' }}>Min</span><span style={{ color: 'var(--text-primary)' }}>{stats.min.toFixed(1)}</span></div>
                      <div className="flex justify-between text-[10px]"><span style={{ color: 'var(--text-muted)' }}>Max</span><span style={{ color: 'var(--text-primary)' }}>{stats.max.toFixed(1)}</span></div>
                      <div className="flex justify-between text-[10px]"><span style={{ color: 'var(--text-muted)' }}>Trend</span>
                        <span style={{ color: stats.current > stats.avg ? '#ef4444' : '#22c55e' }}>{stats.current > stats.avg ? '↑ Above avg' : '↓ Below avg'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Correlation Matrix */}
          <div className="glass-card">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Environmental Correlation Matrix</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Pearson correlations between PM2.5, PM10, CO, NO₂, SO₂, O₃, Temperature, Humidity, Wind Speed, and AQI
            </p>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th className="p-1 text-[10px]" style={{ color: 'var(--text-muted)' }}></th>
                    {labels.map(l => (
                      <th key={l} className="p-1 text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatVariableName(l)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="p-1 text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatVariableName(labels[i])}
                      </td>
                      {row.map((val, j) => (
                        <td key={j} className="p-0.5">
                          <div className="corr-cell" style={{ background: getCorrColor(val) + '33', color: getCorrColor(val) }}>
                            {val.toFixed(2)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Dataset Table */}
          <div className="glass-card">
            <button 
              onClick={() => setShowTable(!showTable)}
              className="flex justify-between items-center w-full focus:outline-none"
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Historical Dataset</h2>
              {showTable ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            <p className="text-xs mb-4 mt-1" style={{ color: 'var(--text-muted)' }}>
              Raw data records used for historical analytics and prediction.
            </p>

            {showTable && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                    <Search className="w-4 h-4 ml-3" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                      placeholder="Search..." className="px-2 py-2 text-sm bg-transparent outline-none w-36"
                      style={{ color: 'var(--text-primary)' }} />
                  </div>
                  <a href={api.exportData(location.id, days)} download
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                    <Download className="w-4 h-4" /> Export CSV
                  </a>
                </div>

                <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-left" style={{ minWidth: 800 }}>
                    <thead style={{ background: 'var(--bg-primary)' }}>
                      <tr>
                        {COLUMNS.map(col => (
                          <th key={col.key} onClick={() => toggleSort(col.key)}
                            className="px-3 py-3 text-[11px] font-semibold cursor-pointer select-none border-b"
                            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                            {col.label}
                            {col.unit && <span className="font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>({col.unit})</span>}
                            {sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((row, i) => (
                        <tr key={i} className="transition-colors border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {COLUMNS.map(col => (
                            <td key={col.key} className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                              {col.key === 'timestamp'
                                ? new Date((row as any)[col.key]).toLocaleString()
                                : (row as any)[col.key] != null
                                  ? typeof (row as any)[col.key] === 'number'
                                    ? Number((row as any)[col.key]).toFixed(1)
                                    : (row as any)[col.key]
                                  : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-secondary)', opacity: page === 0 ? 0.3 : 1 }}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{page + 1} / {totalPages || 1}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-secondary)', opacity: page >= totalPages - 1 ? 0.3 : 1 }}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {data.some(d => d.source === 'synthetic-development') && (
            <div className="glass-card text-center text-xs" style={{ color: '#f59e0b' }}>
              ⚠️ Development / Synthetic Dataset — Analytics based on synthetic training data.
            </div>
          )}
        </>
      )}
    </div>
  );
}
