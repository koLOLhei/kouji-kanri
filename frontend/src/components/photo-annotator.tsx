"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Undo2,
  Redo2,
  ArrowUpRight,
  Circle,
  Square,
  Pen,
  Type,
  Save,
  Minus,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Tool = "arrow" | "ellipse" | "rect" | "freehand" | "text";
type Color = string;

interface Point {
  x: number;
  y: number;
}

interface DrawOp {
  tool: Tool;
  color: Color;
  lineWidth: number;
  points: Point[];   // for freehand: all stroke points; for shapes: [start, end]; for text: [pos]
  text?: string;
}

interface PhotoAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLORS: Color[] = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ffffff", "#000000"];
const LINE_WIDTHS = [2, 4, 6, 10];
const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: "arrow", icon: <ArrowUpRight className="w-4 h-4" />, label: "矢印" },
  { id: "ellipse", icon: <Circle className="w-4 h-4" />, label: "楕円" },
  { id: "rect", icon: <Square className="w-4 h-4" />, label: "矩形" },
  { id: "freehand", icon: <Pen className="w-4 h-4" />, label: "フリー" },
  { id: "text", icon: <Type className="w-4 h-4" />, label: "テキスト" },
];

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawOp(ctx: CanvasRenderingContext2D, op: DrawOp) {
  ctx.save();
  ctx.strokeStyle = op.color;
  ctx.fillStyle = op.color;
  ctx.lineWidth = op.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (op.tool) {
    case "freehand": {
      if (op.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(op.points[0].x, op.points[0].y);
      for (let i = 1; i < op.points.length; i++) {
        ctx.lineTo(op.points[i].x, op.points[i].y);
      }
      ctx.stroke();
      break;
    }
    case "arrow": {
      if (op.points.length < 2) break;
      const [s, e] = [op.points[0], op.points[op.points.length - 1]];
      const angle = Math.atan2(e.y - s.y, e.x - s.x);
      const headLen = Math.max(14, op.lineWidth * 4);

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(
        e.x - headLen * Math.cos(angle - Math.PI / 6),
        e.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        e.x - headLen * Math.cos(angle + Math.PI / 6),
        e.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ellipse": {
      if (op.points.length < 2) break;
      const [s2, e2] = [op.points[0], op.points[op.points.length - 1]];
      const rx = Math.abs(e2.x - s2.x) / 2;
      const ry = Math.abs(e2.y - s2.y) / 2;
      const cx = (s2.x + e2.x) / 2;
      const cy = (s2.y + e2.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "rect": {
      if (op.points.length < 2) break;
      const [s3, e3] = [op.points[0], op.points[op.points.length - 1]];
      ctx.beginPath();
      ctx.strokeRect(s3.x, s3.y, e3.x - s3.x, e3.y - s3.y);
      break;
    }
    case "text": {
      if (!op.text || op.points.length < 1) break;
      ctx.font = `bold ${Math.max(14, op.lineWidth * 5)}px sans-serif`;
      ctx.fillText(op.text, op.points[0].x, op.points[0].y);
      break;
    }
  }
  ctx.restore();
}

function redrawAll(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  ops: DrawOp[]
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ops.forEach((op) => drawOp(ctx, op));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PhotoAnnotator({
  imageUrl,
  onSave,
  onClose,
}: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState<Color>("#ef4444");
  const [lineWidth, setLineWidth] = useState(4);

  const [history, setHistory] = useState<DrawOp[]>([]);
  const [future, setFuture] = useState<DrawOp[]>([]);
  const [current, setCurrent] = useState<DrawOp | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [pendingText, setPendingText] = useState("");
  const [textPos, setTextPos] = useState<Point | null>(null);
  const [awaitingText, setAwaitingText] = useState(false);

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      // Fit to max 800px width
      const maxW = 800;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ── Redraw on history change ─────────────────────────────────────────────────
  const redraw = useCallback((ops: DrawOp[], cur: DrawOp | null = null) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    redrawAll(ctx, img, ops);
    if (cur) drawOp(ctx, cur);
  }, []);

  useEffect(() => {
    redraw(history, current);
  }, [history, current, redraw]);

  // ── Pointer helpers ──────────────────────────────────────────────────────────
  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = canvasPoint(e);

      if (tool === "text") {
        setTextPos(pt);
        setAwaitingText(true);
        return;
      }

      setIsDrawing(true);
      setCurrent({ tool, color, lineWidth, points: [pt] });
      setFuture([]);
    },
    [tool, color, lineWidth]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !current) return;
      const pt = canvasPoint(e);
      const updated: DrawOp =
        tool === "freehand"
          ? { ...current, points: [...current.points, pt] }
          : { ...current, points: [current.points[0], pt] };
      setCurrent(updated);
    },
    [isDrawing, current, tool]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !current) return;
    setIsDrawing(false);
    if (current.points.length >= 1) {
      setHistory((h) => [...h, current]);
    }
    setCurrent(null);
  }, [isDrawing, current]);

  // ── Text submit ───────────────────────────────────────────────────────────────
  const submitText = useCallback(() => {
    if (!textPos || !pendingText.trim()) {
      setAwaitingText(false);
      setPendingText("");
      setTextPos(null);
      return;
    }
    const op: DrawOp = {
      tool: "text",
      color,
      lineWidth,
      points: [textPos],
      text: pendingText.trim(),
    };
    setHistory((h) => [...h, op]);
    setFuture([]);
    setAwaitingText(false);
    setPendingText("");
    setTextPos(null);
  }, [textPos, pendingText, color, lineWidth]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setFuture((f) => [last, ...f]);
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, next]);
      return f.slice(1);
    });
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }, [onSave]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* ── Toolbar ── */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Close */}
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-700" />

        {/* Tools */}
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`p-2 rounded-lg transition-colors ${
              tool === t.id
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-700" />

        {/* Colors */}
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              color === c
                ? "border-white scale-125"
                : "border-transparent hover:scale-110"
            }`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}

        <div className="w-px h-6 bg-gray-700" />

        {/* Line widths */}
        {LINE_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setLineWidth(w)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              lineWidth === w ? "bg-blue-600" : "hover:bg-gray-700"
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: w, height: w }}
            />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-700" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 disabled:opacity-30 transition-colors"
          aria-label="元に戻す"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 disabled:opacity-30 transition-colors"
          aria-label="やり直し"
        >
          <Redo2 className="w-5 h-5" />
        </button>

        <div className="ml-auto" />

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          style={{ cursor: tool === "text" ? "text" : "crosshair" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* ── Text input overlay ── */}
      {awaitingText && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="text-sm font-bold text-gray-800 mb-3">テキストを入力</h3>
            <input
              autoFocus
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitText();
                if (e.key === "Escape") {
                  setAwaitingText(false);
                  setPendingText("");
                  setTextPos(null);
                }
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="テキストを入力..."
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setAwaitingText(false);
                  setPendingText("");
                  setTextPos(null);
                }}
                className="flex-1 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={submitText}
                className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                挿入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
