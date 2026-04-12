"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SignatureResult {
  signer_name: string;
  signer_role: string;
  signature_data: string; // base64 PNG data URL
  mode: "freehand" | "hanko";
}

interface SignaturePadProps {
  onSubmit: (result: SignatureResult) => void;
  onCancel?: () => void;
  defaultRole?: string;
  className?: string;
}

const ROLE_OPTIONS = [
  { value: "worker", label: "作業員" },
  { value: "site_manager", label: "現場監督" },
  { value: "inspector", label: "検査員" },
  { value: "client", label: "発注者" },
];

export function SignaturePad({
  onSubmit,
  onCancel,
  defaultRole = "worker",
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"freehand" | "hanko">("freehand");
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState(defaultRole);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // ---- Canvas setup ----
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas, mode]);

  // ---- Freehand helpers ----
  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (mode !== "freehand") return;
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing || mode !== "freehand") return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPos.current = pos;
    setHasDrawn(true);
  }

  function endDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  }

  // ---- Hanko rendering ----
  function renderHanko() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.38;
    const name = signerName || "氏名";

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#cc2222";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = "#cc2222";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Vertical text (up to 4 chars)
    const chars = name.slice(0, 4).split("");
    const fontSize = Math.floor(r * 0.55);
    ctx.fillStyle = "#cc2222";
    ctx.font = `bold ${fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (chars.length === 1) {
      ctx.fillText(chars[0], cx, cy);
    } else {
      const lineH = fontSize * 1.1;
      const startY = cy - ((chars.length - 1) / 2) * lineH;
      chars.forEach((ch, i) => {
        ctx.fillText(ch, cx, startY + i * lineH);
      });
    }

    setHasDrawn(true);
  }

  useEffect(() => {
    if (mode === "hanko" && signerName) {
      renderHanko();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, signerName]);

  // ---- Submit ----
  function handleSubmit() {
    if (!signerName.trim()) {
      alert("署名者名を入力してください");
      return;
    }
    if (!hasDrawn) {
      alert(mode === "freehand" ? "署名を描いてください" : "名前を入力してください");
      return;
    }
    const canvas = canvasRef.current!;
    const data = canvas.toDataURL("image/png");
    onSubmit({
      signer_name: signerName.trim(),
      signer_role: signerRole,
      signature_data: data,
      mode,
    });
  }

  return (
    <div className={cn("bg-white rounded-2xl shadow-lg p-4 max-w-md w-full", className)}>
      <h3 className="text-base font-bold text-gray-800 mb-3">
        {mode === "freehand" ? "電子署名" : "印鑑"}
      </h3>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode("freehand")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors",
            mode === "freehand"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          サイン
        </button>
        <button
          type="button"
          onClick={() => setMode("hanko")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors",
            mode === "hanko"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          印鑑
        </button>
      </div>

      {/* Name input */}
      <div className="mb-2">
        <label className="text-xs text-gray-500 mb-1 block">署名者名</label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="氏名を入力"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Role selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">役職・立場</label>
        <select
          value={signerRole}
          onChange={(e) => setSignerRole(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Canvas */}
      <div
        className={cn(
          "border-2 rounded-xl overflow-hidden mb-3 touch-none",
          mode === "freehand" ? "border-gray-300" : "border-red-200 bg-gray-50"
        )}
        style={{ height: 160 }}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full h-full"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ cursor: mode === "freehand" ? "crosshair" : "default", display: "block" }}
        />
      </div>

      {mode === "freehand" && (
        <p className="text-xs text-gray-400 text-center mb-3">
          上のエリアにサインを描いてください
        </p>
      )}
      {mode === "hanko" && (
        <p className="text-xs text-gray-400 text-center mb-3">
          名前を入力すると印鑑が生成されます
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={initCanvas}
          className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          クリア
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          署名する
        </button>
      </div>
    </div>
  );
}
