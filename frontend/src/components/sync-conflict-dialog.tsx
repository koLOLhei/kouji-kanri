"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ConflictVersion {
  label: string; // "ローカル" or "サーバー"
  data: Record<string, unknown>;
  updated_at?: string;
}

export interface SyncConflict {
  entity_type: string;
  entity_id: string;
  local: ConflictVersion;
  server: ConflictVersion;
}

interface SyncConflictDialogProps {
  conflicts: SyncConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onClose: () => void;
}

export interface ConflictResolution {
  entity_type: string;
  entity_id: string;
  resolution: "local" | "server" | "merge";
  merge_fields?: Record<string, string>; // field -> "local" | "server" | merged_text
}

const SKIP_FIELDS = new Set(["id", "tenant_id", "created_at"]);

function getChangedFields(
  local: Record<string, unknown>,
  server: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
  return [...allKeys].filter(
    (k) =>
      !SKIP_FIELDS.has(k) &&
      JSON.stringify(local[k]) !== JSON.stringify(server[k])
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "（なし）";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

function formatTs(ts?: string): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ja-JP");
  } catch {
    return ts;
  }
}

export function SyncConflictDialog({
  conflicts,
  onResolve,
  onClose,
}: SyncConflictDialogProps) {
  const [index, setIndex] = useState(0);
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  // Per-field merge choices: fieldKey → "local" | "server" | string
  const [fieldChoices, setFieldChoices] = useState<Record<string, Record<string, string>>>({});

  const conflict = conflicts[index];
  if (!conflict) return null;

  const changedFields = getChangedFields(conflict.local.data, conflict.server.data);
  const conflictKey = `${conflict.entity_type}:${conflict.entity_id}`;

  function setFieldChoice(field: string, choice: string) {
    setFieldChoices((prev) => ({
      ...prev,
      [conflictKey]: {
        ...(prev[conflictKey] || {}),
        [field]: choice,
      },
    }));
  }

  function getFieldChoice(field: string): string {
    return fieldChoices[conflictKey]?.[field] ?? "server";
  }

  function saveResolution(resolution: "local" | "server" | "merge") {
    const rec: ConflictResolution = {
      entity_type: conflict.entity_type,
      entity_id: conflict.entity_id,
      resolution,
    };
    if (resolution === "merge") {
      const choices = fieldChoices[conflictKey] || {};
      // Default unset fields to "server"
      const mergeFields: Record<string, string> = {};
      changedFields.forEach((f) => {
        mergeFields[f] = choices[f] ?? "server";
      });
      rec.merge_fields = mergeFields;
    }
    const updated = [...resolutions.filter((r) => r.entity_id !== conflict.entity_id), rec];
    setResolutions(updated);

    if (index < conflicts.length - 1) {
      setIndex(index + 1);
    } else {
      onResolve(updated);
    }
  }

  const isLast = index === conflicts.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">同期の競合を解決</h2>
            <p className="text-xs text-gray-500">
              {index + 1} / {conflicts.length} — {conflict.entity_type} #{conflict.entity_id.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="text-xs font-bold text-blue-700 mb-1">ローカル版</div>
              <div className="text-xs text-gray-500">{formatTs(conflict.local.updated_at)}</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="text-xs font-bold text-orange-700 mb-1">サーバー版</div>
              <div className="text-xs text-gray-500">{formatTs(conflict.server.updated_at)}</div>
            </div>
          </div>

          {/* Changed fields */}
          {changedFields.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-600">変更されているフィールド</p>
              {changedFields.map((field) => {
                const localVal = formatValue(conflict.local.data[field]);
                const serverVal = formatValue(conflict.server.data[field]);
                const choice = getFieldChoice(field);
                return (
                  <div key={field} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2">
                      <span className="text-xs font-bold text-gray-700">{field}</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <button
                        type="button"
                        onClick={() => setFieldChoice(field, "local")}
                        className={cn(
                          "p-3 text-left transition-colors",
                          choice === "local"
                            ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <div className="text-[10px] font-bold text-blue-600 mb-1">ローカル {choice === "local" ? "✓" : ""}</div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-sans">{localVal}</pre>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFieldChoice(field, "server")}
                        className={cn(
                          "p-3 text-left transition-colors",
                          choice === "server"
                            ? "bg-orange-50 ring-2 ring-inset ring-orange-400"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <div className="text-[10px] font-bold text-orange-600 mb-1">サーバー {choice === "server" ? "✓" : ""}</div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-sans">{serverVal}</pre>
                      </button>
                    </div>
                    {/* Merge option for text fields */}
                    {typeof conflict.local.data[field] === "string" &&
                      typeof conflict.server.data[field] === "string" && (
                        <div className="border-t border-gray-100 p-3 bg-green-50">
                          <div className="text-[10px] font-bold text-green-700 mb-1">マージ（結合）</div>
                          <textarea
                            rows={2}
                            value={
                              typeof choice !== "string" || choice === "local" || choice === "server"
                                ? `${conflict.local.data[field] as string}\n---\n${conflict.server.data[field] as string}`
                                : choice
                            }
                            onChange={(e) => setFieldChoice(field, e.target.value)}
                            onFocus={() => {
                              if (choice === "local" || choice === "server") {
                                setFieldChoice(
                                  field,
                                  `${conflict.local.data[field] as string}\n---\n${conflict.server.data[field] as string}`
                                );
                              }
                            }}
                            className="w-full border border-green-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const merged =
                                typeof choice === "string" && choice !== "local" && choice !== "server"
                                  ? choice
                                  : `${conflict.local.data[field] as string}\n---\n${conflict.server.data[field] as string}`;
                              setFieldChoice(field, merged);
                            }}
                            className="mt-1 text-[10px] text-green-700 underline"
                          >
                            このマージを選択
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">変更フィールドなし（タイムスタンプのみの差異）</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              type="button"
              onClick={() => saveResolution("local")}
              className="py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              ローカルを採用
            </button>
            <button
              type="button"
              onClick={() => saveResolution("merge")}
              className="py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
            >
              マージ
            </button>
            <button
              type="button"
              onClick={() => saveResolution("server")}
              className="py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              サーバーを採用
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isLast ? "これが最後の競合です" : `残り ${conflicts.length - index - 1} 件`}
          </p>
        </div>
      </div>
    </div>
  );
}
