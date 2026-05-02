import { useState, useRef, useCallback, useEffect } from 'react';
import { X, RefreshCw, RotateCcw, Check, MapPin, Camera } from 'lucide-react';
import './CameraCapture.css';

interface CameraCaptureProps {
  onCapture: (data: { photo: string; location: { lat: number; lng: number } }) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'preview' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'active'>('pending');

  // Start GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('active');
      },
      () => setGpsStatus('pending'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    setStatus('loading');
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('ready');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  // Capture photo
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedPhoto(dataUrl);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 400);
    setStatus('preview');

    // Stop video
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  }, [facingMode]);

  // Retake
  const handleRetake = useCallback(() => {
    setCapturedPhoto(null);
    setStatus('loading');
    startCamera();
  }, [startCamera]);

  // Use photo
  const handleUse = useCallback(() => {
    if (!capturedPhoto) return;
    onCapture({
      photo: capturedPhoto,
      location: gpsLocation || { lat: 0, lng: 0 },
    });
  }, [capturedPhoto, gpsLocation, onCapture]);

  // Switch camera
  const handleSwitchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  return (
    <div className="camera-overlay">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div className="camera-top-bar">
        <button className="camera-close-btn" onClick={onClose} aria-label="Close camera">
          <X size={20} />
        </button>
        <span className="camera-title">
          {status === 'preview' ? 'Preview' : 'Capture Photo'}
        </span>
        {status === 'ready' && (
          <button className="camera-switch-btn" onClick={handleSwitchCamera} aria-label="Switch camera">
            <RefreshCw size={18} />
          </button>
        )}
        {status !== 'ready' && <div style={{ width: 40 }} />}
      </div>

      {/* Video / Preview / Loading / Error */}
      <div className="camera-video-container">
        {status === 'loading' && (
          <div className="camera-loading">
            <div className="camera-spinner" />
            <span>Starting camera...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="camera-error">
            <Camera size={40} />
            <strong>Camera unavailable</strong>
            <p>{errorMsg || 'Unable to access the camera. Please allow camera permissions and try again.'}</p>
            <button className="camera-error-retry" onClick={startCamera}>Try Again</button>
          </div>
        )}

        {(status === 'ready' || status === 'loading') && (
          <video
            ref={videoRef}
            className="camera-video"
            playsInline
            muted
            autoPlay
            style={{
              display: status === 'ready' ? 'block' : 'none',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />
        )}

        {status === 'preview' && capturedPhoto && (
          <img src={capturedPhoto} alt="Captured" className="camera-preview-img" />
        )}

        {/* Viewfinder overlay */}
        {status === 'ready' && (
          <div className="camera-viewfinder">
            <div className="viewfinder-corner tl" />
            <div className="viewfinder-corner tr" />
            <div className="viewfinder-corner bl" />
            <div className="viewfinder-corner br" />
            <div className="viewfinder-scanline" />
          </div>
        )}

        {/* Flash */}
        {showFlash && <div className="camera-flash" />}
      </div>

      {/* GPS indicator */}
      <div className={`camera-gps-indicator ${gpsStatus === 'active' ? 'gps-active' : 'gps-pending'}`}>
        <div className="gps-dot" />
        <MapPin size={12} />
        {gpsStatus === 'active'
          ? `${gpsLocation?.lat.toFixed(4)}, ${gpsLocation?.lng.toFixed(4)}`
          : 'Acquiring GPS...'
        }
      </div>

      {/* Bottom controls */}
      <div className="camera-bottom-bar">
        {status === 'ready' && (
          <button className="camera-shutter" onClick={handleCapture} aria-label="Take photo" />
        )}

        {status === 'preview' && (
          <div className="camera-preview-actions">
            <button className="camera-preview-btn camera-btn-retake" onClick={handleRetake}>
              <RotateCcw size={18} />
              Retake
            </button>
            <button className="camera-preview-btn camera-btn-use" onClick={handleUse}>
              <Check size={18} />
              Use Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
