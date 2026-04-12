"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface QRScanResult {
  rawValue: string;
}

interface QRScannerProps {
  onScan: (result: QRScanResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorInstance;
  }
  interface BarcodeDetectorInstance {
    detect(image: HTMLVideoElement | HTMLCanvasElement | ImageData): Promise<Array<{ rawValue: string; format: string }>>;
  }
}

export function QRScanner({ onScan, onError, className }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);

  // D31: Detect BarcodeDetector support (Chrome/Edge only — not Safari)
  const hasBarcodeDetector = typeof window !== "undefined" && !!window.BarcodeDetector;

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScan = useCallback(async () => {
    setStatus("starting");
    setErrorMsg("");

    // D31: Safari fallback — BarcodeDetector is Chrome/Edge only.
    // On Safari, show the manual input prominently and camera preview without detection.
    if (!window.BarcodeDetector) {
      setErrorMsg("このブラウザはカメラQRスキャン（自動認識）に対応していません。手動でコードを入力してください。");
      setStatus("error");
      setShowManual(true);
      // Still try to open camera so user can photograph the QR and read it manually
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("scanning"); // show viewfinder even without auto-detect
        }
      } catch {
        // Camera access denied on Safari too — manual input is the only option
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new window.BarcodeDetector!({ formats: ["qr_code"] });
      setStatus("scanning");

      const tick = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) {
              stopCamera();
              setStatus("idle");
              onScan({ rawValue: barcodes[0].rawValue });
              return;
            }
          } catch {
            // ignore per-frame errors
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "カメラへのアクセスに失敗しました";
      setErrorMsg(msg);
      setStatus("error");
      setShowManual(true);
      onError?.(msg);
    }
  }, [onScan, onError, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  function handleManualSubmit() {
    const val = manualInput.trim();
    if (!val) return;
    onScan({ rawValue: val });
    setManualInput("");
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Camera viewfinder */}
      {status === "scanning" && (
        <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Crosshair overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-white/70 rounded-xl">
              {/* Corner marks */}
              {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                <div key={i} className={cn("absolute w-6 h-6 border-white border-4", pos, {
                  "border-r-0 border-b-0 rounded-tl-md": i === 0,
                  "border-l-0 border-b-0 rounded-tr-md": i === 1,
                  "border-r-0 border-t-0 rounded-bl-md": i === 2,
                  "border-l-0 border-t-0 rounded-br-md": i === 3,
                })} />
              ))}
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-white text-xs bg-black/50 px-3 py-1 rounded-full">
              QRコードを枠内に合わせてください
            </span>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Status messages */}
      {status === "starting" && (
        <div className="text-gray-500 text-sm animate-pulse">カメラを起動中...</div>
      )}
      {status === "error" && (
        <div className="text-red-500 text-sm text-center max-w-xs">{errorMsg}</div>
      )}

      {/* Controls */}
      {/* D31: Safari hint shown before start */}
      {!hasBarcodeDetector && status === "idle" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 max-w-xs text-center">
          このブラウザ（Safari等）では自動QR認識は動作しません。<br />
          カメラを起動してコードを確認し、<strong>手動入力</strong>してください。
        </div>
      )}

      {status !== "scanning" && (
        <button
          type="button"
          onClick={startScan}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>📷</span>
          <span>{hasBarcodeDetector ? "QRスキャン開始" : "カメラを起動"}</span>
        </button>
      )}
      {status === "scanning" && (
        <button
          type="button"
          onClick={() => { stopCamera(); setStatus("idle"); }}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors"
        >
          キャンセル
        </button>
      )}

      {/* Manual entry toggle */}
      <button
        type="button"
        onClick={() => setShowManual((p) => !p)}
        className="text-xs text-blue-500 underline"
      >
        {showManual ? "手動入力を閉じる" : "手動でコードを入力"}
      </button>

      {showManual && (
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            placeholder="QRコードの内容を貼り付け"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            送信
          </button>
        </div>
      )}
    </div>
  );
}
