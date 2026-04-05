"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  variant = "info",
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when opened
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const icon =
    variant === "danger" ? (
      <Trash2 className="w-6 h-6 text-red-600" />
    ) : variant === "warning" ? (
      <AlertTriangle className="w-6 h-6 text-amber-600" />
    ) : (
      <Info className="w-6 h-6 text-blue-600" />
    );

  const iconBg =
    variant === "danger"
      ? "bg-red-100"
      : variant === "warning"
      ? "bg-amber-100"
      : "bg-blue-100";

  const confirmBtnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200"
      : variant === "warning"
      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200"
      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-gray-900 leading-tight"
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed pl-16">{description}</p>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
