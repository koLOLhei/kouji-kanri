"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, GripHorizontal, Eye, EyeOff } from "lucide-react";

export interface BlackboardData {
  projectName: string;    // 工事名
  workType: string;       // 工種
  captureDate: string;    // 撮影日
  measurement: string;    // 測定値
  photographer: string;   // 撮影者
}

interface Position {
  x: number;
  y: number;
}

interface ElectronicBlackboardProps {
  data: BlackboardData;
  onChange: (data: BlackboardData) => void;
  visible: boolean;
  onToggle: () => void;
  /** Called with the composited canvas data URL (PNG) */
  onComposite?: (dataUrl: string) => void;
  /** The source image to composite onto */
  sourceImageUrl?: string;
}

// ── Canvas drawing helper ────────────────────────────────────────────────────

export function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  data: BlackboardData
) {
  const lineHeight = 26;
  const padding = 12;
  const rows = 5;
  const height = rows * lineHeight + padding * 2;

  // Semi-transparent dark background
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();

  // Border
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.stroke();

  // Header bar
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(x + 2, y + 2, width - 4, 20);

  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("電子黒板", x + width / 2, y + 15);

  // Rows
  const fields: { label: string; value: string }[] = [
    { label: "工事名", value: data.projectName },
    { label: "工種", value: data.workType },
    { label: "撮影日", value: data.captureDate },
    { label: "測定値", value: data.measurement },
    { label: "撮影者", value: data.photographer },
  ];

  ctx.textAlign = "left";
  fields.forEach((field, i) => {
    const rowY = y + 22 + padding + i * lineHeight;

    // Separator line
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,215,0,0.25)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, rowY - 4);
      ctx.lineTo(x + width - 4, rowY - 4);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(field.label, x + padding, rowY + 10);

    // Value
    ctx.fillStyle = "#ffffff";
    ctx.font = "11px sans-serif";
    // Truncate long values
    let val = field.value || "—";
    const maxWidth = width - padding * 2 - 44;
    while (ctx.measureText(val).width > maxWidth && val.length > 1) {
      val = val.slice(0, -1);
    }
    ctx.fillText(val, x + padding + 44, rowY + 10);
  });

  ctx.restore();
}

// ── Composite helper ─────────────────────────────────────────────────────────

export function compositeBlackboardOntoImage(
  imageUrl: string,
  data: BlackboardData,
  position: Position
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));

      ctx.drawImage(img, 0, 0);

      const bbWidth = Math.min(320, img.naturalWidth * 0.4);
      drawBlackboard(ctx, position.x, position.y, bbWidth, data);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ElectronicBlackboard({
  data,
  onChange,
  visible,
  onToggle,
  onComposite,
  sourceImageUrl,
}: ElectronicBlackboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState<Position>({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);

  const BB_WIDTH = 260;

  // ── Draw blackboard preview ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (visible) {
      drawBlackboard(ctx, 0, 0, BB_WIDTH, data);
    }
  }, [data, visible, BB_WIDTH]);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // ── Composite ──────────────────────────────────────────────────────────────
  const handleComposite = useCallback(async () => {
    if (!sourceImageUrl || !onComposite) return;
    try {
      const dataUrl = await compositeBlackboardOntoImage(
        sourceImageUrl,
        data,
        position
      );
      onComposite(dataUrl);
    } catch (err) {
      console.error("Composite failed", err);
    }
  }, [sourceImageUrl, data, position, onComposite]);

  const lineHeight = 26;
  const bbHeight = 5 * lineHeight + 12 * 2 + 22;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className="w-5 h-5 bg-yellow-400 rounded flex items-center justify-center text-xs font-black text-gray-900">黒</span>
          電子黒板
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            {editMode ? "プレビュー" : "編集"}
          </button>
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              visible
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {visible ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {visible ? "表示中" : "非表示"}
          </button>
        </div>
      </div>

      {/* ── Edit fields ── */}
      {editMode && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              { key: "projectName", label: "工事名" },
              { key: "workType", label: "工種" },
              { key: "captureDate", label: "撮影日" },
              { key: "measurement", label: "測定値" },
              { key: "photographer", label: "撮影者" },
            ] as { key: keyof BlackboardData; label: string }[]
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {label}
              </label>
              <input
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Canvas preview ── */}
      {visible && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <GripHorizontal className="w-3 h-3" />
            ドラッグして位置を調整
          </p>
          <div
            className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-100 select-none"
            style={{ minHeight: 120 }}
          >
            <canvas
              ref={canvasRef}
              width={BB_WIDTH}
              height={bbHeight}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            <p className="absolute bottom-2 right-2 text-[10px] text-gray-400">
              位置: ({Math.round(position.x)}, {Math.round(position.y)})
            </p>
          </div>
          {sourceImageUrl && onComposite && (
            <button
              onClick={handleComposite}
              className="mt-3 w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              写真に合成してアップロード
            </button>
          )}
        </div>
      )}
    </div>
  );
}
