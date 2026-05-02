import { useState, useRef } from 'react';
import { Camera, Upload, MapPin, Send, ChevronRight, ChevronLeft, Check, Scan, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CameraCapture } from '../../components/CameraCapture';
import { useApp } from '../../store/AppContext';
import { useToast } from '../../components/ui/Toast';
import { useGeolocation } from '../../hooks/useGeolocation';
import { generateId, fileToBase64 } from '../../utils/helpers';
import { extractFeatures } from '../../lib/tfjs';
import { uploadAnimalPhoto } from '../../lib/storage';
import type { FoundAnimalReport } from '../../types';
import './ReportFound.css';

export function ReportFoundPage() {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageFeatures, setImageFeatures] = useState<number[] | undefined>(undefined);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [location, setLocation] = useState({ lat: 0, lng: 0, address: '' });
  const [details, setDetails] = useState<{ type: 'dog' | 'cat' | 'bird' | 'other', isPet: boolean, breed: string, primaryColor: string, behavior: string, collarDetails: string, notes: string }>({
    type: 'dog', isPet: true, breed: '', primaryColor: '', behavior: '', collarDetails: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const geo = useGeolocation();
  const { addFoundReport } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const base64 = await fileToBase64(files[0]); // Take only first for simple extraction
      setPhotos([base64]);
      
      const img = document.createElement('img');
      img.src = base64;
      await new Promise(r => { img.onload = r; });
      try {
        const features = await extractFeatures(img);
        setImageFeatures(features);
        
        // Real-time Match Scan
        setIsScanning(true);
        const { computeMatchConfidence } = await import('../../lib/matchingEngine');
        let matches = 0;
        for (const m of state.missingReports) {
          const { confidence } = computeMatchConfidence({ imageFeatures: features, details: { type: details.type } } as any, m);
          if (confidence >= 35) matches++;
        }
        setMatchCount(matches);
        setIsScanning(false);
        if (matches > 0) {
          showToast({ type: 'info', title: 'Matches Found!', message: `AI found ${matches} potential leads. Finish the report to see them!` });
        }
      } catch (err) {
        console.error('TFJS error', err);
      }
    }
  };

  const handleCameraCapture = async (data: { photo: string; location: { lat: number; lng: number } }) => {
    setPhotos([data.photo]);
    if (data.location.lat && data.location.lng) {
      setLocation(prev => ({
        ...prev,
        lat: data.location.lat,
        lng: data.location.lng,
        address: prev.address || `GPS: ${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}`,
      }));
    }
    setCameraOpen(false);

    const img = document.createElement('img');
    img.src = data.photo;
    await new Promise(r => { img.onload = r; });
    try {
      const features = await extractFeatures(img);
      setImageFeatures(features);
      
      // Real-time Match Scan
      setIsScanning(true);
      const { computeMatchConfidence } = await import('../../lib/matchingEngine');
      let matches = 0;
      for (const m of state.missingReports) {
        const { confidence } = computeMatchConfidence({ imageFeatures: features, details: { type: details.type } } as any, m);
        if (confidence >= 35) matches++;
      }
      setMatchCount(matches);
      setIsScanning(false);
      if (matches > 0) {
        showToast({ type: 'info', title: 'Matches Found!', message: `AI found ${matches} potential leads. Finish the report to see them!` });
      }
    } catch (err) {
      console.error('TFJS error', err);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      // Upload photos to Supabase Storage and get URLs
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadAnimalPhoto(photo);
        if (url) photoUrls.push(url);
      }

      const report: FoundAnimalReport = {
        id: generateId(),
        photos: photoUrls,
        location: {
          lat: location.lat || geo.latitude || 28.6139,
          lng: location.lng || geo.longitude || 77.2090,
          address: location.address || 'Location detected via GPS',
        },
        timestamp: new Date().toISOString(),
        details,
        imageFeatures,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reportedBy: user?.id || 'anonymous',
      };
      
      await addFoundReport(report);
      setSubmitted(true);
      showToast({ type: 'success', title: 'Report Submitted!', message: 'AI matching engine is scanning for matches now.' });
    } catch (err) {
      console.error('Failed to submit report', err);
      showToast({ type: 'error', title: 'Submission Failed', message: 'There was an error saving your report.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="report-success">
        <div className="success-icon"><Check size={48} /></div>
        <h2>Found Animal Reported!</h2>
        <p>Our matching engine has compared this report against all active missing pet records. Check the Match Center for results.</p>
        <Button variant="primary" onClick={() => {
          setSubmitted(false); setStep(1); setPhotos([]); setImageFeatures(undefined);
          setDetails({ type: 'dog', isPet: true, breed: '', primaryColor: '', behavior: '', collarDetails: '', notes: '' });
        }}>
          Submit Another Report
        </Button>
      </div>
    );
  }

  if (cameraOpen) {
    return <CameraCapture onCapture={handleCameraCapture} onClose={() => setCameraOpen(false)} />;
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Report a Found Animal</h1>
        <p>Help reunite a pet with their owner by providing details.</p>
      </div>

      <div className="report-steps">
        {['Photo', 'Location', 'Details', 'Review'].map((label, i) => (
          <div key={label} className={`step ${step > i + 1 ? 'step-done' : ''} ${step === i + 1 ? 'step-active' : ''}`}>
            <div className="step-circle">{step > i + 1 ? <Check size={14} /> : i + 1}</div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="report-card animate-fade-in-up">
          <h2><Camera size={22} /> Capture or Upload Photo</h2>
          <p className="report-card-desc">Take a photo of the animal to run it through our AI matching engine.</p>

          {photos.length === 0 && (
            <div className="photo-actions-row">
              <button className="photo-action-primary" onClick={() => setCameraOpen(true)}>
                <div className="photo-action-icon-wrap"><Scan size={28} /></div>
                <strong>Open Camera</strong>
                <span>Capture with GPS</span>
              </button>
              <button className="photo-action-secondary" onClick={() => fileInputRef.current?.click()}>
                <div className="photo-action-icon-wrap secondary"><Upload size={24} /></div>
                <strong>Upload Photo</strong>
                <span>From gallery</span>
              </button>
            </div>
          )}

          {photos.length > 0 && (
            <div className="photo-upload-area">
              <div className="photo-preview-grid">
                {photos.map((p, i) => (
                  <div key={i} className="photo-preview">
                    <img src={p} alt={`Upload ${i + 1}`} />
                    <button className="photo-remove" onClick={(e) => { e.stopPropagation(); setPhotos([]); setImageFeatures(undefined); setMatchCount(0); }}>×</button>
                  </div>
                ))}
              </div>
              
              {isScanning && (
                <div className="realtime-scan-status">
                  <div className="scan-spinner" />
                  <span>AI Scanning for matches...</span>
                </div>
              )}
              
              {!isScanning && matchCount > 0 && (
                <div className="realtime-scan-status success">
                  <Scan size={16} />
                  <span>AI found {matchCount} potential leads!</span>
                </div>
              )}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          
          <style>{`
            .realtime-scan-status {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-top: 16px;
              padding: 12px 16px;
              background: var(--color-bg-secondary);
              border-radius: var(--radius-md);
              font-size: 14px;
              color: var(--color-text-secondary);
              animation: fadeIn 0.3s ease;
            }
            .realtime-scan-status.success {
              background: rgba(16, 185, 129, 0.1);
              color: #10b981;
              border: 1px solid rgba(16, 185, 129, 0.2);
            }
            .scan-spinner {
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255,255,255,0.1);
              border-top-color: var(--color-primary);
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="report-nav">
            <div />
            <Button variant="primary" onClick={() => setStep(2)} disabled={photos.length === 0} iconRight={<ChevronRight size={18} />}>
              Next: Location
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="report-card animate-fade-in-up">
          <h2><MapPin size={22} /> Location Details</h2>
          <div className="form-grid">
            <div className="form-group form-full">
              <label>Address / Location</label>
              <input type="text" placeholder="e.g. Central Park near fountain" value={location.address} onChange={e => setLocation(prev => ({ ...prev, address: e.target.value }))} />
            </div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(1)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)} iconRight={<ChevronRight size={18} />}>Next: Details</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="report-card animate-fade-in-up">
          <h2><Info size={22} /> Animal Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Animal Type *</label>
              <select value={details.type} onChange={e => setDetails(prev => ({ ...prev, type: e.target.value as any }))}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Does it look like a pet?</label>
              <select value={details.isPet ? 'yes' : 'no'} onChange={e => setDetails(prev => ({ ...prev, isPet: e.target.value === 'yes' }))}>
                <option value="yes">Yes (Has collar, groomed)</option>
                <option value="no">No (Stray / Wild)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Breed (Optional)</label>
              <input type="text" placeholder="e.g. Golden Retriever" value={details.breed} onChange={e => setDetails(prev => ({ ...prev, breed: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Primary Color</label>
              <input type="text" placeholder="e.g. Brown" value={details.primaryColor} onChange={e => setDetails(prev => ({ ...prev, primaryColor: e.target.value }))} />
            </div>
            <div className="form-group form-full">
              <label>Collar Details</label>
              <input type="text" placeholder="e.g. Red collar with a bell" value={details.collarDetails} onChange={e => setDetails(prev => ({ ...prev, collarDetails: e.target.value }))} />
            </div>
            <div className="form-group form-full">
              <label>Behavior / Condition</label>
              <input type="text" placeholder="e.g. Scared, friendly, injured leg" value={details.behavior} onChange={e => setDetails(prev => ({ ...prev, behavior: e.target.value }))} />
            </div>
            <div className="form-group form-full">
              <label>Additional Notes</label>
              <textarea rows={2} placeholder="Any other observations" value={details.notes} onChange={e => setDetails(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(2)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="primary" onClick={() => setStep(4)} iconRight={<ChevronRight size={18} />}>Review</Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="report-card animate-fade-in-up">
          <h2>Review & Submit</h2>
          <div className="review-sections">
            <div className="review-section">
              <h3>Photo</h3>
              <div className="review-photos">
                {photos.map((p, i) => <img key={i} src={p} alt={`Photo ${i + 1}`} className="review-photo" />)}
              </div>
            </div>
            <div className="review-section">
              <h3>Location</h3>
              <p>{location.address || 'GPS location will be used'}</p>
            </div>
            <div className="review-section">
              <h3>Animal Details</h3>
              <div className="review-details">
                <div><strong>Type:</strong> {details.type}</div>
                <div><strong>Is Pet:</strong> {details.isPet ? 'Yes' : 'No'}</div>
                {details.primaryColor && <div><strong>Color:</strong> {details.primaryColor}</div>}
              </div>
            </div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(3)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="success" onClick={handleSubmit} loading={submitting} icon={<Send size={18} />}>
              Submit Report
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
