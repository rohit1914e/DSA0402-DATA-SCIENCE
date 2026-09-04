import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wind, Brain, BarChart3, Map,
  Cpu, Info, Menu, X, Sun, Moon
} from 'lucide-react';
import { useTheme, useLocalStorage } from './hooks/useData';

import Dashboard from './pages/Dashboard';
import Prediction from './pages/Prediction';
import HistoricalAnalytics from './pages/HistoricalAnalytics';
import AQIMap from './pages/AQIMap';
import ModelPerformance from './pages/ModelPerformance';
import About from './pages/About';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/analytics', icon: BarChart3, label: 'Historical Analytics' },
  { path: '/prediction', icon: Brain, label: 'AQI Prediction' },
  { path: '/map', icon: Map, label: 'AQI Map' },
  { path: '/models', icon: Cpu, label: 'Model Performance' },
  { path: '/about', icon: Info, label: 'About Project' },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dark, toggle } = useTheme();

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-3)' }}>
            <Wind className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AQI Predict</h1>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Environmental Analytics</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-1 rounded" style={{ color: 'var(--text-muted)' }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-3 mb-2">
        <div className="h-px" style={{ background: 'var(--border)' }} />
      </div>

      <nav className="flex-1 py-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={toggle}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'transparent' }}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <p className="text-[10px] mt-2 px-3" style={{ color: 'var(--text-muted)' }}>
          AQI Standard: US AQI
        </p>
      </div>
    </aside>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useLocalStorage('selectedLocation', {
    id: 1, name: 'Chennai', latitude: 13.0827, longitude: 80.2707, country: 'India'
  });

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content flex-1">
          <div className="md:hidden mb-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <PageWrapper>
            <Routes>
              <Route path="/" element={<Dashboard location={selectedLocation} setLocation={setSelectedLocation} />} />
              <Route path="/prediction" element={<Prediction location={selectedLocation} />} />
              <Route path="/analytics" element={<HistoricalAnalytics location={selectedLocation} />} />
              <Route path="/map" element={<AQIMap location={selectedLocation} setLocation={setSelectedLocation} />} />
              <Route path="/models" element={<ModelPerformance />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </PageWrapper>
        </main>
      </div>
    </BrowserRouter>
  );
}
