import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import { Location, getAQICategory } from '../types';

interface Props { location: Location; setLocation: (loc: Location) => void; }

function createAQIIcon(aqi: number) {
  const cat = getAQICategory(aqi);
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${cat.color};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${Math.round(aqi)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center]);
  return null;
}

export default function AQIMap({ location, setLocation }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [aqiData, setAqiData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await api.getLocations();
        const locs = res.locations || [];
        setLocations(locs);

        // Fetch AQI for each location
        const aqMap: Record<number, any> = {};
        await Promise.all(locs.slice(0, 10).map(async (loc: Location) => {
          try {
            const aq = await api.getAirQuality(loc.latitude, loc.longitude, loc.id);
            aqMap[loc.id] = aq;
          } catch {}
        }));
        setAqiData(aqMap);
      } catch {}
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AQI Map</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Air quality markers using Leaflet + OpenStreetMap</p>

      <div className="glass-card p-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <ChangeView center={[location.latitude, location.longitude]} />
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map(loc => {
            const aq = aqiData[loc.id];
            const aqi = aq?.aqi ?? 0;
            const cat = getAQICategory(aqi);
            return (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={createAQIIcon(aqi)}
                eventHandlers={{ click: () => setLocation(loc) }}>
                <Popup>
                  <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                    <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{loc.name}, {loc.country}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ background: cat.color, color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        AQI: {Math.round(aqi)}
                      </span>
                      <span style={{ fontSize: 11, color: '#666' }}>{cat.category}</span>
                    </div>
                    <table style={{ fontSize: 11, width: '100%' }}>
                      <tbody>
                        <tr><td style={{ color: '#999' }}>PM2.5</td><td style={{ fontWeight: 600 }}>{aq?.pm25 != null ? Number(aq.pm25).toFixed(1) : '—'} μg/m³</td></tr>
                        <tr><td style={{ color: '#999' }}>PM10</td><td style={{ fontWeight: 600 }}>{aq?.pm10 != null ? Number(aq.pm10).toFixed(1) : '—'} μg/m³</td></tr>
                        <tr><td style={{ color: '#999' }}>Temperature</td><td style={{ fontWeight: 600 }}>{aq?.temperature ?? '—'} °C</td></tr>
                      </tbody>
                    </table>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
