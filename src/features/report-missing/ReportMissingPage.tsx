import { useState, useRef } from 'react';
import { Camera, MapPin, Send, ChevronRight, ChevronLeft, Check, Heart, Phone, Upload, Image } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../store/AppContext';
import { useToast } from '../../components/ui/Toast';
import { useGeolocation } from '../../hooks/useGeolocation';
import { generateId, fileToBase64 } from '../../utils/helpers';
import { extractFeatures } from '../../lib/tfjs';
import { uploadAnimalPhoto } from '../../lib/storage';
import type { MissingAnimalReport } from '../../types';
import '../report-found/ReportFound.css';

export function ReportMissingPage() {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageFeatures, setImageFeatures] = useState<number[][]>([]);
  const [identity, setIdentity] = useState<{ type: 'dog' | 'cat' | 'bird' | 'other', name: string, breed: string, primaryColor: string, secondaryColor: string, distinguishingFeatures: string, collarDetails: string }>({ type: 'dog', name: '', breed: '', primaryColor: '', secondaryColor: '', distinguishingFeatures: '', collarDetails: '' });
  const [lastSeen, setLastSeen] = useState({ location: { lat: 0, lng: 0, address: '' }, date: '', time: '', circumstances: '' });
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const geo = useGeolocation();
  const { addMissingReport } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const base64 = await fileToBase64(file);
      setPhotos(prev => [...prev, base64]);
      
      const img = document.createElement('img');
      img.src = base64;
      await new Promise(r => { img.onload = r; });
      try {
        const features = await extractFeatures(img);
        setImageFeatures(prev => [...prev, features]);
        
        // Real-time Match Scan
        setIsScanning(true);
        const { computeMatchConfidence } = await import('../../lib/matchingEngine');
        let matches = 0;
        for (const f of state.foundReports) {
          const { confidence } = computeMatchConfidence(f, { imageFeatures: [features], identity: { type: identity.type } } as any);
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

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      // Upload photos to Supabase Storage and get URLs
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadAnimalPhoto(photo);
        if (url) photoUrls.push(url);
      }

      const report: MissingAnimalReport = {
        id: generateId(),
        photos: photoUrls,
        identity,
        lastSeen: {
          ...lastSeen,
          location: {
            lat: lastSeen.location.lat || geo.latitude || 40.7580,
            lng: lastSeen.location.lng || geo.longitude || -73.9855,
            address: lastSeen.location.address || 'Location detected via GPS',
          },
        },
        contact,
        imageFeatures,
        status: 'active',
        createdAt: new Date().toISOString(),
        reportedBy: user?.id || 'anonymous',
      };
      
      await addMissingReport(report);
      setSubmitted(true);
      showToast({ type: 'success', title: 'Missing Pet Report Filed!', message: 'AI matching engine is now active.' });
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
        <h2>Missing Pet Report Filed</h2>
        <p>Our AI matching engine is now actively scanning found animal reports.</p>
        <Button variant="primary" onClick={() => { setSubmitted(false); setStep(1); setPhotos([]); setImageFeatures([]); }}>
          File Another Report
        </Button>
      </div>
    );
  }

  const steps = ['Photos', 'Identity', 'Last Seen', 'Contact', 'Review'];

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Report a Missing Pet</h1>
        <p>Provide details to help our AI system find your pet.</p>
      </div>

      <div className="report-steps">
        {steps.map((label, i) => (
          <div key={label} className={`step ${step > i + 1 ? 'step-done' : ''} ${step === i + 1 ? 'step-active' : ''}`}>
            <div className="step-circle">{step > i + 1 ? <Check size={14} /> : i + 1}</div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="report-card animate-fade-in-up">
          <h2><Camera size={22} /> Upload Photos</h2>
          <p className="report-card-desc">Upload clear, recent photos. The AI works best with clear face and body shots.</p>
          <div className="photo-upload-area" onClick={() => fileInputRef.current?.click()}>
            {photos.length === 0 ? (
              <><div className="upload-icon"><Image size={40} /></div><p>Click to upload photos</p></>
            ) : (
              <div className="photo-preview-grid">
                {photos.map((p, i) => (
                  <div key={i} className="photo-preview">
                    <img src={p} alt={`Upload ${i + 1}`} />
                    <button className="photo-remove" onClick={(e) => { e.stopPropagation(); setPhotos(prev => prev.filter((_, j) => j !== i)); setImageFeatures(prev => prev.filter((_, j) => j !== i)); }}>×</button>
                  </div>
                ))}
                <div className="photo-add"><Upload size={20} /><span>Add</span></div>
              </div>
            )}
            
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
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
          
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
              width: 100%;
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
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>

          <div className="report-nav">
            <div />
            <Button variant="primary" onClick={() => setStep(2)} disabled={photos.length === 0} iconRight={<ChevronRight size={18} />}>Next</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="report-card animate-fade-in-up">
          <h2><Heart size={22} /> Pet Details</h2>
          <div className="form-grid">
            <div className="form-group"><label>Animal Type</label><select value={identity.type} onChange={e => setIdentity(prev => ({ ...prev, type: e.target.value as any }))}><option value="dog">Dog</option><option value="cat">Cat</option><option value="bird">Bird</option><option value="other">Other</option></select></div>
            <div className="form-group"><label>Pet Name</label><input type="text" placeholder="Name" value={identity.name} onChange={e => setIdentity(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="form-group"><label>Breed</label><input type="text" placeholder="e.g. Golden Retriever" value={identity.breed} onChange={e => setIdentity(prev => ({ ...prev, breed: e.target.value }))} /></div>
            <div className="form-group"><label>Primary Color</label><input type="text" placeholder="e.g. Brown" value={identity.primaryColor} onChange={e => setIdentity(prev => ({ ...prev, primaryColor: e.target.value }))} /></div>
            <div className="form-group"><label>Secondary Color</label><input type="text" placeholder="e.g. White chest" value={identity.secondaryColor} onChange={e => setIdentity(prev => ({ ...prev, secondaryColor: e.target.value }))} /></div>
            <div className="form-group"><label>Collar Details</label><input type="text" placeholder="Red collar with tag" value={identity.collarDetails} onChange={e => setIdentity(prev => ({ ...prev, collarDetails: e.target.value }))} /></div>
            <div className="form-group form-full"><label>Distinguishing Features</label><textarea rows={2} placeholder="Scars, unique spots, tail type" value={identity.distinguishingFeatures} onChange={e => setIdentity(prev => ({ ...prev, distinguishingFeatures: e.target.value }))} /></div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(1)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)} iconRight={<ChevronRight size={18} />}>Next</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="report-card animate-fade-in-up">
          <h2><MapPin size={22} /> Last Seen Location</h2>
          <div className="form-grid">
            <div className="form-group form-full"><label>Location / Address</label><input type="text" placeholder="e.g. Central Park" value={lastSeen.location.address} onChange={e => setLastSeen(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))} /></div>
            <div className="form-group"><label>Date Last Seen</label><input type="date" value={lastSeen.date} onChange={e => setLastSeen(prev => ({ ...prev, date: e.target.value }))} /></div>
            <div className="form-group"><label>Time</label><input type="time" value={lastSeen.time} onChange={e => setLastSeen(prev => ({ ...prev, time: e.target.value }))} /></div>
            <div className="form-group form-full"><label>Circumstances</label><textarea rows={3} placeholder="How did they get lost?" value={lastSeen.circumstances} onChange={e => setLastSeen(prev => ({ ...prev, circumstances: e.target.value }))} /></div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(2)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="primary" onClick={() => setStep(4)} iconRight={<ChevronRight size={18} />}>Next</Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="report-card animate-fade-in-up">
          <h2><Phone size={22} /> Contact Info</h2>
          <div className="form-grid">
            <div className="form-group"><label>Name *</label><input type="text" value={contact.name} onChange={e => setContact(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="form-group"><label>Phone *</label><input type="tel" value={contact.phone} onChange={e => setContact(prev => ({ ...prev, phone: e.target.value }))} /></div>
            <div className="form-group form-full"><label>Email</label><input type="email" value={contact.email} onChange={e => setContact(prev => ({ ...prev, email: e.target.value }))} /></div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(3)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="primary" onClick={() => setStep(5)} disabled={!contact.name || !contact.phone} iconRight={<ChevronRight size={18} />}>Review</Button>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card className="report-card animate-fade-in-up">
          <h2>Review & Submit</h2>
          <div className="review-sections">
            <div className="review-section"><h3>Photos</h3><div className="review-photos">{photos.map((p, i) => <img key={i} src={p} alt="" className="review-photo" />)}</div></div>
            <div className="review-section"><h3>Pet</h3><div className="review-details">
              <div><strong>Type:</strong> {identity.type}</div>
              {identity.name && <div><strong>Name:</strong> {identity.name}</div>}
              {identity.breed && <div><strong>Breed:</strong> {identity.breed}</div>}
            </div></div>
            <div className="review-section"><h3>Last Seen</h3><div className="review-details">
              <div><strong>Location:</strong> {lastSeen.location.address || 'GPS'}</div>
            </div></div>
          </div>
          <div className="report-nav">
            <Button variant="ghost" onClick={() => setStep(4)} icon={<ChevronLeft size={18} />}>Back</Button>
            <Button variant="success" onClick={handleSubmit} loading={submitting} icon={<Send size={18} />}>Submit Report</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
