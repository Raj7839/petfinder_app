import { useState, useCallback } from 'react';
import { Scan, Camera, MapPin, Clock, Zap, RotateCcw, Send, ShieldCheck, User, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CameraCapture } from '../../components/CameraCapture';
import { useApp } from '../../store/AppContext';
import { useToast } from '../../components/ui/Toast';
import { computeMatchConfidence } from '../../lib/matchingEngine';
import { extractFeatures } from '../../lib/tfjs';
import { generateId } from '../../utils/helpers';
import { getConfidenceColor, getConfidenceLabel, formatDate } from '../../utils/helpers';
import type { FoundAnimalReport, MissingAnimalReport } from '../../types';
import './QuickScan.css';

type PageState = 'start' | 'camera' | 'details' | 'scanning' | 'results';

interface ScanResult {
  missing: MissingAnimalReport;
  confidence: number;
  reasons: string[];
}

export function QuickScanPage() {
  const { state, addFoundReport, addMatch, addNotification } = useApp();
  const { showToast } = useToast();

  const [pageState, setPageState] = useState<PageState>('start');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [imageFeatures, setImageFeatures] = useState<number[] | undefined>(undefined);
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [results, setResults] = useState<ScanResult[]>([]);
  const [details, setDetails] = useState<{ type: 'dog' | 'cat' | 'bird' | 'other', primaryColor: string, notes: string }>({ type: 'dog', primaryColor: '', notes: '' });

  const handleCapture = useCallback(async (data: { photo: string; location: { lat: number; lng: number } }) => {
    setCapturedPhoto(data.photo);
    setCapturedLocation(data.location);
    setPageState('details');
    
    // Extract features in background
    try {
      const img = document.createElement('img');
      img.src = data.photo;
      await new Promise(r => { img.onload = r; });
      const features = await extractFeatures(img);
      setImageFeatures(features);
    } catch (err) {
      console.error('TFJS Feature extraction failed', err);
    }
  }, []);

  const handleRunScan = useCallback(async () => {
    if (!capturedPhoto) return;

    setPageState('scanning');

    const tempReport: FoundAnimalReport = {
      id: 'temp-scan',
      photos: [capturedPhoto],
      imageFeatures,
      location: {
        lat: capturedLocation.lat,
        lng: capturedLocation.lng,
        address: 'Quick Scan location',
      },
      timestamp: new Date().toISOString(),
      details: {
        type: details.type,
        isPet: true,
        breed: '',
        primaryColor: details.primaryColor,
        behavior: '',
        collarDetails: '',
        notes: details.notes,
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      reportedBy: 'user-1',
    };

    // Artificial delay for "scanning" feel, reduced for better responsiveness
    await new Promise(r => setTimeout(r, 800));

    const matchResults: ScanResult[] = [];
    for (const missing of state.missingReports) {
      const { confidence, reasons } = computeMatchConfidence(tempReport, missing);
      // Using 35 as lower threshold for "Quick Scan" to ensure we don't miss potential matches
      if (confidence >= 35) {
        matchResults.push({ missing, confidence: confidence, reasons });
      }
    }
    matchResults.sort((a, b) => b.confidence - a.confidence);
    
    setResults(matchResults);
    setPageState('results');
  }, [capturedPhoto, imageFeatures, capturedLocation, details, state.missingReports]);

  const handleSubmitReport = useCallback(() => {
    if (!capturedPhoto) return;

    const report: FoundAnimalReport = {
      id: generateId(),
      photos: [capturedPhoto],
      imageFeatures,
      location: {
        lat: capturedLocation.lat,
        lng: capturedLocation.lng,
        address: capturedLocation.lat ? `GPS: ${capturedLocation.lat.toFixed(4)}, ${capturedLocation.lng.toFixed(4)}` : 'Unknown location',
      },
      timestamp: new Date().toISOString(),
      details: {
        type: details.type,
        isPet: true,
        breed: '',
        primaryColor: details.primaryColor,
        behavior: '',
        collarDetails: '',
        notes: details.notes,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      reportedBy: 'user-1',
    };

    addFoundReport(report);

    for (const result of results.slice(0, 5)) {
      const matchId = generateId();
      addMatch({
        id: matchId,
        foundReportId: report.id,
        missingReportId: result.missing.id,
        confidence: result.confidence,
        matchReasons: result.reasons,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });

      if (result.confidence >= 70) {
        addNotification({
          id: generateId(),
          type: 'match',
          title: result.confidence >= 85 ? 'High Confidence Match!' : 'Potential Match Found!',
          message: `Quick Scan matched with ${result.missing.identity.name || 'a missing pet'} (${result.confidence}%)`,
          timestamp: new Date().toISOString(),
          read: false,
          linkedMatchId: matchId,
        });
      }
    }

    showToast({
      type: 'success',
      title: 'Report Submitted!',
      message: `Found report created with ${results.length} potential match(es).`,
    });

    setCapturedPhoto(null);
    setImageFeatures(undefined);
    setResults([]);
    setDetails({ type: 'dog', primaryColor: '', notes: '' });
    setPageState('start');
  }, [capturedPhoto, imageFeatures, capturedLocation, details, results, addFoundReport, addMatch, addNotification, showToast]);

  const handleReset = useCallback(() => {
    setCapturedPhoto(null);
    setImageFeatures(undefined);
    setResults([]);
    setDetails({ type: 'dog', primaryColor: '', notes: '' });
    setPageState('start');
  }, []);

  const renderConfidenceRing = (confidence: number) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (confidence / 100) * circumference;
    const color = getConfidenceColor(confidence);

    return (
      <div className="confidence-ring">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle className="confidence-ring-bg" cx="26" cy="26" r={radius} />
          <circle
            className="confidence-ring-fill"
            cx="26" cy="26" r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="confidence-value">{confidence}%</span>
      </div>
    );
  };

  if (pageState === 'camera') {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onClose={() => setPageState('start')}
      />
    );
  }

  return (
    <div className="quickscan-page">
      <div className="quickscan-header">
        <h1>AI Quick Scan</h1>
        <p>Snap a photo and instantly scan against all missing pet records.</p>
      </div>

      {pageState === 'start' && (
        <div className="quickscan-start-card" onClick={() => setPageState('camera')}>
          <div className="quickscan-scan-icon">
            <Scan size={40} />
          </div>
          <h2>Tap to Open Camera</h2>
          <p>Take a photo of a found animal. GPS location will be auto-captured.</p>
          <div className="quickscan-start-features">
            <div className="quickscan-feature"><Camera size={14} /> Live Camera</div>
            <div className="quickscan-feature"><MapPin size={14} /> Auto GPS</div>
            <div className="quickscan-feature"><Zap size={14} /> Instant Results</div>
          </div>
        </div>
      )}

      {pageState === 'details' && capturedPhoto && (
        <Card className="animate-fade-in-up" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
            <User size={20} /> Quick Details
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
            Add a few details to improve matching accuracy (optional).
          </p>

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <img src={capturedPhoto} alt="Captured" style={{
              width: 80, height: 80, borderRadius: 12, objectFit: 'cover',
              border: '2px solid var(--color-border)',
            }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Animal Type</label>
                <select value={details.type} onChange={e => setDetails(p => ({ ...p, type: e.target.value as any }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 14 }}>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="bird">Bird</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Primary Color</label>
                <input type="text" placeholder="e.g. Black" value={details.primaryColor} onChange={e => setDetails(p => ({ ...p, primaryColor: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 14 }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Notes (optional)</label>
            <textarea rows={2} placeholder="Any observations"
              value={details.notes} onChange={e => setDetails(p => ({ ...p, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 14, resize: 'vertical', fontFamily: 'var(--font-body)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={handleReset}>Cancel</Button>
            <Button variant="primary" icon={<Scan size={18} />} onClick={handleRunScan}>
              Scan Database
            </Button>
          </div>
        </Card>
      )}

      {pageState === 'scanning' && (
        <div className="quickscan-scanning">
          <div className="scan-animation-container">
            {capturedPhoto && <img src={capturedPhoto} alt="Scanning" className="scan-photo-preview" />}
            <div className="scan-ring" />
            <div className="scan-ring-2" />
          </div>
          <p className="scan-status-text">Scanning Database...</p>
          <p className="scan-status-sub">Comparing against {state.missingReports.filter(m => m.status === 'active' || m.status === 'pending').length} active missing pet records</p>
        </div>
      )}

      {pageState === 'results' && (
        <div className="quickscan-results">
          <div className="quickscan-results-header">
            <h2>
              <ShieldCheck size={24} />
              Scan Results
              <span className="results-count-badge">{results.length}</span>
            </h2>
          </div>

          {capturedPhoto && (
            <div className="quickscan-captured-info">
              <img src={capturedPhoto} alt="Captured" className="quickscan-captured-thumb" />
              <div className="quickscan-captured-meta">
                <strong>Captured Photo</strong>
                {capturedLocation.lat ? (
                  <span><MapPin size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {capturedLocation.lat.toFixed(4)}, {capturedLocation.lng.toFixed(4)}</span>
                ) : (
                  <span>No GPS available</span>
                )}
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <Card className="quickscan-no-results">
              <Scan size={48} />
              <h3>No Matches Found</h3>
              <p>No missing pet records matched the scan criteria. You can still submit this as a found animal report for future matching.</p>
            </Card>
          ) : (
            <div className="quickscan-result-list">
              {results.map((r, i) => (
                <div key={r.missing.id} className="quickscan-result-card" style={{ animationDelay: `${i * 100}ms` }}>
                  <span className="result-rank">#{i + 1}</span>
                  {r.missing.photos[0] && (
                    <img src={r.missing.photos[0]} alt={r.missing.identity.name || 'Missing pet'} className="result-photo" />
                  )}
                  <div className="result-info">
                    <p className="result-name">{r.missing.identity.name || 'Unknown'}</p>
                    <div className="result-meta">
                      {r.missing.identity.type && (
                        <span><User size={11} /> {r.missing.identity.type}</span>
                      )}
                      {r.missing.identity.primaryColor && (
                        <span><User size={11} /> {r.missing.identity.primaryColor}</span>
                      )}
                      {r.missing.lastSeen.location.address && (
                        <span><MapPin size={11} /> {r.missing.lastSeen.location.address.split(',')[0]}</span>
                      )}
                      <span><Clock size={11} /> {formatDate(r.missing.createdAt)}</span>
                    </div>
                  </div>
                  <div className="result-confidence">
                    {renderConfidenceRing(r.confidence)}
                    <span className="confidence-label" style={{ color: getConfidenceColor(r.confidence) }}>
                      {getConfidenceLabel(r.confidence)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="quickscan-actions">
            <Button variant="ghost" icon={<RotateCcw size={18} />} onClick={handleReset}>
              New Scan
            </Button>
            <Button variant="success" icon={<Send size={18} />} onClick={handleSubmitReport}>
              Submit Report {results.length > 0 ? `& ${results.length} Match(es)` : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
