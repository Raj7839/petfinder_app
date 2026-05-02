import { useEffect, useRef, useState } from 'react';
import { Filter, Layers, Navigation, Eye, SearchCheck } from 'lucide-react';
import L from 'leaflet';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { formatDate } from '../../utils/helpers';
import { useSearchParams } from 'react-router-dom';
import './MapView.css';

export function MapViewPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const { state, isLoading } = useApp();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('type') as 'found' | 'missing' | null;
  const [filter, setFilter] = useState<'all' | 'found' | 'missing'>(initialFilter || 'all');
  const [showFilter, setShowFilter] = useState(!!initialFilter);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [22.5, 78.9],
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Handle URL ID parameter to focus map
  useEffect(() => {
    if (!mapInstance.current || isLoading) return;
    const id = searchParams.get('id');
    if (!id) return;

    const found = state.foundReports.find(r => r.id === id);
    const missing = state.missingReports.find(r => r.id === id);
    const report = found || missing;

    if (report) {
      const lat = found ? found.location.lat : missing?.lastSeen.location.lat;
      const lng = found ? found.location.lng : missing?.lastSeen.location.lng;
      if (lat && lng) {
        mapInstance.current.setView([lat, lng], 14, { animate: true });
        // Set filter to match report type
        setFilter(found ? 'found' : 'missing');
      }
    }
  }, [searchParams, state.foundReports, state.missingReports, isLoading]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const createIcon = (color: string, label: string) => L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;color:white;font-weight:600;">${label}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Found person markers
    if (filter === 'all' || filter === 'found') {
      state.foundReports.forEach(report => {
        const marker = L.marker([report.location.lat, report.location.lng], {
          icon: createIcon('#3B82F6', 'F'),
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:200px;font-family:Inter,sans-serif;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                <img src="${report.photos[0]}" style="width:100%;height:100%;object-fit:cover;" />
              </div>
              <div>
                <strong style="color:#3B82F6;font-size:12px;">FOUND ANIMAL</strong>
                <div style="font-size:11px;color:#94A3B8;margin-top:2px;">${formatDate(report.createdAt)}</div>
              </div>
            </div>
            <div style="font-size:12px;color:#F1F5F9;">
              ${report.details.type ? `<div><strong>Type:</strong> ${report.details.type}</div>` : ''}
              ${report.details.primaryColor ? `<div><strong>Color:</strong> ${report.details.primaryColor}</div>` : ''}
              ${report.details.behavior ? `<div><strong>Behavior:</strong> ${report.details.behavior}</div>` : ''}
            </div>
            <div style="font-size:11px;color:#64748B;margin-top:6px;">${report.location.address || 'GPS Location'}</div>
          </div>
        `, { className: 'dark-popup' });
      });
    }

    // Missing person markers
    if (filter === 'all' || filter === 'missing') {
      state.missingReports.forEach(report => {
        const marker = L.marker([report.lastSeen.location.lat, report.lastSeen.location.lng], {
          icon: createIcon('#F59E0B', 'M'),
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:200px;font-family:Inter,sans-serif;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                <img src="${report.photos[0]}" style="width:100%;height:100%;object-fit:cover;" />
              </div>
              <div>
                <strong style="color:#F59E0B;font-size:12px;">MISSING PET</strong>
                <div style="font-size:13px;font-weight:600;color:#F1F5F9;">${report.identity.name || 'Unknown'}</div>
              </div>
            </div>
            <div style="font-size:12px;color:#F1F5F9;">
              ${report.identity.type ? `<div><strong>Type:</strong> ${report.identity.type}</div>` : ''}
              ${report.identity.distinguishingFeatures ? `<div><strong>Features:</strong> ${report.identity.distinguishingFeatures}</div>` : ''}
            </div>
            <div style="font-size:11px;color:#64748B;margin-top:6px;">Last seen: ${report.lastSeen.location.address || 'GPS'}</div>
          </div>
        `, { className: 'dark-popup' });
      });
    }

    // Draw match connection lines
    state.matches.forEach(match => {
      const found = state.foundReports.find(r => r.id === match.foundReportId);
      const missing = state.missingReports.find(r => r.id === match.missingReportId);
      if (found && missing && (filter === 'all')) {
        L.polyline(
          [[found.location.lat, found.location.lng], [missing.lastSeen.location.lat, missing.lastSeen.location.lng]],
          { color: '#10B981', weight: 2, dashArray: '8 8', opacity: 0.6 }
        ).addTo(map);
      }
    });
  }, [state.foundReports, state.missingReports, state.matches, filter]);

  const handleRecenter = () => {
    if (mapInstance.current) {
      mapInstance.current.setView([22.5, 78.9], 5);
    }
  };

  return (
    <div className="map-page">
      <div className="map-container" ref={mapRef} />
      
      {/* Map Controls */}
      <div className="map-controls">
        <Button variant="secondary" size="sm" icon={<Filter size={16} />} onClick={() => setShowFilter(!showFilter)}>
          Filter
        </Button>
        <Button variant="secondary" size="sm" icon={<Navigation size={16} />} onClick={handleRecenter}>
          Recenter
        </Button>
        <Button variant="secondary" size="sm" icon={<Layers size={16} />}>
          Layers
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <Card className="map-filter-panel animate-fade-in-down" padding="sm">
          <div className="filter-options">
            <button className={`filter-btn ${filter === 'all' ? 'filter-active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn ${filter === 'found' ? 'filter-active' : ''}`} onClick={() => setFilter('found')}>
              <Eye size={14} /> Found
            </button>
            <button className={`filter-btn ${filter === 'missing' ? 'filter-active' : ''}`} onClick={() => setFilter('missing')}>
              <SearchCheck size={14} /> Missing
            </button>
          </div>
        </Card>
      )}

      {/* Legend */}
      <Card className="map-legend" padding="sm">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#3B82F6' }} /><span>Found Animal</span><Badge variant="blue" size="sm">{state.foundReports.length}</Badge></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#F59E0B' }} /><span>Missing Pet</span><Badge variant="amber" size="sm">{state.missingReports.length}</Badge></div>
        <div className="legend-item"><div className="legend-line" /><span>Match Connection</span><Badge variant="emerald" size="sm">{state.matches.length}</Badge></div>
      </Card>
    </div>
  );
}
