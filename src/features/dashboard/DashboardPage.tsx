import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, SearchCheck, GitCompareArrows, MapPin, TrendingUp, Clock, AlertTriangle, ArrowRight, Users, Scan, RefreshCw } from 'lucide-react';
import { BrandIcon } from '../../components/ui/BrandIcon';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { useLanguage } from '../../i18n';
import { formatDate } from '../../utils/helpers';
import './Dashboard.css';

export function DashboardPage() {
  const { state, fetchLatestData, isSyncing } = useApp();
  const { t } = useLanguage();
  const [animatedStats, setAnimatedStats] = useState({ found: 0, missing: 0, matches: 0, resolved: 0 });

  const stats = {
    found: state.foundReports.length,
    missing: state.missingReports.length,
    matches: state.matches.length,
    resolved: state.matches.filter(m => m.status === 'confirmed').length,
  };

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedStats({
        found: Math.round(stats.found * ease),
        missing: Math.round(stats.missing * ease),
        matches: Math.round(stats.matches * ease),
        resolved: Math.round(stats.resolved * ease),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [stats.found, stats.missing, stats.matches, stats.resolved]);

  const recentActivity = [
    ...state.foundReports.map(r => ({ type: 'found' as const, id: r.id, date: r.createdAt, status: r.status, location: r.location.address, photo: r.photos[0] })),
    ...state.missingReports.map(r => ({ type: 'missing' as const, id: r.id, date: r.createdAt, status: r.status, name: r.identity.name, location: r.lastSeen.location.address, photo: r.photos[0] })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h1 className="dashboard-hero-title">
             <span className="gradient-text">{t.brand.name}</span>
          </h1>
          <p className="dashboard-hero-tagline">{t.brand.tagline}</p>
          <p className="dashboard-hero-subtitle">Our AI-powered engine uses real-time image recognition and behavioral matching to locate and reunite missing pets with their owners instantly.</p>
          <div className="dashboard-hero-actions">
            <Link to="/scan">
              <Button variant="primary" size="lg" icon={<Scan size={20} />}>{t.nav.quickScan}</Button>
            </Link>
            <Link to="/report-found">
              <Button variant="secondary" size="lg" icon={<Eye size={20} />}>{t.nav.reportFound}</Button>
            </Link>
            <Link to="/report-missing">
              <Button variant="secondary" size="lg" icon={<SearchCheck size={20} />}>{t.nav.reportMissing}</Button>
            </Link>
          </div>
        </div>
        <div className="dashboard-hero-visual">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-icon-grid">
            <div className="hero-icon-item"><BrandIcon size={32} /></div>
            <div className="hero-icon-item"><Users size={32} /></div>
            <div className="hero-icon-item"><MapPin size={32} /></div>
            <div className="hero-icon-item"><GitCompareArrows size={32} /></div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats-header">
        <h2>Network Insights</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchLatestData()} 
          loading={isSyncing}
          icon={<RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
        >
          {isSyncing ? 'Syncing...' : 'Refresh Data'}
        </Button>
      </div>
      <div className="dashboard-stats">
        <Link to="/reports?type=found" className="stat-link">
          <Card className="stat-card stat-found" hoverable>
            <div className="stat-icon-wrap stat-icon-blue"><Eye size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{animatedStats.found}</span>
              <span className="stat-label">{t.dashboard.foundReports}</span>
            </div>
            <TrendingUp size={16} className="stat-trend" />
          </Card>
        </Link>
        <Link to="/reports?type=missing" className="stat-link">
          <Card className="stat-card stat-missing" hoverable>
            <div className="stat-icon-wrap stat-icon-amber"><SearchCheck size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{animatedStats.missing}</span>
              <span className="stat-label">{t.dashboard.missingReports}</span>
            </div>
            <AlertTriangle size={16} className="stat-trend stat-trend-warning" />
          </Card>
        </Link>
        <Link to="/matches?status=pending" className="stat-link">
          <Card className="stat-card stat-matches" hoverable>
            <div className="stat-icon-wrap stat-icon-emerald"><GitCompareArrows size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{animatedStats.matches}</span>
              <span className="stat-label">{t.dashboard.potentialMatches}</span>
            </div>
          </Card>
        </Link>
        <Link to="/matches?status=confirmed" className="stat-link">
          <Card className="stat-card stat-resolved" hoverable>
            <div className="stat-icon-wrap stat-icon-purple"><Clock size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{animatedStats.resolved}</span>
              <span className="stat-label">{t.dashboard.resolved}</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Activity */}
        <Card className="dashboard-activity" padding="none">
          <div className="activity-header">
            <h2>{t.dashboard.recentActivity}</h2>
            <Link to="/map" className="activity-view-all">{t.dashboard.viewMap} <ArrowRight size={14} /></Link>
          </div>
          <div className="activity-list">
            {recentActivity.length === 0 && (
              <div className="activity-empty">
                <p>{t.dashboard.noReports}</p>
              </div>
            )}
            {recentActivity.map((item, i) => (
              <Link 
                to={`/map?id=${item.id}`} 
                key={item.id} 
                className="activity-item-link"
              >
                <div className="activity-item" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="activity-photo">
                    {item.photo ? <img src={item.photo} alt="" /> : <div className={`activity-photo-placeholder ${item.type === 'found' ? 'blue' : 'amber'}`}><BrandIcon size={16} /></div>}
                  </div>
                  <div className="activity-content">
                    <p className="activity-text">
                      {item.type === 'found' ? t.dashboard.foundPersonReported : `${t.dashboard.missingLabel} ${(item as any).name || t.common.unknown}`}
                      {item.location && <span className="activity-location"><MapPin size={12} /> {item.location}</span>}
                    </p>
                    <div className="activity-meta">
                      <span className="activity-time">{formatDate(item.date)}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Pending Matches */}
        <Card className="dashboard-matches" padding="none">
          <div className="activity-header">
            <h2>{t.dashboard.pendingMatches}</h2>
            <Link to="/matches" className="activity-view-all">{t.dashboard.review} <ArrowRight size={14} /></Link>
          </div>
          <div className="matches-list">
            {state.matches.filter(m => m.status === 'pending').length === 0 && (
              <div className="activity-empty">
                <p>{t.dashboard.noPendingMatches}</p>
              </div>
            )}
            {state.matches.filter(m => m.status === 'pending').map((match, i) => {
              const found = state.foundReports.find(r => r.id === match.foundReportId);
              const missing = state.missingReports.find(r => r.id === match.missingReportId);
              return (
                <div key={match.id} className="match-preview" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="match-photos">
                    <div className="match-photo-wrap">
                      {found?.photos[0] && <img src={found.photos[0]} alt="Found" className="match-photo" />}
                      <span className="match-photo-label">Found</span>
                    </div>
                    <div className="match-connector">
                      <GitCompareArrows size={16} />
                    </div>
                    <div className="match-photo-wrap">
                      {missing?.photos[0] && <img src={missing.photos[0]} alt="Missing" className="match-photo" />}
                      <span className="match-photo-label">Missing</span>
                    </div>
                  </div>
                  <div className="match-info">
                    <div className="match-confidence">
                      <span className="match-confidence-value">{match.confidence}%</span>
                      <span className="match-confidence-label">match</span>
                    </div>
                    <div className="match-confidence-bar">
                      <div className="match-confidence-fill" style={{ width: `${match.confidence}%`, background: match.confidence >= 80 ? 'var(--color-emerald-500)' : 'var(--color-amber-500)' }} />
                    </div>
                    <span className="activity-time">{formatDate(match.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <h2>{t.dashboard.quickActions}</h2>
        <div className="quick-actions-grid">
          <Link to="/scan" className="quick-action-card">
            <div className="quick-action-icon qa-scan"><Scan size={24} /></div>
            <h3>{t.dashboard.actions.quickScan}</h3>
            <p>{t.dashboard.actions.quickScanDesc}</p>
          </Link>
          <Link to="/report-found" className="quick-action-card">
            <div className="quick-action-icon qa-blue"><Eye size={24} /></div>
            <h3>{t.dashboard.actions.reportFound}</h3>
            <p>{t.dashboard.actions.reportFoundDesc}</p>
          </Link>
          <Link to="/report-missing" className="quick-action-card">
            <div className="quick-action-icon qa-amber"><SearchCheck size={24} /></div>
            <h3>{t.dashboard.actions.reportMissing}</h3>
            <p>{t.dashboard.actions.reportMissingDesc}</p>
          </Link>
          <Link to="/map" className="quick-action-card">
            <div className="quick-action-icon qa-emerald"><MapPin size={24} /></div>
            <h3>{t.dashboard.actions.viewMap}</h3>
            <p>{t.dashboard.actions.viewMapDesc}</p>
          </Link>
          <Link to="/matches" className="quick-action-card">
            <div className="quick-action-icon qa-purple"><GitCompareArrows size={24} /></div>
            <h3>{t.dashboard.actions.reviewMatches}</h3>
            <p>{t.dashboard.actions.reviewMatchesDesc}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
