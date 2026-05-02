import { useState, useMemo } from 'react';
import { GitCompareArrows, CheckCircle, XCircle, Clock, MapPin, Phone, ChevronDown, AlertTriangle, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useSearchParams } from 'react-router-dom';
import { formatDate, getConfidenceColor, getConfidenceLabel, calculateDistance, formatDistance } from '../../utils/helpers';
import './Matches.css';

export function MatchesPage() {
  const { state, dispatch, addNotification } = useApp();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('status') as 'pending' | 'confirmed' | 'dismissed' | null;
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'dismissed'>(initialFilter || 'all');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const filteredMatches = useMemo(() => {
    const sorted = [...state.matches].sort((a, b) => b.confidence - a.confidence);
    return sorted.filter(m => activeFilter === 'all' || m.status === activeFilter);
  }, [state.matches, activeFilter]);

  const handleConfirm = (matchId: string) => {
    dispatch({ type: 'UPDATE_MATCH', payload: { id: matchId, updates: { status: 'confirmed' } } });
    showToast({ type: 'success', title: 'Match Confirmed!', message: 'Owners have been notified.' });
    addNotification({
      id: `notif-${Date.now()}`,
      type: 'match',
      title: 'Match Confirmed',
      message: 'A match has been verified and confirmed successfully.',
      timestamp: new Date().toISOString(),
      read: false,
      linkedMatchId: matchId,
    });
  };

  const handleDismiss = (matchId: string) => {
    dispatch({ type: 'UPDATE_MATCH', payload: { id: matchId, updates: { status: 'dismissed' } } });
    showToast({ type: 'info', title: 'Match Dismissed', message: 'The match has been dismissed.' });
  };

  return (
    <div className="matches-page">
      <div className="matches-header">
        <div>
          <h1>AI Match Center</h1>
          <p>AI-generated potential matches between found and missing pets.</p>
        </div>
        <div className="matches-stats-row">
          <div className="match-stat-pill"><Clock size={14} /> {state.matches.filter(m => m.status === 'pending').length} Pending</div>
          <div className="match-stat-pill match-stat-success"><CheckCircle size={14} /> {state.matches.filter(m => m.status === 'confirmed').length} Confirmed</div>
        </div>
      </div>

      {state.notifications.filter(n => !n.read && n.type === 'match').length > 0 && (
        <Card className="match-alert animate-fade-in-down" variant="glow">
          <AlertTriangle size={20} className="alert-icon" />
          <div className="alert-content">
            <strong>{state.notifications.filter(n => !n.read && n.type === 'match').length} new match alert(s)</strong>
            <p>Review the matches below to help reunite pets.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}>
            Mark all read
          </Button>
        </Card>
      )}

      <div className="match-filters">
        {(['all', 'pending', 'confirmed', 'dismissed'] as const).map(f => (
          <button key={f} className={`match-filter-tab ${activeFilter === f ? 'match-filter-active' : ''}`} onClick={() => setActiveFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span className="match-filter-count">{state.matches.filter(m => m.status === f).length}</span>}
          </button>
        ))}
      </div>

      <div className="match-list">
        {filteredMatches.length === 0 && (
          <Card className="match-empty">
            <GitCompareArrows size={40} />
            <h3>No matches found</h3>
            <p>The AI engine is continuously scanning.</p>
          </Card>
        )}
        {filteredMatches.map((match, i) => {
          const found = state.foundReports.find(r => r.id === match.foundReportId);
          const missing = state.missingReports.find(r => r.id === match.missingReportId);
          const isExpanded = expandedMatch === match.id;

          let distStr = '';
          if (found && missing && found.location.lat && missing.lastSeen.location.lat) {
            const km = calculateDistance(found.location.lat, found.location.lng, missing.lastSeen.location.lat, missing.lastSeen.location.lng);
            distStr = formatDistance(km);
          }

          return (
            <Card key={match.id} className={`match-card ${isExpanded ? 'match-expanded' : ''}`} padding="none" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="match-card-main" onClick={() => setExpandedMatch(isExpanded ? null : match.id)}>
                <div className="match-comparison">
                  <div className="match-person">
                    <div className="match-person-photo">
                      {found?.photos[0] && <img src={found.photos[0]} alt="Found animal" />}
                    </div>
                    <div className="match-person-info">
                      <Badge variant="blue" size="sm">Found</Badge>
                      <span className="match-person-detail">
                        {[found?.details.type, found?.details.primaryColor].filter(Boolean).join(', ') || 'Unknown'}
                      </span>
                      <span className="match-person-loc"><MapPin size={12} />{found?.location.address || 'GPS'}</span>
                    </div>
                  </div>

                  <div className="match-vs">
                    <div className="match-confidence-circle" style={{ borderColor: getConfidenceColor(match.confidence) }}>
                      <span className="match-conf-num">{match.confidence}%</span>
                    </div>
                    <span className="match-conf-label">{getConfidenceLabel(match.confidence)}</span>
                    {distStr && <span className="match-dist-label">{distStr} apart</span>}
                  </div>

                  <div className="match-person">
                    <div className="match-person-photo">
                      {missing?.photos[0] && <img src={missing.photos[0]} alt="Missing pet" />}
                    </div>
                    <div className="match-person-info">
                      <Badge variant="amber" size="sm">Lost Pet</Badge>
                      <span className="match-person-name">{missing?.identity.name || 'Unknown'}</span>
                      <span className="match-person-loc"><MapPin size={12} />{missing?.lastSeen.location.address || 'GPS'}</span>
                    </div>
                  </div>
                </div>

                {match.matchReasons && match.matchReasons.length > 0 && (
                  <div className="match-reasons-summary">
                    <Info size={14} />
                    <span>{match.matchReasons.slice(0, 3).join(' • ')}</span>
                  </div>
                )}

                <div className="match-card-meta">
                  <StatusBadge status={match.status} />
                  <span className="match-time">{formatDate(match.timestamp)}</span>
                  <ChevronDown size={16} className={`match-expand-icon ${isExpanded ? 'rotated' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="match-details animate-fade-in">
                  {match.matchReasons && match.matchReasons.length > 0 && (
                    <div className="match-reasons-full">
                      <h4><Info size={16} /> Why This Matched</h4>
                      <ul>
                        {match.matchReasons.map((reason, ri) => (
                          <li key={ri} className="match-reason-item">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="match-detail-grid">
                    <div className="match-detail-col">
                      <h4>Found Animal Details</h4>
                      {found?.details.type && <p><strong>Type:</strong> {found.details.type}</p>}
                      {found?.details.breed && <p><strong>Breed:</strong> {found.details.breed}</p>}
                      {found?.details.primaryColor && <p><strong>Color:</strong> {found.details.primaryColor}</p>}
                      {found?.details.behavior && <p><strong>Behavior:</strong> {found.details.behavior}</p>}
                      {found?.details.notes && <p><strong>Notes:</strong> {found.details.notes}</p>}
                      <p><strong>Location:</strong> {found?.location.address || 'GPS'}</p>
                      <p><strong>Reported:</strong> {formatDate(found?.createdAt || '')}</p>
                    </div>
                    <div className="match-detail-col">
                      <h4>Missing Pet Details</h4>
                      {missing?.identity.name && <p><strong>Name:</strong> {missing.identity.name}</p>}
                      {missing?.identity.type && <p><strong>Type:</strong> {missing.identity.type}</p>}
                      {missing?.identity.breed && <p><strong>Breed:</strong> {missing.identity.breed}</p>}
                      {missing?.identity.primaryColor && <p><strong>Color:</strong> {missing.identity.primaryColor}</p>}
                      {missing?.identity.distinguishingFeatures && <p><strong>Features:</strong> {missing.identity.distinguishingFeatures}</p>}
                      <p><strong>Last Seen:</strong> {missing?.lastSeen.location.address || 'GPS'}</p>
                      {missing?.lastSeen.circumstances && <p><strong>Circumstances:</strong> {missing.lastSeen.circumstances}</p>}
                      {missing?.contact && (
                        <p className="match-contact"><Phone size={14} /> <strong>Contact:</strong> {missing.contact.name} - {missing.contact.phone}</p>
                      )}
                      <Button size="sm" variant="secondary" className="poster-btn-inline" icon={<Printer size={14} />} onClick={() => setSelectedPoster(missing)}>
                        Print Missing Poster
                      </Button>
                    </div>
                  </div>
                  {selectedPoster && <PosterGenerator report={selectedPoster} onClose={() => setSelectedPoster(null)} />}
                  {match.status === 'pending' && isAdmin && (
                    <div className="match-actions">
                      <Button variant="success" icon={<CheckCircle size={18} />} onClick={(e) => { e.stopPropagation(); handleConfirm(match.id); }}>
                        Confirm Match
                      </Button>
                      <Button variant="danger" icon={<XCircle size={18} />} onClick={(e) => { e.stopPropagation(); handleDismiss(match.id); }}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                  {match.status === 'pending' && !isAdmin && (
                    <div className="match-actions-info">
                      <Info size={14} />
                      <span>Only an admin can confirm or dismiss matches.</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
