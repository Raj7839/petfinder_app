import { useState } from 'react';
import { ShieldCheck, Users, Eye, SearchCheck, Trash2, CheckCircle, XCircle, BarChart3, Calendar, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/helpers';
import './Admin.css';

export function AdminPage() {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'reports' | 'matches' | 'analytics' | 'settings'>('reports');
  const [retentionDays, setRetentionDays] = useState(30);

  const handleApproveReport = (type: 'found' | 'missing', id: string) => {
    if (type === 'found') {
      dispatch({ type: 'UPDATE_FOUND_REPORT', payload: { id, updates: { status: 'active' } } });
    } else {
      dispatch({ type: 'UPDATE_MISSING_REPORT', payload: { id, updates: { status: 'active' } } });
    }
    showToast({ type: 'success', title: 'Report Approved' });
  };

  const handleDeleteReport = (type: 'found' | 'missing', id: string) => {
    if (type === 'found') {
      dispatch({ type: 'DELETE_FOUND_REPORT', payload: id });
    } else {
      dispatch({ type: 'DELETE_MISSING_REPORT', payload: id });
    }
    showToast({ type: 'info', title: 'Report Deleted' });
  };

  const allReports = [
    ...state.foundReports.map(r => ({ ...r, type: 'found' as const, label: r.details.type || 'Unknown' })),
    ...state.missingReports.map(r => ({ ...r, type: 'missing' as const, label: r.identity.name || 'Unknown' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title-row">
          <div className="admin-icon"><ShieldCheck size={24} /></div>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage reports, verify matches, and monitor platform activity.</p>
          </div>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="admin-stats">
        <div className="admin-stat"><span className="admin-stat-num">{state.foundReports.length + state.missingReports.length}</span><span className="admin-stat-label">Total Reports</span></div>
        <div className="admin-stat"><span className="admin-stat-num">{state.foundReports.filter(r => r.status === 'pending').length + state.missingReports.filter(r => r.status === 'pending').length}</span><span className="admin-stat-label">Pending Review</span></div>
        <div className="admin-stat"><span className="admin-stat-num">{state.matches.length}</span><span className="admin-stat-label">Total Matches</span></div>
        <div className="admin-stat"><span className="admin-stat-num">{state.matches.filter(m => m.status === 'confirmed').length}</span><span className="admin-stat-label">Confirmed</span></div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'reports' ? 'admin-tab-active' : ''}`} onClick={() => setActiveTab('reports')}><Eye size={16} /> Reports</button>
        <button className={`admin-tab ${activeTab === 'matches' ? 'admin-tab-active' : ''}`} onClick={() => setActiveTab('matches')}><Users size={16} /> Matches</button>
        <button className={`admin-tab ${activeTab === 'analytics' ? 'admin-tab-active' : ''}`} onClick={() => setActiveTab('analytics')}><BarChart3 size={16} /> Analytics</button>
        <button className={`admin-tab ${activeTab === 'settings' ? 'admin-tab-active' : ''}`} onClick={() => setActiveTab('settings')}><Calendar size={16} /> Settings</button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="admin-content">
          <div className="admin-table">
            <div className="admin-table-header">
              <span>Type</span><span>Description</span><span>Status</span><span>Date</span><span>Actions</span>
            </div>
            {allReports.map(r => (
              <div key={r.id} className="admin-table-row">
                <span><Badge variant={r.type === 'found' ? 'blue' : 'amber'} size="sm">{r.type === 'found' ? 'Found' : 'Missing'}</Badge></span>
                <span className="admin-row-label">{r.label}</span>
                <span><StatusBadge status={r.status} /></span>
                <span className="admin-row-date">{formatDate(r.createdAt)}</span>
                <span className="admin-row-actions">
                  {r.status === 'pending' && <Button size="sm" variant="success" icon={<CheckCircle size={14} />} onClick={() => handleApproveReport(r.type, r.id)}>Approve</Button>}
                  <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => handleDeleteReport(r.type, r.id)}>Delete</Button>
                </span>
              </div>
            ))}
            {allReports.length === 0 && <div className="admin-empty">No reports to manage.</div>}
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="admin-content">
          <div className="admin-table">
            <div className="admin-table-header">
              <span>Match ID</span><span>Confidence</span><span>Status</span><span>Date</span><span>Actions</span>
            </div>
            {state.matches.map(m => (
              <div key={m.id} className="admin-table-row">
                <span className="admin-row-id">{m.id.substring(0, 12)}</span>
                <span><Badge variant={m.confidence >= 80 ? 'emerald' : 'amber'} size="sm">{m.confidence}%</Badge></span>
                <span><StatusBadge status={m.status} /></span>
                <span className="admin-row-date">{formatDate(m.timestamp)}</span>
                <span className="admin-row-actions">
                  {m.status === 'pending' && (
                    <>
                      <Button size="sm" variant="success" icon={<CheckCircle size={14} />} onClick={() => dispatch({ type: 'UPDATE_MATCH', payload: { id: m.id, updates: { status: 'confirmed' } } })}>Confirm</Button>
                      <Button size="sm" variant="ghost" icon={<XCircle size={14} />} onClick={() => dispatch({ type: 'UPDATE_MATCH', payload: { id: m.id, updates: { status: 'dismissed' } } })}>Dismiss</Button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="admin-content">
          <div className="analytics-grid">
            <Card className="analytics-card">
              <h3>Reports Over Time</h3>
              <div className="analytics-chart">
                <div className="chart-bars">
                  {[65, 40, 80, 55, 90, 70, 45].map((h, i) => (
                    <div key={i} className="chart-bar-wrap">
                      <div className="chart-bar" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                      <span className="chart-label">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="analytics-card">
              <h3>Match Success Rate</h3>
              <div className="analytics-donut">
                <svg viewBox="0 0 100 100" className="donut-chart">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-emerald-500)" strokeWidth="8" strokeDasharray={`${state.matches.length > 0 ? (state.matches.filter(m=>m.status==='confirmed').length / state.matches.length * 251) : 0} 251`} strokeLinecap="round" transform="rotate(-90 50 50)" className="donut-fill" />
                </svg>
                <div className="donut-center">
                  <span className="donut-value">{state.matches.length > 0 ? Math.round(state.matches.filter(m => m.status === 'confirmed').length / state.matches.length * 100) : 0}%</span>
                  <span className="donut-label">Success</span>
                </div>
              </div>
            </Card>
            <Card className="analytics-card">
              <h3>Geographic Distribution</h3>
              <div className="geo-list">
                <div className="geo-item"><span>Manhattan, NY</span><div className="geo-bar"><div style={{ width: '75%' }} /></div><span>75%</span></div>
                <div className="geo-item"><span>Brooklyn, NY</span><div className="geo-bar"><div style={{ width: '45%' }} /></div><span>45%</span></div>
                <div className="geo-item"><span>Queens, NY</span><div className="geo-bar"><div style={{ width: '30%' }} /></div><span>30%</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="admin-content">
          <Card>
            <h3 style={{ marginBottom: 'var(--space-6)' }}>Data Retention Policy</h3>
            <div className="settings-group">
              <label>Auto-delete resolved reports after:</label>
              <div className="settings-row">
                <select value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} style={{ maxWidth: 200 }}>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
                <Button variant="primary" size="sm" onClick={() => showToast({ type: 'success', title: 'Settings saved' })}>Save</Button>
              </div>
            </div>
            <div className="settings-group">
              <label>Danger Zone</label>
              <div className="settings-row">
                <Button variant="danger" size="sm" icon={<AlertTriangle size={16} />} onClick={() => {
                  if (confirm('Clear all data? This will reset everything and reload fresh data.')) {
                    localStorage.removeItem('petfinder-data');
                    localStorage.removeItem('petfinder-data-version');
                    window.location.reload();
                  }
                }}>
                  Clear All Data
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
