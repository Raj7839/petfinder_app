import React from 'react';
import { Download, Printer, X, MapPin, Phone, Heart } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { MissingAnimalReport } from '../types';
import { useLanguage } from '../i18n';

interface PosterGeneratorProps {
  report: MissingAnimalReport;
  onClose: () => void;
}

export function PosterGenerator({ report, onClose }: PosterGeneratorProps) {
  const { t } = useLanguage();
  const handlePrint = () => {
    window.print();
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/map?id=' + report.id)}`;

  return (
    <div className="poster-modal-overlay">
      <div className="poster-modal">
        <div className="poster-modal-header">
          <h3>Generate Missing Pet Poster</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        
        <div className="poster-preview-container">
          {/* This is the part that will be printed */}
          <div className="printable-poster" id="missing-pet-poster">
            <div className="poster-header">
              <h1>MISSING PET</h1>
              <div className="poster-reward">REWARD OFFERED</div>
            </div>

            <div className="poster-main">
              <div className="poster-image-wrap">
                <img src={report.photos[0]} alt="Missing Pet" className="poster-image" />
              </div>

              <div className="poster-info">
                <div className="poster-name">{report.identity.name || 'Help us find them!'}</div>
                <div className="poster-details-grid">
                  <div className="p-detail"><strong>Type:</strong> {report.identity.type}</div>
                  <div className="p-detail"><strong>Breed:</strong> {report.identity.breed || 'Unknown'}</div>
                  <div className="p-detail"><strong>Color:</strong> {report.identity.primaryColor}</div>
                  <div className="p-detail"><strong>Last Seen:</strong> {formatDate(report.lastSeen.date)}</div>
                </div>

                <div className="poster-description">
                  <h3>Distinguishing Features</h3>
                  <p>{report.identity.distinguishingFeatures || 'No specific features listed.'}</p>
                  <h3>Last Seen At</h3>
                  <p><MapPin size={14} inline /> {report.lastSeen.location.address}</p>
                </div>
              </div>
            </div>

            <div className="poster-footer">
              <div className="poster-contact">
                <h2>PLEASE CALL: {report.contact.phone}</h2>
                <p>Contact: {report.contact.name}</p>
              </div>
              <div className="poster-qr">
                <img src={qrUrl} alt="Scan to report sighting" />
                <span>Scan to report sighting</span>
              </div>
            </div>

            <div className="poster-branding">
              <Heart size={16} fill="currentColor" /> Created with <strong>{t.brand.name}</strong>
            </div>
          </div>
        </div>

        <div className="poster-actions">
          <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>Print Poster</Button>
          <Button variant="primary" icon={<Download size={18} />} onClick={() => alert('Feature coming soon: Direct Image Download')}>Download Image</Button>
        </div>
      </div>

      <style>{`
        .poster-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .poster-modal {
          background: var(--color-bg-primary);
          border-radius: 16px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .poster-modal-header {
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
        }
        .poster-preview-container {
          flex: 1;
          overflow-y: auto;
          padding: 40px;
          background: var(--color-bg-secondary);
          display: flex;
          justify-content: center;
        }
        
        /* Printable Poster Styles */
        .printable-poster {
          background: white;
          color: black;
          width: 595px; /* A4 width in pixels at 72dpi roughly */
          min-height: 842px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          border: 1px solid #ddd;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .poster-header { text-align: center; margin-bottom: 30px; }
        .poster-header h1 { font-size: 64px; font-weight: 900; color: #e11d48; margin: 0; line-height: 1; }
        .poster-reward { background: #000; color: #fff; display: inline-block; padding: 4px 20px; font-weight: 700; font-size: 20px; margin-top: 10px; }

        .poster-main { display: flex; gap: 30px; flex: 1; }
        .poster-image-wrap { flex: 1; }
        .poster-image { width: 100%; aspect-ratio: 1; object-fit: cover; border: 4px solid #000; border-radius: 8px; }

        .poster-info { flex: 1; }
        .poster-name { font-size: 36px; font-weight: 800; margin-bottom: 20px; border-bottom: 3px solid #eee; padding-bottom: 10px; }
        .poster-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 16px; }
        .poster-description h3 { font-size: 18px; margin-bottom: 8px; color: #444; }
        .poster-description p { font-size: 15px; line-height: 1.4; margin-bottom: 20px; color: #666; }

        .poster-footer { 
          margin-top: 40px; 
          padding-top: 30px; 
          border-top: 4px dashed #ddd; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }
        .poster-contact h2 { font-size: 28px; font-weight: 800; margin-bottom: 5px; }
        .poster-contact p { font-size: 18px; color: #555; }
        
        .poster-qr { text-align: center; }
        .poster-qr img { width: 100px; height: 100px; margin-bottom: 5px; }
        .poster-qr span { font-size: 10px; display: block; color: #888; }

        .poster-branding { text-align: center; margin-top: 30px; font-size: 12px; color: #aaa; display: flex; align-items: center; justify-content: center; gap: 6px; }

        .poster-actions { padding: 20px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 12px; }

        @media print {
          body * { visibility: hidden; }
          #missing-pet-poster, #missing-pet-poster * { visibility: visible; }
          #missing-pet-poster { position: fixed; left: 0; top: 0; width: 100%; height: 100%; border: none; box-shadow: none; margin: 0; padding: 40px; }
          .poster-modal-overlay, .poster-actions, .poster-modal-header { display: none; }
        }
      `}</style>
    </div>
  );
}
