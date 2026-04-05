"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Plus } from "lucide-react";

interface CostSummary {
  total_budget: number;
  total_actual: number;
  variance: number;
  categories: {
    category: string;
    budget: number;
    actual: number;
  }[];
}

interface Budget {
  id: string;
  category: string;
  description: string;
  amount: number;
}

interface Actual {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
}

export default function CostsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showActualForm, setShowActualForm] = useState(false);

  const [budgetForm, setBudgetForm] = useState({ category: "", description: "", amount: "" });
  const [actualForm, setActualForm] = useState({
    category: "", description: "", amount: "",
    date: new Date().toISOString().split("T")[0], vendor: "",
  });

  const { data: summary } = useQuery<CostSummary>({
    queryKey: ["cost-summary", id],
    queryFn: () => apiFetch(`/api/projects/${id}/costs/cost-summary`, { token: token! }),
    enabled: !!token,
  });

  const { data: budgets = [] } = useQuery<Budget[]>({
    queryKey: ["budgets", id],
    queryFn: () => apiFetch(`/api/projects/${id}/costs/budgets`, { token: token! }),
    enabled: !!token,
  });

  const { data: actuals = [] } = useQuery<Actual[]>({
    queryKey: ["actuals", id],
    queryFn: () => apiFetch(`/api/projects/${id}/costs/actuals`, { token: token! }),
    enabled: !!token,
  });

  const createBudget = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/costs/budgets`, {
        token: token!, method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", id] });
      queryClient.invalidateQueries({ queryKey: ["cost-summary", id] });
      setShowBudgetForm(false);
      setBudgetForm({ category: "", description: "", amount: "" });
    },
  });

  const createActual = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/costs/actuals`, {
        token: token!, method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actuals", id] });
      queryClient.invalidateQueries({ queryKey: ["cost-summary", id] });
      setShowActualForm(false);
      setActualForm({ category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0], vendor: "" });
    },
  });

  const consumptionRate = summary && summary.total_budget > 0
    ? Math.round((summary.total_actual / summary.total_budget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6" /> 原価管理
        </h1>
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-white border rounded-lg p-6">
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">予算</p>
              <p className="text-2xl font-bold">{formatAmount(summary.total_budget)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">実績</p>
              <p className="text-2xl font-bold">{formatAmount(summary.total_actual)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">差異</p>
              <p className={`text-2xl font-bold ${summary.variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatAmount(summary.variance)}
              </p>
            </div>
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span>消化率</span>
            <span>{consumptionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${consumptionRate > 100 ? "bg-red-500" : consumptionRate > 80 ? "bg-yellow-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(consumptionRate, 100)}%` }}
            />
          </div>

          {summary.categories && summary.categories.length > 0 && (
            <div className="mt-4 space-y-2">
              {summary.categories.map(cat => {
                const rate = cat.budget > 0 ? Math.round((cat.actual / cat.budget) * 100) : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{cat.category}</span>
                      <span>{formatAmount(cat.actual)} / {formatAmount(cat.budget)} ({rate}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${rate > 100 ? "bg-red-500" : rate > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Budget Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">予算設定</h2>
          <button onClick={() => setShowBudgetForm(!showBudgetForm)}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 予算追加
          </button>
        </div>

        {showBudgetForm && (
          <form onSubmit={e => { e.preventDefault(); createBudget.mutate({ ...budgetForm, amount: Number(budgetForm.amount) }); }}
            className="bg-white border rounded-lg p-6 space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                <input type="text" value={budgetForm.category}
                  onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <input type="text" value={budgetForm.description}
                  onChange={e => setBudgetForm({ ...budgetForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">金額</label>
                <input type="number" value={budgetForm.amount}
                  onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createBudget.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createBudget.isPending ? "保存中..." : "保存"}
              </button>
              <button type="button" onClick={() => setShowBudgetForm(false)}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
            </div>
            {createBudget.isError && (
              <p className="text-red-600 text-sm">{(createBudget.error as Error).message}</p>
            )}
          </form>
        )}

        {budgets.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">カテゴリ</th>
                  <th className="text-left px-4 py-2">説明</th>
                  <th className="text-right px-4 py-2">金額</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-2">{b.category}</td>
                    <td className="px-4 py-2">{b.description}</td>
                    <td className="px-4 py-2 text-right">{formatAmount(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actuals Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">実績入力</h2>
          <button onClick={() => setShowActualForm(!showActualForm)}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 実績追加
          </button>
        </div>

        {showActualForm && (
          <form onSubmit={e => { e.preventDefault(); createActual.mutate({ ...actualForm, amount: Number(actualForm.amount) }); }}
            className="bg-white border rounded-lg p-6 space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                <input type="text" value={actualForm.category}
                  onChange={e => setActualForm({ ...actualForm, category: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <input type="text" value={actualForm.description}
                  onChange={e => setActualForm({ ...actualForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">金額</label>
                <input type="number" value={actualForm.amount}
                  onChange={e => setActualForm({ ...actualForm, amount: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" value={actualForm.date}
                  onChange={e => setActualForm({ ...actualForm, date: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">取引先</label>
                <input type="text" value={actualForm.vendor}
                  onChange={e => setActualForm({ ...actualForm, vendor: e.target.value })}
                  className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createActual.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createActual.isPending ? "保存中..." : "保存"}
              </button>
              <button type="button" onClick={() => setShowActualForm(false)}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
            </div>
            {createActual.isError && (
              <p className="text-red-600 text-sm">{(createActual.error as Error).message}</p>
            )}
          </form>
        )}

        {actuals.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">カテゴリ</th>
                  <th className="text-left px-4 py-2">説明</th>
                  <th className="text-left px-4 py-2">取引先</th>
                  <th className="text-left px-4 py-2">日付</th>
                  <th className="text-right px-4 py-2">金額</th>
                </tr>
              </thead>
              <tbody>
                {actuals.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-2">{a.category}</td>
                    <td className="px-4 py-2">{a.description}</td>
                    <td className="px-4 py-2">{a.vendor || "-"}</td>
                    <td className="px-4 py-2">{a.date}</td>
                    <td className="px-4 py-2 text-right">{formatAmount(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
