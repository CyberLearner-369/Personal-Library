import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { looksLikeBookBarcode } from '@/lib/isbn';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/**
 * ISBN scanner built on the native BarcodeDetector API (Chrome/Edge/Android;
 * Safari 17+ behind camera permission). Where unsupported the dialog
 * degrades to manual entry, which is always shown as a fallback anyway.
 */
export function BarcodeScanner({
  open,
  onClose,
  onDetect,
}: {
  open: boolean;
  onClose: () => void;
  onDetect: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const supported =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!open) return;
    setManual('');
    setError(
      supported ? null : 'This browser cannot scan — type the ISBN below instead.',
    );
    if (!supported) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let lastCheck = 0;
    let cancelled = false;
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
      .BarcodeDetector;
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a'] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async (timestamp: number) => {
          if (cancelled) return;
          if (timestamp - lastCheck > 250 && video.readyState >= 2) {
            lastCheck = timestamp;
            try {
              const codes = await detector.detect(video);
              const hit =
                codes.find((code) => looksLikeBookBarcode(code.rawValue)) ?? codes[0];
              if (hit) {
                onDetect(hit.rawValue);
                return;
              }
            } catch {
              /* frame not decodable yet — keep polling */
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch {
        setError('Camera unavailable — allow access, or type the ISBN below.');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, supported, onDetect]);

  return (
    <Modal open={open} onClose={onClose} title="Scan ISBN barcode" size="sm">
      <div className="flex flex-col gap-4">
        {supported && !error && (
          <div className="overflow-hidden rounded-lg border border-line bg-ink/90">
            {/* Live camera preview: no captions apply. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full" />
          </div>
        )}
        {error && <p className="text-sm text-muted">{error}</p>}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) onDetect(manual.trim());
          }}
        >
          <Input
            label="Or type the ISBN"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="978…"
            inputMode="numeric"
            autoComplete="off"
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={!manual.trim()}>
            Use
          </Button>
        </form>
        <p className="text-xs text-faint">
          Point the camera at the barcode on the back cover. Detection happens on your
          device — nothing is uploaded.
        </p>
      </div>
    </Modal>
  );
}
