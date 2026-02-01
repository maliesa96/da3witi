'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, AlertCircle, X, Loader2, Camera, CameraOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { checkInGuest } from '@/lib/actions/guest';

export default function QRScanner({ eventId }: { eventId: string }) {
  const t = useTranslations('Dashboard');
  const uniqueId = useId();
  const containerId = `qr-reader-${uniqueId.replace(/:/g, '')}`;
  
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    guestName?: string;
    errorType?: string;
    eventName?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);
  const isProcessingRef = useRef(false);

  // Keep isProcessingRef in sync with isProcessing state
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Initialize scanner instance and get cameras
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      } catch (err) {
        console.error('Failed to get cameras:', err);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleScan = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    
    // Prevent immediate rescan of the same code within 2 seconds
    const now = Date.now();
    if (lastScannedCodeRef.current && 
        lastScannedCodeRef.current.code === decodedText && 
        now - lastScannedCodeRef.current.time < 2000) {
      return;
    }
    
    // Update last scanned
    lastScannedCodeRef.current = { code: decodedText, time: now };

    // Pause scanning while processing
    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanResult(null);

    try {
      const result = await checkInGuest({ guestIdentifier: decodedText, eventId });
      
      if (result.success) {
        setScanResult({
          success: true,
          message: 'SUCCESS',
          guestName: result.guestName
        });
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setScanResult(null), 3000);
      } else {
        setScanResult({
          success: false,
          message: result.error || 'NOT_FOUND',
          guestName: result.guestName,
          errorType: result.error,
          eventName: result.eventName
        });
      }
    } catch {
      setScanResult({
        success: false,
        message: 'GENERIC_ERROR'
      });
    } finally {
      // Small delay before allowing the NEXT scan (different code)
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 2000);
    }
  };

  const startScanning = async () => {
    if (!selectedCamera || scannerRef.current) return;
    
    // Show the container first so the scanner can render into it
    setIsScanning(true);
    
    // Wait for React to update the DOM
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const container = document.getElementById(containerId);
    if (!container) {
      setIsScanning(false);
      return;
    }
    
    // Clear any existing content - library expects empty container
    container.innerHTML = '';
    
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScan,
        () => {} // Ignore scan failures (no QR in frame)
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanResult(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Camera selection */}
      {cameras.length > 1 && !isScanning && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-stone-600">{t('select_camera') || 'Camera'}:</label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner container */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {!isScanning && (
          <div className="w-full min-h-[300px] bg-stone-100 rounded-xl flex items-center justify-center">
            <div className="text-center text-stone-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('camera_ready') || 'Camera ready'}</p>
            </div>
          </div>
        )}
        <div 
          id={containerId} 
          className={`w-full rounded-xl overflow-hidden ${isScanning ? 'min-h-[300px]' : 'hidden'}`}
        />
      </div>

      {/* Start/Stop button */}
      <button
        onClick={isScanning ? stopScanning : startScanning}
        disabled={!selectedCamera && !isScanning}
        className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
          isScanning
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-stone-900 hover:bg-stone-800 text-white disabled:bg-stone-300 disabled:cursor-not-allowed'
        }`}
      >
        {isScanning ? (
          <>
            <CameraOff className="w-4 h-4" />
            {t('stop_scanning') || 'Stop Scanning'}
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            {t('start_scanning') || 'Start Scanning'}
          </>
        )}
      </button>

      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-stone-100 rounded-xl animate-pulse">
          <Loader2 className="w-5 h-5 text-stone-400 animate-spin mr-2" />
          <span className="text-sm font-medium text-stone-600">{t('processing') || 'Processing...'}</span>
        </div>
      )}

      {scanResult && (
        <div 
          className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
            scanResult.success 
              ? 'bg-green-50 border-green-100 text-green-800' 
              : scanResult.errorType === 'ALREADY_CHECKED_IN'
              ? 'bg-amber-50 border-amber-100 text-amber-800'
              : 'bg-red-50 border-red-100 text-red-800'
          }`}
        >
          {scanResult.success ? (
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <h4 className="font-bold text-sm">
              {scanResult.message === 'SUCCESS' 
                ? (t('scan_success') || 'Check-in successful!')
                : scanResult.message === 'ALREADY_CHECKED_IN'
                ? (t('scan_already_checked_in') || 'Already checked in')
                : scanResult.message === 'WRONG_EVENT'
                ? (t('scan_error_wrong_event') || 'Guest belongs to another event')
                : scanResult.message === 'GENERIC_ERROR'
                ? (t('scan_error_generic') || 'Failed to process check-in')
                : (t('scan_error_not_found') || 'Guest not found')
              }
            </h4>
            {scanResult.guestName && (
              <p className="text-xs opacity-90 mt-0.5">
                {scanResult.guestName}
                {scanResult.eventName && (
                  <span className="block italic mt-0.5 opacity-75">
                    ({scanResult.eventName})
                  </span>
                )}
              </p>
            )}
          </div>
          <button onClick={() => setScanResult(null)} className="p-1 hover:bg-black/5 rounded-md">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-stone-400">
          {t('scan_instruction') || 'Place the QR code within the frame to scan'}
        </p>
      </div>

      {/* CSS to fix flickering corners and style the scanner */}
      <style dangerouslySetInnerHTML={{ __html: `
        #${containerId} {
          position: relative;
        }
        #${containerId} video {
          border-radius: 12px;
          width: 100% !important;
        }
        /* The qr-shaded-region contains the scanning box overlay */
        #${containerId} #qr-shaded-region {
          border-color: rgba(0, 0, 0, 0.5) !important;
        }
        /* Hide the animated/flickering corner indicators drawn on detection */
        #${containerId} svg {
          display: none !important;
        }
        /* Make the scan box corners a stable color instead of flickering green */
        #${containerId} [style*="border-width: 5px"] {
          border-color: #a8a29e !important; /* stone-400 - stable subtle color */
          transition: none !important;
        }
        /* Hide library branding/info */
        #${containerId} a[href*="scanapp"],
        #${containerId} img[alt*="Info"] {
          display: none !important;
        }
      ` }} />
    </div>
  );
}

