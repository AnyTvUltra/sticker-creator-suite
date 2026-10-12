import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { LoaderCircle } from 'lucide-react';

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.ITF, BarcodeFormat.CODABAR, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

/** Live camera view that decodes barcodes; calls onResult with the raw text. Stops the camera on unmount. */
export function BarcodeScanner({ onResult, onError, className = '' }: { onResult: (text: string) => void; onError?: (err: unknown) => void; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
    reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: 'environment' } } },
      videoRef.current!,
      (result) => { if (result) onResult(result.getText()); },
    ).then(controls => {
      if (cancelled) controls.stop(); else { controlsRef.current = controls; setReady(true); }
    }).catch(err => { if (!cancelled) onError?.(err); });
    return () => { cancelled = true; controlsRef.current?.stop(); controlsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className={`barcode-scanner ${ready ? 'is-live' : ''} ${className}`}>
    <video ref={videoRef} muted playsInline autoPlay />
    <div className="scan-frame" aria-hidden="true"><i/><i/><i/><i/><span className="scan-line"/></div>
    {!ready && <div className="scan-loading"><LoaderCircle className="animate-spin"/></div>}
  </div>;
}

/** Shared helper: decode once from a video element is handled above; this only classifies camera errors. */
export const isCameraDenied = (err: unknown) => {
  const name = (err as { name?: string })?.name ?? '';
  return name === 'NotAllowedError' || name === 'SecurityError' || name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError';
};
