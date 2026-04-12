"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { QRScanner } from "@/components/qr-scanner";
import { ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";

interface QRPayload {
  qr_id?: string;
  project_id?: string;
  phase_id?: string;
  location?: string;
  equipment_id?: string;
  label?: string;
  tenant_id?: string;
}

interface CheckinResult {
  attendance_id: string;
  project_id: string;
  project_name?: string;
  phase_id?: string;
  location?: string;
  equipment_id?: string;
  equipment_name?: string;
  checked_in_at: string;
  prefill: Record<string, unknown>;
}

type ScanStatus = "idle" | "processing" | "success" | "error";

export default function ScanPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastRaw, setLastRaw] = useState("");

  async function handleScan({ rawValue }: { rawValue: string }) {
    setLastRaw(rawValue);
    setStatus("processing");
    setResult(null);
    setErrorMsg("");

    // Try to parse as JSON QR payload
    let qrData: QRPayload | null = null;
    try {
      qrData = JSON.parse(rawValue) as QRPayload;
    } catch {
      // Not a JSON payload — treat as raw code
    }

    if (!qrData || !qrData.project_id) {
      setErrorMsg("このQRコードは工事管理システム用ではありません");
      setStatus("error");
      return;
    }

    try {
      const checkin = await apiFetch<CheckinResult>("/api/qr/checkin", {
        method: "POST",
        token,
        body: JSON.stringify({ qr_data: rawValue }),
      });
      setResult(checkin);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "チェックインに失敗しました");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setLastRaw("");
  }

  function navigateToProject() {
    if (result?.project_id) {
      router.push(`/projects/${result.project_id}`);
    }
  }

  function navigateToPhase() {
    if (result?.project_id && result.phase_id) {
      router.push(`/projects/${result.project_id}/phases/${result.phase_id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">QRコードスキャン</h1>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Scanner */}
        {status === "idle" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-sm text-gray-600 text-center mb-4">
              現場に設置されたQRコードをスキャンして
              <br />
              チェックインや書類記入を自動化します
            </p>
            <QRScanner
              onScan={handleScan}
              onError={(e) => { setErrorMsg(e); setStatus("error"); }}
            />
          </div>
        )}

        {/* Processing */}
        {status === "processing" && (
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center animate-spin border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-gray-600">チェックイン処理中...</p>
          </div>
        )}

        {/* Success */}
        {status === "success" && result && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">チェックイン完了</p>
                  <p className="text-xs text-gray-500">
                    {new Date(result.checked_in_at).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {result.project_name && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">案件</span>
                    <span className="font-medium text-gray-800">{result.project_name}</span>
                  </div>
                )}
                {result.location && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">場所</span>
                    <span className="font-medium text-gray-800">{result.location}</span>
                  </div>
                )}
                {result.equipment_name && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">機材</span>
                    <span className="font-medium text-gray-800">{result.equipment_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={navigateToProject}
                className="bg-white rounded-xl shadow-sm p-4 text-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-xl mb-1">🏗️</div>
                <div className="text-xs font-semibold text-gray-700">案件を開く</div>
              </button>
              {result.phase_id && (
                <button
                  onClick={navigateToPhase}
                  className="bg-white rounded-xl shadow-sm p-4 text-center hover:bg-gray-50 transition-colors"
                >
                  <div className="text-xl mb-1">📋</div>
                  <div className="text-xs font-semibold text-gray-700">工程を開く</div>
                </button>
              )}
              <button
                onClick={() =>
                  router.push(
                    `/capture?project_id=${result.project_id}${result.phase_id ? `&phase_id=${result.phase_id}` : ""}`
                  )
                }
                className="bg-white rounded-xl shadow-sm p-4 text-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-xl mb-1">📷</div>
                <div className="text-xs font-semibold text-gray-700">写真撮影</div>
              </button>
              <button
                onClick={handleReset}
                className="bg-white rounded-xl shadow-sm p-4 text-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-xl mb-1">🔄</div>
                <div className="text-xs font-semibold text-gray-700">再スキャン</div>
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-700 text-sm">スキャンエラー</p>
                <p className="text-xs text-gray-500">{errorMsg}</p>
              </div>
            </div>
            {lastRaw && (
              <div className="bg-gray-50 rounded-lg p-2 mb-3">
                <p className="text-xs text-gray-400 mb-1">読み取り内容：</p>
                <p className="text-xs font-mono text-gray-700 break-all">{lastRaw.slice(0, 200)}</p>
              </div>
            )}
            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              もう一度スキャン
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
