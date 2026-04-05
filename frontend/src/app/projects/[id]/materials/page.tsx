"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate, formatAmount, statusLabel, statusColor } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Plus, FlaskConical } from "lucide-react";

interface MaterialOrder {
  id: string;
  order_number: string | null;
  supplier_name: string;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  total_amount: number | null;
  items?: { name: string; quantity: number; unit: string }[];
}

interface MaterialTest {
  id: string;
  material_name: string;
  test_type: string;
  test_date: string;
  result: string;
  notes: string | null;
}

export default function MaterialsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);

  const [orderForm, setOrderForm] = useState({
    supplier_name: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery: "",
    items: [{ name: "", quantity: "", unit: "個" }],
  });

  const [testForm, setTestForm] = useState({
    material_name: "",
    test_type: "",
    test_date: new Date().toISOString().split("T")[0],
    result: "pending",
    notes: "",
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<MaterialOrder[]>({
    queryKey: ["material-orders", id],
    queryFn: () => apiFetch(`/api/projects/${id}/materials/orders`, { token: token! }),
    enabled: !!token,
  });

  const { data: tests = [], isLoading: loadingTests } = useQuery<MaterialTest[]>({
    queryKey: ["material-tests", id],
    queryFn: () => apiFetch(`/api/projects/${id}/materials/test-records`, { token: token! }),
    enabled: !!token,
  });

  const createOrder = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/materials/orders`, {
        token: token!, method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-orders", id] });
      setShowOrderForm(false);
      setOrderForm({ supplier_name: "", order_date: new Date().toISOString().split("T")[0], expected_delivery: "", items: [{ name: "", quantity: "", unit: "個" }] });
    },
  });

  const createTest = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/materials/test-records`, {
        token: token!, method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-tests", id] });
      setShowTestForm(false);
      setTestForm({ material_name: "", test_type: "", test_date: new Date().toISOString().split("T")[0], result: "pending", notes: "" });
    },
  });

  const addItem = () => {
    setOrderForm({ ...orderForm, items: [...orderForm.items, { name: "", quantity: "", unit: "個" }] });
  };

  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...orderForm.items];
    items[idx] = { ...items[idx], [field]: value };
    setOrderForm({ ...orderForm, items });
  };

  const removeItem = (idx: number) => {
    if (orderForm.items.length <= 1) return;
    setOrderForm({ ...orderForm, items: orderForm.items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> 材料管理
        </h1>
      </div>

      {/* Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">発注一覧</h2>
          <button onClick={() => setShowOrderForm(!showOrderForm)}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 発注登録
          </button>
        </div>

        {showOrderForm && (
          <form onSubmit={e => { e.preventDefault(); createOrder.mutate({
            ...orderForm,
            items: orderForm.items.map(i => ({ ...i, quantity: Number(i.quantity) })),
          }); }} className="bg-white border rounded-lg p-6 space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">仕入先</label>
                <input type="text" value={orderForm.supplier_name}
                  onChange={e => setOrderForm({ ...orderForm, supplier_name: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">発注日</label>
                <input type="date" value={orderForm.order_date}
                  onChange={e => setOrderForm({ ...orderForm, order_date: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">納品予定日</label>
                <input type="date" value={orderForm.expected_delivery}
                  onChange={e => setOrderForm({ ...orderForm, expected_delivery: e.target.value })}
                  className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">品目</label>
              {orderForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input type="text" placeholder="品名" value={item.name}
                    onChange={e => updateItem(idx, "name", e.target.value)}
                    className="flex-1 border rounded px-3 py-2" required />
                  <input type="number" placeholder="数量" value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", e.target.value)}
                    className="w-24 border rounded px-3 py-2" required />
                  <input type="text" placeholder="単位" value={item.unit}
                    onChange={e => updateItem(idx, "unit", e.target.value)}
                    className="w-20 border rounded px-3 py-2" />
                  <button type="button" onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700 px-2">×</button>
                </div>
              ))}
              <button type="button" onClick={addItem}
                className="text-sm text-blue-600 hover:text-blue-800">+ 品目追加</button>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createOrder.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createOrder.isPending ? "保存中..." : "保存"}
              </button>
              <button type="button" onClick={() => setShowOrderForm(false)}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
            </div>
            {createOrder.isError && (
              <p className="text-red-600 text-sm">{(createOrder.error as Error).message}</p>
            )}
          </form>
        )}

        {loadingOrders ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">発注記録がありません</p>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {o.order_number && <span className="text-sm font-mono text-gray-500">{o.order_number}</span>}
                    <span className="font-medium">{o.supplier_name}</span>
                    <span className="text-sm text-gray-500">{formatDate(o.order_date)}</span>
                    {o.total_amount != null && <span className="text-sm">{formatAmount(o.total_amount)}</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(o.status)}`}>
                    {statusLabel(o.status)}
                  </span>
                </div>
                {o.items && o.items.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {o.items.map((item, i) => (
                      <span key={i} className="inline-block mr-3">{item.name} x{item.quantity}{item.unit}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tests Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="w-5 h-5" /> 材料試験
          </h2>
          <button onClick={() => setShowTestForm(!showTestForm)}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 試験登録
          </button>
        </div>

        {showTestForm && (
          <form onSubmit={e => { e.preventDefault(); createTest.mutate(testForm); }}
            className="bg-white border rounded-lg p-6 space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">材料名</label>
                <input type="text" value={testForm.material_name}
                  onChange={e => setTestForm({ ...testForm, material_name: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">試験種別</label>
                <input type="text" value={testForm.test_type}
                  onChange={e => setTestForm({ ...testForm, test_type: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">試験日</label>
                <input type="date" value={testForm.test_date}
                  onChange={e => setTestForm({ ...testForm, test_date: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">結果</label>
                <select value={testForm.result}
                  onChange={e => setTestForm({ ...testForm, result: e.target.value })}
                  className="w-full border rounded px-3 py-2">
                  <option value="pending">未実施</option>
                  <option value="pass">合格</option>
                  <option value="fail">不合格</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">備考</label>
              <textarea value={testForm.notes}
                onChange={e => setTestForm({ ...testForm, notes: e.target.value })}
                className="w-full border rounded px-3 py-2 h-20" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createTest.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createTest.isPending ? "保存中..." : "保存"}
              </button>
              <button type="button" onClick={() => setShowTestForm(false)}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
            </div>
            {createTest.isError && (
              <p className="text-red-600 text-sm">{(createTest.error as Error).message}</p>
            )}
          </form>
        )}

        {loadingTests ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : tests.length === 0 ? (
          <p className="text-gray-500">試験記録がありません</p>
        ) : (
          <div className="space-y-3">
            {tests.map(t => (
              <div key={t.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{t.material_name}</span>
                  <span className="text-sm text-gray-500">{t.test_type}</span>
                  <span className="text-sm text-gray-500">{formatDate(t.test_date)}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  t.result === "pass" ? "bg-green-100 text-green-700" :
                  t.result === "fail" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {t.result === "pass" ? "合格" : t.result === "fail" ? "不合格" : "未実施"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
