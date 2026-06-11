import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE } from "@/lib/api-base";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { API_BASE };

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { token?: string | null }
): Promise<T> {
  const { token, ...init } = options || {};
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (
    init.method &&
    ["POST", "PUT", "PATCH"].includes(init.method) &&
    !(init.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      "サーバーに接続できません。ネットワーク接続を確認するか、しばらく待ってから再試行してください。"
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || JSON.stringify(err));
  }
  return res.json();
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP");
}

export function formatAmount(n: number | null | undefined): string {
  if (n == null) return "-";
  return `¥${n.toLocaleString()}`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    planning: "計画中",
    active: "施工中",
    inspection: "検査中",
    completed: "完了",
    deleted: "削除済",
    not_started: "未着手",
    in_progress: "進行中",
    draft: "下書き",
    ready: "生成済",
    submitted: "提出済",
    accepted: "承認済",
    approved: "承認",
    rejected: "却下",
  };
  return map[status] || status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    planning: "bg-gray-100 text-gray-700",
    active: "bg-blue-50 text-blue-700",
    inspection: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    not_started: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-50 text-blue-700",
    draft: "bg-gray-100 text-gray-700",
    ready: "bg-emerald-50 text-emerald-700",
    submitted: "bg-blue-50 text-blue-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}
