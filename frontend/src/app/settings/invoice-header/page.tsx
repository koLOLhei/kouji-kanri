"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Save, AlertCircle, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { API_BASE } from "@/lib/api-base";

// ---------- 型定義 ----------
type AccountType = "普通" | "当座" | "貯蓄" | "";

interface BankInfo {
  bank_name: string;
  branch: string;
  account_type: AccountType;
  account_number: string;
  account_holder: string;
}

interface InvoiceHeader {
  invoice_registration_number: string | null;
  company_address: string | null;
  company_phone: string | null;
  representative_name: string | null;
  bank_info: BankInfo | null;
}

interface InvoiceHeaderForm {
  invoice_registration_number: string;
  company_address: string;
  company_phone: string;
  representative_name: string;
  bank_info: BankInfo;
}

// ---------- 定数 ----------
const REGISTRATION_NUMBER_PATTERN = /^T\d{13}$/;
const EMPTY_BANK: BankInfo = {
  bank_name: "",
  branch: "",
  account_type: "",
  account_number: "",
  account_holder: "",
};
const EMPTY_FORM: InvoiceHeaderForm = {
  invoice_registration_number: "",
  company_address: "",
  company_phone: "",
  representative_name: "",
  bank_info: { ...EMPTY_BANK },
};

// ---------- ページ本体 ----------
export default function InvoiceHeaderSettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<InvoiceHeader>({
    queryKey: ["tenant", "me", "invoice-header", API_BASE],
    queryFn: () =>
      apiFetch<InvoiceHeader>("/api/tenants/me/invoice-header", { token }),
    enabled: !!token,
  });

  const [form, setForm] = useState<InvoiceHeaderForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      invoice_registration_number: data.invoice_registration_number ?? "",
      company_address: data.company_address ?? "",
      company_phone: data.company_phone ?? "",
      representative_name: data.representative_name ?? "",
      bank_info: {
        bank_name: data.bank_info?.bank_name ?? "",
        branch: data.bank_info?.branch ?? "",
        account_type: (data.bank_info?.account_type as AccountType) ?? "",
        account_number: data.bank_info?.account_number ?? "",
        account_holder: data.bank_info?.account_holder ?? "",
      },
    });
  }, [data]);

  // ---------- バリデーション ----------
  const registrationError = useMemo(() => {
    const v = form.invoice_registration_number.trim();
    if (!v) return "適格請求書発行事業者登録番号は必須です";
    if (!REGISTRATION_NUMBER_PATTERN.test(v))
      return "登録番号は T+13桁の数字で入力してください (例: T1234567890123)";
    return null;
  }, [form.invoice_registration_number]);

  const isValid = !registrationError;

  // ---------- mutation ----------
  const mutation = useMutation({
    mutationFn: (payload: InvoiceHeaderForm) =>
      apiFetch<InvoiceHeader>("/api/tenants/me/invoice-header", {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSaveSuccess(true);
      queryClient.invalidateQueries({
        queryKey: ["tenant", "me", "invoice-header", API_BASE],
      });
      window.setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveSuccess(false);
    if (!isValid) return;
    mutation.mutate(form);
  };

  // ---------- レンダリング ----------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="mb-4 text-sm">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            設定へ戻る
          </Link>
        </nav>

        {/* ページヘッダー */}
        <div className="bg-white border-b border-gray-200 rounded-t-xl px-6 py-5 flex items-center gap-3">
          <FileText className="w-6 h-6 text-gray-700" aria-hidden="true" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              適格請求書ヘッダー設定
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              請求書 PDF のヘッダーに記載する事業者情報・登録番号・振込先口座を管理します
            </p>
          </div>
        </div>

        {/* ローディング */}
        {isLoading && (
          <div
            className="bg-white border border-gray-200 rounded-b-xl px-6 py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            読み込み中...
          </div>
        )}

        {/* エラー */}
        {isError && !isLoading && (
          <div
            className="bg-white border border-gray-200 rounded-b-xl px-6 py-12 text-center"
            role="alert"
          >
            <AlertCircle
              className="w-10 h-10 text-red-600 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-gray-700 mb-4">データの取得に失敗しました</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              再試行
            </button>
          </div>
        )}

        {/* フォーム */}
        {!isLoading && !isError && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border-x border-b border-gray-200 rounded-b-xl"
            aria-label="適格請求書ヘッダー設定フォーム"
          >
            {/* 事業者情報セクション */}
            <section
              className="px-6 py-6 border-b border-gray-200"
              aria-labelledby="section-company"
            >
              <h2
                id="section-company"
                className="text-base font-semibold text-gray-900 mb-4"
              >
                事業者情報
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 登録番号 */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="invoice_registration_number"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    適格請求書発行事業者登録番号{" "}
                    <span className="text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="invoice_registration_number"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="T1234567890123"
                    value={form.invoice_registration_number}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        invoice_registration_number: e.target.value.trim(),
                      }))
                    }
                    aria-invalid={!!registrationError && submitted}
                    aria-describedby="registration-help registration-error"
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                      submitted && registrationError
                        ? "border-red-600"
                        : "border-gray-300"
                    }`}
                  />
                  <p
                    id="registration-help"
                    className="mt-1 text-xs text-gray-500"
                  >
                    「T」+ 13桁の数字 (例: T1234567890123)
                  </p>
                  {submitted && registrationError && (
                    <p
                      id="registration-error"
                      role="alert"
                      className="mt-1 text-xs text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      {registrationError}
                    </p>
                  )}
                </div>

                {/* 住所 */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="company_address"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    会社住所
                  </label>
                  <input
                    id="company_address"
                    type="text"
                    autoComplete="off"
                    placeholder="東京都千代田区..."
                    value={form.company_address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company_address: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {/* 電話 */}
                <div>
                  <label
                    htmlFor="company_phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    電話番号
                  </label>
                  <input
                    id="company_phone"
                    type="tel"
                    autoComplete="off"
                    placeholder="03-1234-5678"
                    value={form.company_phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company_phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {/* 代表者 */}
                <div>
                  <label
                    htmlFor="representative_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    代表者名
                  </label>
                  <input
                    id="representative_name"
                    type="text"
                    autoComplete="off"
                    placeholder="山田 太郎"
                    value={form.representative_name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        representative_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* 振込先口座セクション */}
            <section
              className="px-6 py-6 border-b border-gray-200"
              aria-labelledby="section-bank"
            >
              <h2
                id="section-bank"
                className="text-base font-semibold text-gray-900 mb-4"
              >
                振込先口座
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bank_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    銀行名
                  </label>
                  <input
                    id="bank_name"
                    type="text"
                    autoComplete="off"
                    placeholder="三井住友銀行"
                    value={form.bank_info.bank_name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bank_info: { ...f.bank_info, bank_name: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="branch"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    支店名
                  </label>
                  <input
                    id="branch"
                    type="text"
                    autoComplete="off"
                    placeholder="本店営業部"
                    value={form.bank_info.branch}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bank_info: { ...f.bank_info, branch: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="account_type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    口座種別
                  </label>
                  <select
                    id="account_type"
                    value={form.bank_info.account_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bank_info: {
                          ...f.bank_info,
                          account_type: e.target.value as AccountType,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                    <option value="貯蓄">貯蓄</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="account_number"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    口座番号
                  </label>
                  <input
                    id="account_number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="1234567"
                    value={form.bank_info.account_number}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bank_info: {
                          ...f.bank_info,
                          account_number: e.target.value.replace(/\D/g, ""),
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="account_holder"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    口座名義
                  </label>
                  <input
                    id="account_holder"
                    type="text"
                    autoComplete="off"
                    placeholder="カ）サンプルコウギョウ"
                    value={form.bank_info.account_holder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bank_info: {
                          ...f.bank_info,
                          account_holder: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* フッター: 送信 */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm" aria-live="polite">
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    保存しました
                  </span>
                )}
                {mutation.isError && (
                  <span
                    role="alert"
                    className="inline-flex items-center gap-1.5 text-red-600 font-medium"
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    保存に失敗しました:{" "}
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : "不明なエラー"}
                  </span>
                )}
                {!saveSuccess && !mutation.isError && submitted && !isValid && (
                  <span
                    role="alert"
                    className="inline-flex items-center gap-1.5 text-amber-600 font-medium"
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    入力内容を確認してください
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                aria-label="ヘッダー情報を保存"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {mutation.isPending ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
