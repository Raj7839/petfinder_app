import { useState, useMemo } from 'react';
import { Search, MapPin, Filter, Eye, SearchCheck, ArrowRight, Grid, List as ListIcon, Calendar, X, Phone, User, Info, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { useLanguage } from '../../i18n';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { BrandIcon } from '../../components/ui/BrandIcon';
import { formatDate } from '../../utils/helpers';
import './Reports.css';

export function ReportsPage() {
  const { state } = useApp();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const typeFilter = searchParams.get('type') as 'found' | 'missing' | null;
  const activeFilter = typeFilter || 'all';

  const allReports = useMemo(() => {
    return [
      ...state.foundReports.map(r => ({ ...r, type: 'found' as const })),
      ...state.missingReports.map(r => ({ ...r, type: 'missing' as const }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.foundReports, state.missingReports]);

  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      const matchesType = activeFilter === 'all' || report.type === activeFilter;
      
      const searchLower = searchQuery.toLowerCase();
      const reportData = report.type === 'found' 
        ? `${report.details.type} ${report.details.breed} ${report.details.primaryColor} ${report.location.address}`.toLowerCase()
        : `${report.identity.name} ${report.identity.type} ${report.identity.breed} ${report.lastSeen.location.address}`.toLowerCase();
      
      const matchesSearch = !searchQuery || reportData.includes(searchLower);
      
      return matchesType && matchesSearch;
    });
  }, [allReports, activeFilter, searchQuery]);

  const setType = (type: 'all' | 'found' | 'missing') => {
    if (type === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', type);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div className="header-content">
          <h1>{t.reports.title}</h1>
          <p>{t.reports.subtitle}</p>
        </div>
        <div className="header-actions">
          <div className="view-mode-toggle">
            <button 
              className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button 
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <ListIcon size={18} />
            </button>
          </div>
          <Link to="/map">
            <Button variant="secondary" icon={<MapPin size={16} />}>
              {t.reports.viewMap}
            </Button>
          </Link>
        </div>
      </div>

      <Card className="reports-filter-bar">
        <div className="search-wrap">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={t.reports.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setType('all')}
          >
            {t.reports.all}
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'found' ? 'active' : ''}`}
            onClick={() => setType('found')}
          >
            <Eye size={16} /> {t.reports.found}
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'missing' ? 'active' : ''}`}
            onClick={() => setType('missing')}
          >
            <SearchCheck size={16} /> {t.reports.missing}
          </button>
        </div>
      </Card>

      <div className={`reports-content ${viewMode}-view`}>
        {filteredReports.length === 0 ? (
          <div className="no-reports">
            <div className="no-reports-icon">🐾</div>
            <h3>{t.reports.noResults}</h3>
          </div>
        ) : (
          filteredReports.map((report) => (
            <Card 
              key={report.id} 
              className={`report-gallery-card ${report.type}`}
              padding="none"
              hoverable
              onClick={() => setSelectedReport(report)}
            >
              <div className="report-card-image">
                {report.photos && report.photos[0] ? (
                  <img src={report.photos[0]} alt="" loading="lazy" />
                ) : (
                  <div className={`report-placeholder ${report.type}`}>
                    <BrandIcon size={40} />
                    <span>No Photo Available</span>
                  </div>
                )}
                <div className="report-type-badge">
                  <Badge variant={report.type === 'found' ? 'blue' : 'amber'}>
                    {report.type === 'found' ? 'Found' : 'Missing'}
                  </Badge>
                </div>
              </div>
              <div className="report-card-body">
                <div className="report-card-title">
                  <h3>
                    {report.type === 'found' 
                      ? `${report.details.type || 'Animal'}`
                      : report.identity.name || 'Unknown Pet'}
                  </h3>
                  <span className="report-date"><Calendar size={12} /> {formatDate(report.createdAt)}</span>
                </div>
                
                <div className="report-details-preview">
                  <p className="report-location">
                    <MapPin size={14} /> 
                    {report.type === 'found' ? report.location.address : report.lastSeen.location.address}
                  </p>
                  <p className="report-breed-info">
                    {report.type === 'found' 
                      ? `${report.details.breed || 'Unknown breed'} • ${report.details.primaryColor || ''}`
                      : `${report.identity.breed || 'Unknown breed'} • ${report.identity.primaryColor || ''}`}
                  </p>
                </div>

                <div className="report-card-footer">
                  <Link to={`/map?id=${report.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" icon={<MapPin size={14} />}>
                      Map
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />} onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}>
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="report-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedReport(null)}><X size={24} /></button>
            
            <div className="modal-layout">
              <div className="modal-image-side">
                {selectedReport.photos && selectedReport.photos[0] ? (
                  <img src={selectedReport.photos[0]} alt="" />
                ) : (
                  <div className={`modal-placeholder ${selectedReport.type}`}>
                    <BrandIcon size={64} />
                  </div>
                )}
              </div>
              
              <div className="modal-content-side">
                <div className="modal-header-info">
                  <Badge variant={selectedReport.type === 'found' ? 'blue' : 'amber'} size="md">
                    {selectedReport.type === 'found' ? 'Found Animal' : 'Missing Pet'}
                  </Badge>
                  <h1>
                    {selectedReport.type === 'found' 
                      ? selectedReport.details.type 
                      : selectedReport.identity.name}
                  </h1>
                  <p className="modal-subtitle">
                    {selectedReport.type === 'found'
                      ? `${selectedReport.details.breed} • ${selectedReport.details.primaryColor}`
                      : `${selectedReport.identity.breed} • ${selectedReport.identity.primaryColor}`}
                  </p>
                </div>

                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <MapPin size={18} />
                    <div>
                      <strong>Location</strong>
                      <p>{selectedReport.type === 'found' ? selectedReport.location.address : selectedReport.lastSeen.location.address}</p>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <Clock size={18} />
                    <div>
                      <strong>Reported On</strong>
                      <p>{formatDate(selectedReport.createdAt)}</p>
                    </div>
                  </div>
                  {selectedReport.type === 'missing' && selectedReport.identity.gender && (
                    <div className="modal-info-item">
                      <User size={18} />
                      <div>
                        <strong>Gender</strong>
                        <p>{selectedReport.identity.gender}</p>
                      </div>
                    </div>
                  )}
                  <div className="modal-info-item">
                    <Info size={18} />
                    <div>
                      <strong>Description</strong>
                      <p>{selectedReport.type === 'found' ? selectedReport.details.behavior : selectedReport.identity.distinguishingFeatures || 'No additional details provided.'}</p>
                    </div>
                  </div>
                </div>

                <div className="modal-contact-section">
                  <h3>Contact Information</h3>
                  <div className="modal-contact-card">
                    <div className="contact-avatar"><User size={20} /></div>
                    <div className="contact-info">
                      <strong>Reported by {selectedReport.userId === 'admin' ? 'FindMyFur Team' : 'Community Member'}</strong>
                      <p>Guardian for this case</p>
                    </div>
                    <Button variant="primary" size="sm" icon={<Phone size={14} />}>
                      Contact
                    </Button>
                  </div>
                </div>

                <div className="modal-footer">
                  <Link to={`/map?id=${selectedReport.id}`}>
                    <Button variant="secondary" className="w-full" icon={<MapPin size={16} />}>
                      View on Live Map
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
