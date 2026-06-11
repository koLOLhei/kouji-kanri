'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Plus, Trash2, Receipt, Wallet, Wrench, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';

type InvoiceKind = 'progress' | 'deposit' | 'additional' | 'final';

interface ProgressStatement {
  id: string;
  period_month?: string | null;
  period_label?: string | null;
  completion_rate?: number | null;
  billing_amount?: number | null;
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
}

interface InvoiceHeader {
  tenant_name?: string | null;
  invoice_registration_number?: string | null;
  postal_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_type?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
}

interface AdditionalItem {
  name: string;
  amount: number;
}

interface CreatedInvoice {
  id: string;
  invoice_number?: string;
}

const KIND_TABS: { value: InvoiceKind; label: string; description: string; icon: typeof Receipt }[] = [
  { value: 'progress', label: '出来高', description: '月次の出来高に基づく請求', icon: Receipt },
  { value: 'deposit', label: '着手金', description: '工事開始時の前払い請求', icon: Wallet },
  { value: 'additional', label: '追加工事', description: '追加工事分の請求 (新規)', icon: Wrench },
  { value: 'final', label: '完成', description: '完成時の最終請求', icon: CheckCircle2 },
];

export default function InvoiceNewWizardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [kind, setKind] = useState<InvoiceKind>('progress');

  // progress / additional state
  const [selectedStatementId, setSelectedStatementId] = useState<string>('');
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

  // deposit state
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositDueDate, setDepositDueDate] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('');

  // additional-only state
  const [additionalTitle, setAdditionalTitle] = useState<string>('');
  const [additionalDueDate, setAdditionalDueDate] = useState<string>('');

  // final state
  const [finalNote, setFinalNote] = useState<string>('');

  const headerQuery = useQuery<InvoiceHeader>({
    queryKey: ['tenant-invoice-header'],
    queryFn: () => apiFetch('/api/tenants/me/invoice-header', { token }),
  });

  const statementsQuery = useQuery<ProgressStatement[]>({
    queryKey: ['progress-statements', id],
    queryFn: () => apiFetch(`/api/projects/${id}/progress-statements`, { token }),
    enabled: kind === 'progress' || kind === 'additional',
  });

  const fromProgressMutation = useMutation<CreatedInvoice, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      apiFetch(`/api/projects/${id}/invoices/from-progress-statement`, {
        token,
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      router.push(`/projects/${id}/invoices`);
    },
  });

  const depositMutation = useMutation<CreatedInvoice, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      apiFetch(`/api/projects/${id}/invoices/deposit`, {
        token,
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      router.push(`/projects/${id}/invoices`);
    },
  });

  const additionalMutation = useMutation<CreatedInvoice, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      apiFetch(`/api/projects/${id}/invoices/additional`, {
        token,
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      router.push(`/projects/${id}/invoices`);
    },
  });

  const finalMutation = useMutation<CreatedInvoice, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      apiFetch(`/api/projects/${id}/invoices/final`, {
        token,
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      router.push(`/projects/${id}/invoices`);
    },
  });

  const additionalSubtotal = useMemo(
    () => additionalItems.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [additionalItems],
  );

  const selectedStatement = useMemo(
    () => (statementsQuery.data || []).find((s) => s.id === selectedStatementId) || null,
    [statementsQuery.data, selectedStatementId],
  );

  const progressTotal = useMemo(() => {
    const base = Number(selectedStatement?.billing_amount ?? selectedStatement?.amount ?? 0) || 0;
    return base + additionalSubtotal;
  }, [selectedStatement, additionalSubtotal]);

  const addAdditionalRow = () => setAdditionalItems((prev) => [...prev, { name: '', amount: 0 }]);
  const updateAdditional = (idx: number, key: keyof AdditionalItem, val: string | number) => {
    setAdditionalItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val } as AdditionalItem;
      return next;
    });
  };
  const removeAdditional = (idx: number) =>
    setAdditionalItems((prev) => prev.filter((_, i) => i !== idx));

  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatementId) return;
    fromProgressMutation.mutate({
      progress_statement_id: selectedStatementId,
      additional_items: additionalItems.filter((it) => it.name.trim() && it.amount > 0),
    });
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || !depositDueDate) return;
    depositMutation.mutate({
      amount: depositAmount,
      due_date: depositDueDate,
      note: depositNote || null,
    });
  };

  const handleAdditionalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalTitle.trim() || additionalSubtotal <= 0) return;
    additionalMutation.mutate({
      title: additionalTitle,
      due_date: additionalDueDate || null,
      items: additionalItems.filter((it) => it.name.trim() && it.amount > 0),
      total: additionalSubtotal,
    });
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finalMutation.mutate({ note: finalNote || null });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header / Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/projects/${id}/invoices`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
            aria-label="請求書一覧へ戻る"
          >
            <ArrowLeft size={16} />
            請求書一覧へ戻る
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gray-900 text-white flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">請求書を新規作成</h1>
              <p className="text-sm text-gray-500">種別を選択して内容を入力してください</p>
            </div>
          </div>
        </div>

        {/* Invoice header (Tenant) */}
        <section
          aria-label="適格請求書ヘッダー"
          className="bg-white border border-gray-200 rounded-lg p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">適格請求書ヘッダー</h2>
            <span className="text-xs text-gray-500">テナント情報から自動反映</span>
          </div>
          {headerQuery.isLoading && (
            <p className="text-sm text-gray-500">読み込み中...</p>
          )}
          {headerQuery.isError && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600">データの取得に失敗しました</span>
              <button
                onClick={() => headerQuery.refetch()}
                className="text-blue-600 hover:underline"
                aria-label="再試行"
              >
                再試行
              </button>
            </div>
          )}
          {headerQuery.data && (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">事業者名</dt>
                <dd className="text-gray-900 font-medium">
                  {headerQuery.data.tenant_name || '-'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">適格請求書登録番号</dt>
                <dd className="text-gray-900 font-medium">
                  {headerQuery.data.invoice_registration_number || '未登録'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">所在地</dt>
                <dd className="text-gray-900">
                  {headerQuery.data.postal_code ? `〒${headerQuery.data.postal_code} ` : ''}
                  {headerQuery.data.address || '-'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">連絡先</dt>
                <dd className="text-gray-900">
                  {headerQuery.data.phone || '-'} / {headerQuery.data.email || '-'}
                </dd>
              </div>
              <div className="flex justify-between gap-3 md:col-span-2">
                <dt className="text-gray-500">振込先</dt>
                <dd className="text-gray-900 text-right">
                  {headerQuery.data.bank_name
                    ? `${headerQuery.data.bank_name} ${headerQuery.data.bank_branch || ''} ${headerQuery.data.bank_account_type || ''} ${headerQuery.data.bank_account_number || ''} ${headerQuery.data.bank_account_holder || ''}`
                    : '未設定'}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="請求種別"
          className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6"
        >
          {KIND_TABS.map((t) => {
            const active = kind === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                role="tab"
                aria-selected={active}
                onClick={() => setKind(t.value)}
                className={`text-left p-3 rounded-md border transition ${
                  active
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="font-semibold text-sm">{t.label}</span>
                </div>
                <p
                  className={`mt-1 text-xs ${active ? 'text-gray-200' : 'text-gray-500'}`}
                >
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <section
          aria-label={`${KIND_TABS.find((t) => t.value === kind)?.label} 入力`}
          className="bg-white border border-gray-200 rounded-lg p-5"
        >
          {kind === 'progress' && (
            <form onSubmit={handleProgressSubmit} className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  月次出来高調書の選択
                </h3>
                {statementsQuery.isLoading && (
                  <p className="text-sm text-gray-500">読み込み中...</p>
                )}
                {statementsQuery.isError && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">データの取得に失敗しました</span>
                    <button
                      type="button"
                      onClick={() => statementsQuery.refetch()}
                      className="text-blue-600 hover:underline"
                      aria-label="再試行"
                    >
                      再試行
                    </button>
                  </div>
                )}
                {statementsQuery.data && statementsQuery.data.length === 0 && (
                  <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">
                      まだ出来高調書がありません
                    </p>
                    <Link
                      href={`/projects/${id}/progress-statements`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700"
                    >
                      <Plus size={14} />
                      出来高調書を作成
                    </Link>
                  </div>
                )}
                {statementsQuery.data && statementsQuery.data.length > 0 && (
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-3 py-2 text-left w-10"></th>
                          <th className="px-3 py-2 text-left">対象月</th>
                          <th className="px-3 py-2 text-right">出来高率</th>
                          <th className="px-3 py-2 text-right">請求金額</th>
                          <th className="px-3 py-2 text-left">状態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {statementsQuery.data.map((s) => {
                          const checked = selectedStatementId === s.id;
                          return (
                            <tr
                              key={s.id}
                              className={checked ? 'bg-gray-50' : 'hover:bg-gray-50'}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="radio"
                                  name="statement"
                                  value={s.id}
                                  checked={checked}
                                  onChange={() => setSelectedStatementId(s.id)}
                                  aria-label={`調書 ${s.period_label || s.period_month || s.id} を選択`}
                                />
                              </td>
                              <td className="px-3 py-2 text-gray-900 font-medium">
                                {s.period_label || s.period_month || formatDate(s.created_at)}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-700">
                                {s.completion_rate != null
                                  ? `${Math.round(s.completion_rate * 100) / 100}%`
                                  : '-'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900">
                                {formatAmount(s.billing_amount ?? s.amount)}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {s.status || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    追加工事行 (任意)
                  </h3>
                  <button
                    type="button"
                    onClick={addAdditionalRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Plus size={14} />
                    行を追加
                  </button>
                </div>
                {additionalItems.length === 0 && (
                  <p className="text-xs text-gray-500">
                    追加工事の請求行がある場合は追加してください
                  </p>
                )}
                {additionalItems.length > 0 && (
                  <div className="space-y-2">
                    {additionalItems.map((it, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="項目名"
                          value={it.name}
                          onChange={(e) => updateAdditional(i, 'name', e.target.value)}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          aria-label={`追加行 ${i + 1} 項目名`}
                        />
                        <input
                          type="number"
                          placeholder="金額"
                          value={it.amount || ''}
                          onChange={(e) =>
                            updateAdditional(i, 'amount', Number(e.target.value))
                          }
                          className="w-36 border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                          aria-label={`追加行 ${i + 1} 金額`}
                        />
                        <button
                          type="button"
                          onClick={() => removeAdditional(i)}
                          className="px-2 text-gray-500 hover:text-red-600"
                          aria-label={`追加行 ${i + 1} を削除`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  出来高: {formatAmount(selectedStatement?.billing_amount ?? selectedStatement?.amount ?? 0)}
                  {additionalSubtotal > 0 && (
                    <> + 追加: {formatAmount(additionalSubtotal)}</>
                  )}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  合計: {formatAmount(progressTotal)}
                </div>
              </div>

              {fromProgressMutation.isError && (
                <p className="text-sm text-red-600" role="alert">
                  {fromProgressMutation.error?.message || '請求書の作成に失敗しました'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Link
                  href={`/projects/${id}/invoices`}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={!selectedStatementId || fromProgressMutation.isPending}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {fromProgressMutation.isPending ? '作成中...' : '請求書を発行'}
                </button>
              </div>
            </form>
          )}

          {kind === 'deposit' && (
            <form onSubmit={handleDepositSubmit} className="space-y-4 max-w-xl">
              <div>
                <label
                  htmlFor="deposit-amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  着手金額 <span className="text-red-600">*</span>
                </label>
                <input
                  id="deposit-amount"
                  type="number"
                  min={0}
                  step={1}
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="deposit-due"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  支払期日 <span className="text-red-600">*</span>
                </label>
                <input
                  id="deposit-due"
                  type="date"
                  value={depositDueDate}
                  onChange={(e) => setDepositDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="deposit-note"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  備考
                </label>
                <textarea
                  id="deposit-note"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="着手金の根拠や条件など"
                />
              </div>

              {depositMutation.isError && (
                <p className="text-sm text-red-600" role="alert">
                  {depositMutation.error?.message || '請求書の作成に失敗しました'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Link
                  href={`/projects/${id}/invoices`}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={
                    !depositAmount || !depositDueDate || depositMutation.isPending
                  }
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {depositMutation.isPending ? '作成中...' : '着手金請求を発行'}
                </button>
              </div>
            </form>
          )}

          {kind === 'additional' && (
            <form onSubmit={handleAdditionalSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="add-title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    請求タイトル <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="add-title"
                    type="text"
                    value={additionalTitle}
                    onChange={(e) => setAdditionalTitle(e.target.value)}
                    placeholder="例: 追加工事 (○○変更分)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-due"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    支払期日
                  </label>
                  <input
                    id="add-due"
                    type="date"
                    value={additionalDueDate}
                    onChange={(e) => setAdditionalDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">追加工事明細</h3>
                  <button
                    type="button"
                    onClick={addAdditionalRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Plus size={14} />
                    行を追加
                  </button>
                </div>
                {additionalItems.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">
                      まだ明細がありません
                    </p>
                    <button
                      type="button"
                      onClick={addAdditionalRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700"
                    >
                      <Plus size={14} />
                      最初の行を追加
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {additionalItems.map((it, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="項目名"
                          value={it.name}
                          onChange={(e) => updateAdditional(i, 'name', e.target.value)}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          aria-label={`明細 ${i + 1} 項目名`}
                          required
                        />
                        <input
                          type="number"
                          placeholder="金額"
                          value={it.amount || ''}
                          onChange={(e) =>
                            updateAdditional(i, 'amount', Number(e.target.value))
                          }
                          className="w-36 border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                          aria-label={`明細 ${i + 1} 金額`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeAdditional(i)}
                          className="px-2 text-gray-500 hover:text-red-600"
                          aria-label={`明細 ${i + 1} を削除`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">追加工事合計</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatAmount(additionalSubtotal)}
                </span>
              </div>

              {additionalMutation.isError && (
                <p className="text-sm text-red-600" role="alert">
                  {additionalMutation.error?.message || '請求書の作成に失敗しました'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Link
                  href={`/projects/${id}/invoices`}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={
                    !additionalTitle.trim() ||
                    additionalSubtotal <= 0 ||
                    additionalMutation.isPending
                  }
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {additionalMutation.isPending ? '作成中...' : '追加工事請求を発行'}
                </button>
              </div>
            </form>
          )}

          {kind === 'final' && (
            <form onSubmit={handleFinalSubmit} className="space-y-4 max-w-xl">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                完成請求は工事完了時の最終請求として発行します。出来高累計および追加工事を踏まえた残額が自動算出されます。
              </div>
              <div>
                <label
                  htmlFor="final-note"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  備考
                </label>
                <textarea
                  id="final-note"
                  value={finalNote}
                  onChange={(e) => setFinalNote(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="完成検査結果や引き渡し日など"
                />
              </div>

              {finalMutation.isError && (
                <p className="text-sm text-red-600" role="alert">
                  {finalMutation.error?.message || '請求書の作成に失敗しました'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Link
                  href={`/projects/${id}/invoices`}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={finalMutation.isPending}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {finalMutation.isPending ? '作成中...' : '完成請求を発行'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
