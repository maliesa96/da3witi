'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { checkInGuest } from '@/lib/actions/guest';

export default function QRScanner({ eventId }: { eventId: string }) {
  const t = useTranslations('Dashboard');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    guestName?: string;
    errorType?: string;
    eventName?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessing) return;
    
    // Prevent immediate rescan of the same code within 5 seconds
    const now = Date.now();
    if (lastScannedCodeRef.current && 
        lastScannedCodeRef.current.code === decodedText && 
        now - lastScannedCodeRef.current.time < 5000) {
      return;
    }
    
    // Update last scanned
    lastScannedCodeRef.current = { code: decodedText, time: now };

    // Pause scanning while processing
    setIsProcessing(true);
    setScanResult(null);

    try {
      const result = await checkInGuest({ guestIdentifier: decodedText, eventId });
      
      if (result.success) {
        setScanResult({
          success: true,
          message: t('scan_success') || 'Check-in successful!',
          guestName: result.guestName
        });
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setScanResult(null), 3000);
      } else {
        let errorMessage = t('scan_error_not_found') || 'Guest not found';
        
        if (result.error === 'ALREADY_CHECKED_IN') {
          errorMessage = t('scan_already_checked_in') || 'Already checked in';
        } else if (result.error === 'WRONG_EVENT') {
          errorMessage = t('scan_error_wrong_event') || 'Guest belongs to another event';
        }

        setScanResult({
          success: false,
          message: errorMessage,
          guestName: result.guestName,
          errorType: result.error,
          eventName: result.eventName
        });
      }
    } catch {
      setScanResult({
        success: false,
        message: t('scan_error_generic') || 'Failed to process check-in'
      });
    } finally {
      // Small delay before allowing the NEXT scan (different code)
      setTimeout(() => setIsProcessing(false), 2000);
    }
  }, [isProcessing, eventId, t]);

  const onScanFailure = useCallback(() => {
    // Usually we don't need to do anything on scan failure (e.g. no QR in frame)
  }, []);

  useEffect(() => {
    // Prevent double initialization if already scanning
    if (scannerRef.current) return;

    // Ensure the container exists and is empty before initializing
    const container = document.getElementById("qr-reader");
    if (!container) return;
    container.innerHTML = "";

    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    // Listen for clicks on the "Stop Scanning" button to clear notifications
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // The library's stop button usually contains 'stop' text or specific IDs
      if (target && (target.textContent?.toLowerCase().includes('stop') || target.id?.includes('stop'))) {
        setScanResult(null);
      }
    };

    container.addEventListener('click', handleContainerClick);

    return () => {
      const currentContainer = document.getElementById("qr-reader");
      if (scannerRef.current) {
        if (currentContainer) {
          currentContainer.removeEventListener('click', handleContainerClick);
        }
        const scannerInstance = scannerRef.current;
        scannerRef.current = null;
        scannerInstance.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner", error);
        });
        
        // Final cleanup to ensure DOM is clean for next mount
        if (currentContainer) {
          currentContainer.innerHTML = "";
        }
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div id="qr-reader" className="w-full"></div>
      </div>

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
            <h4 className="font-bold text-sm">{scanResult.message}</h4>
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

      <style dangerouslySetInnerHTML={{ __html: `
        #qr-reader {
          border: none !important;
        }
        #qr-reader__dashboard_section_csr button {
          background-color: #1c1917 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s !important;
        }
        #qr-reader__dashboard_section_csr button:hover {
          background-color: #292524 !important;
        }
        #qr-reader__scan_region {
          background: #f5f5f4 !important;
          border-radius: 12px !important;
        }
        /* Fix flickering green corners */
        #qr-reader__scan_region > div {
          border-color: #a8a29e !important; /* stone-400 */
          border-radius: 4px !important;
        }
        #qr-reader img {
          display: none !important;
        }
        #qr-reader__status_span {
          display: none !important;
        }
      ` }} />
    </div>
  );
}

