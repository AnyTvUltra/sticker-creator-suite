import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { LoaderCircle } from 'lucide-react';

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF,
]);

// The native detector decodes off the main thread, so it can afford 720p. ZXing decodes every frame
// on the main thread: keep the default 640×480 there, larger frames starve taps on phones.
const NATIVE_VIDEO: MediaTrackConstraints = { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };
const ZXING_VIDEO: MediaTrackConstraints = { facingMode: { ideal: 'environment' } };
const NATIVE_FORMATS = ['qr_code', 'data_matrix', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorCtor = { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> };

/** Native BarcodeDetector (Android Chrome) decodes off the main thread; null where unsupported (iOS, Firefox). */
async function nativeDetector(): Promise<Detector | null> {
  const BD = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!BD) return null;
  try {
    const supported = await BD.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter(f => supported.includes(f));
    return formats.includes('qr_code') ? new BD({ formats }) : null;
  } catch { return null; }
}

/** Live camera view that decodes barcodes; calls onResult with the raw text. Stops the camera on unmount. */
export function BarcodeScanner({ onResult, onError, className = '' }: { onResult: (text: string) => void; onError?: (err: unknown) => void; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let stop: (() => void) | null = null;
    let last: { text: string; at: number } | null = null;
    const emit = (text: string) => {
      if (last && last.text === text && Date.now() - last.at < 1500) return false;
      last = { text, at: Date.now() };
      onResultRef.current(text);
      return true;
    };
    void (async () => {
      const video = videoRef.current!;
      const detector = await nativeDetector();
      if (cancelled) return;
      if (detector) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: NATIVE_VIDEO });
        stop = () => stream.getTracks().forEach(t => t.stop());
        if (cancelled) { stop(); return; }
        video.srcObject = stream;
        await video.play().catch(() => {});
        if (cancelled) return;
        setReady(true);
        const loop = async () => {
          let found = false;
          if (!document.hidden && video.readyState >= 2) {
            try { const v = (await detector.detect(video))[0]?.rawValue; if (v) found = emit(v); } catch { /* transient frame errors */ }
          }
          if (!cancelled) timer = window.setTimeout(loop, found ? 800 : 100);
        };
        void loop();
      } else {
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200, delayBetweenScanSuccess: 800 });
        const controls = await reader.decodeFromConstraints({ audio: false, video: ZXING_VIDEO }, video, result => { if (result && !document.hidden) emit(result.getText()); });
        stop = () => controls.stop();
        if (cancelled) { stop(); return; }
        setReady(true);
      }
    })().catch(err => { if (!cancelled) onErrorRef.current?.(err); });
    return () => { cancelled = true; clearTimeout(timer); stop?.(); };
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
