'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users, UserPlus, TrendingUp, Bell, Plus, X, Building2, Tag,
  Phone, Mail, Globe, ChevronRight, ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  total_customers: number;
  leads_this_month: number;
  deals_this_month: number;
  pending_actions: number;
}

interface Customer {
  id: string;
  company_name: string;
  company_type: '官公庁' | '民間' | '管理会社';
  industry: string | null;
  address: string | null;
  rank: 'S' | 'A' | 'B' | 'C';
  status: 'active' | 'prospect' | 'dormant';
  project_count: number;
  total_contract_amount: number;
}

interface Lead {
  id: string;
  source: string;
  company_name: string;
  contact_name: string;
  estimated_amount: number;
  priority: 'A' | 'B' | 'C';
  stage: '新規' | '接触済' | '提案中' | '交渉中' | '成約' | '失注';
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
  trade_type: string;
  license_number: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = ['顧客一覧', 'リード', 'ブランド'] as const;
type Tab = (typeof TABS)[number];

const STATUS_OPTIONS = [
  { value: '', label: '全て' },
  { value: 'active', label: 'アクティブ' },
  { value: 'prospect', label: '見込み' },
  { value: 'dormant', label: '休眠' },
];

const RANK_OPTIONS = ['', 'S', 'A', 'B', 'C'] as const;

const TYPE_BADGE: Record<string, string> = {
  官公庁: 'bg-blue-100 text-blue-700',
  民間: 'bg-green-100 text-green-700',
  管理会社: 'bg-purple-100 text-purple-700',
};

const RANK_BADGE: Record<string, string> = {
  S: 'bg-amber-400 text-amber-900',
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-gray-100 text-gray-600',
};

const LEAD_STAGES = ['新規', '接触済', '提案中', '交渉中', '成約', '失注'] as const;

const LEAD_STAGE_COLORS: Record<string, { bg: string; border: string; header: string }> = {
  新規: { bg: 'bg-gray-50', border: 'border-gray-300', header: 'bg-gray-200 text-gray-700' },
  接触済: { bg: 'bg-blue-50', border: 'border-blue-300', header: 'bg-blue-200 text-blue-800' },
  提案中: { bg: 'bg-indigo-50', border: 'border-indigo-300', header: 'bg-indigo-200 text-indigo-800' },
  交渉中: { bg: 'bg-yellow-50', border: 'border-yellow-300', header: 'bg-yellow-200 text-yellow-800' },
  成約: { bg: 'bg-green-50', border: 'border-green-300', header: 'bg-green-200 text-green-800' },
  失注: { bg: 'bg-red-50', border: 'border-red-300', header: 'bg-red-200 text-red-800' },
};

const PRIORITY_BADGE: Record<string, string> = {
  A: 'bg-red-500 text-white',
  B: 'bg-orange-500 text-white',
  C: 'bg-gray-400 text-white',
};

const LEAD_SOURCES = ['紹介', 'Web', '電話', 'イベント', '飛込み', '公共入札'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CRMPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('顧客一覧');

  /* Filters */
  const [statusFilter, setStatusFilter] = useState('');
  const [rankFilter, setRankFilter] = useState('');

  /* Forms */
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);

  const [customerForm, setCustomerForm] = useState({
    company_name: '',
    company_type: '民間',
    industry: '',
    address: '',
    rank: 'B',
  });

  const [leadForm, setLeadForm] = useState({
    source: '紹介',
    company_name: '',
    contact_name: '',
    estimated_amount: 0,
    priority: 'B' as string,
  });

  const [brandForm, setBrandForm] = useState({
    name: '',
    trade_type: '',
    license_number: '',
  });

  /* ---- Queries ---- */

  const { data: dashboard } = useQuery<DashboardStats>({
    queryKey: ['crm-dashboard'],
    queryFn: () => apiFetch('/api/crm/dashboard'),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['crm-customers'],
    queryFn: () => apiFetch('/api/crm/customers'),
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['crm-leads'],
    queryFn: () => apiFetch('/api/crm/leads'),
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['crm-brands'],
    queryFn: () => apiFetch('/api/crm/brands'),
  });

  /* ---- Mutations ---- */

  const createCustomer = useMutation({
    mutationFn: (data: typeof customerForm) =>
      apiFetch('/api/crm/customers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
      setShowCustomerForm(false);
      setCustomerForm({ company_name: '', company_type: '民間', industry: '', address: '', rank: 'B' });
    },
  });

  const createLead = useMutation({
    mutationFn: (data: typeof leadForm) =>
      apiFetch('/api/crm/leads', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
      setShowLeadForm(false);
      setLeadForm({ source: '紹介', company_name: '', contact_name: '', estimated_amount: 0, priority: 'B' });
    },
  });

  const convertLead = useMutation({
    mutationFn: (leadId: string) =>
      apiFetch(`/api/crm/leads/${leadId}/convert`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
  });

  const createBrand = useMutation({
    mutationFn: (data: typeof brandForm) =>
      apiFetch('/api/crm/brands', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-brands'] });
      setShowBrandForm(false);
      setBrandForm({ name: '', trade_type: '', license_number: '' });
    },
  });

  /* ---- Filtered data ---- */

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (rankFilter && c.rank !== rankFilter) return false;
    return true;
  });

  const groupedLeads = LEAD_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<string, Lead[]>,
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-7 h-7 text-sky-600" />
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
        </div>

        {/* ---- Dashboard Stats ---- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-sky-500" />
              <div>
                <p className="text-sm text-gray-500">顧客数</p>
                <p className="text-xl font-bold">{dashboard?.total_customers ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">今月リード</p>
                <p className="text-xl font-bold text-green-600">{dashboard?.leads_this_month ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">今月成約</p>
                <p className="text-xl font-bold text-blue-600">{dashboard?.deals_this_month ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-gray-500">次アクション件数</p>
                <p className="text-xl font-bold text-amber-600">{dashboard?.pending_actions ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg border p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/*  TAB: 顧客一覧                                                   */}
        {/* ================================================================ */}
        {activeTab === '顧客一覧' && (
          <div>
            {/* Filters + Add button */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">ランク: 全て</option>
                {RANK_OPTIONS.filter(Boolean).map((r) => (
                  <option key={r} value={r}>ランク {r}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={() => setShowCustomerForm(!showCustomerForm)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
              >
                {showCustomerForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showCustomerForm ? '閉じる' : '顧客追加'}
              </button>
            </div>

            {/* Customer Add Form */}
            {showCustomerForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">顧客追加</h2>
                <form
                  onSubmit={(e) => { e.preventDefault(); createCustomer.mutate(customerForm); }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                    <input
                      type="text"
                      value={customerForm.company_name}
                      onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
                    <select
                      value={customerForm.company_type}
                      onChange={(e) => setCustomerForm({ ...customerForm, company_type: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="官公庁">官公庁</option>
                      <option value="民間">民間</option>
                      <option value="管理会社">管理会社</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
                    <input
                      type="text"
                      value={customerForm.industry}
                      onChange={(e) => setCustomerForm({ ...customerForm, industry: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                    <input
                      type="text"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ランク</label>
                    <select
                      value={customerForm.rank}
                      onChange={(e) => setCustomerForm({ ...customerForm, rank: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="S">S</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={createCustomer.isPending}
                      className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                    >
                      {createCustomer.isPending ? '保存中...' : '保存'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((c) => (
                <Link
                  key={c.id}
                  href={`/crm/customers/${c.id}`}
                  className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-sky-600">
                        {c.company_name}
                      </h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.company_type] || 'bg-gray-100 text-gray-600'}`}>
                      {c.company_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RANK_BADGE[c.rank] || 'bg-gray-100 text-gray-600'}`}>
                      {c.rank}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>案件 {c.project_count}件</span>
                    <span className="font-semibold text-gray-800">{formatAmount(c.total_contract_amount)}</span>
                  </div>
                </Link>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  該当する顧客がありません
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  TAB: リード                                                      */}
        {/* ================================================================ */}
        {activeTab === 'リード' && (
          <div>
            {/* Add button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowLeadForm(!showLeadForm)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
              >
                {showLeadForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showLeadForm ? '閉じる' : 'リード追加'}
              </button>
            </div>

            {/* Lead Add Form */}
            {showLeadForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">リード追加</h2>
                <form
                  onSubmit={(e) => { e.preventDefault(); createLead.mutate(leadForm); }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ソース</label>
                    <select
                      value={leadForm.source}
                      onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                    <input
                      type="text"
                      value={leadForm.company_name}
                      onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
                    <input
                      type="text"
                      value={leadForm.contact_name}
                      onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">見込金額 (円)</label>
                    <input
                      type="number"
                      min={0}
                      value={leadForm.estimated_amount}
                      onChange={(e) => setLeadForm({ ...leadForm, estimated_amount: Number(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                    <select
                      value={leadForm.priority}
                      onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="A">A (高)</option>
                      <option value="B">B (中)</option>
                      <option value="C">C (低)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={createLead.isPending}
                      className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                    >
                      {createLead.isPending ? '保存中...' : '保存'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {LEAD_STAGES.map((stage) => {
                const style = LEAD_STAGE_COLORS[stage];
                const items = groupedLeads[stage] || [];
                return (
                  <div key={stage} className={`rounded-xl border ${style.border} ${style.bg} min-h-[200px]`}>
                    <div className={`px-3 py-2 rounded-t-xl font-semibold text-sm ${style.header} flex items-center justify-between`}>
                      <span>{stage}</span>
                      <span className="text-xs opacity-75">{items.length}件</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {items.map((lead) => (
                        <div key={lead.id} className="bg-white rounded-lg border shadow-sm p-3">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight">{lead.company_name}</h4>
                            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${PRIORITY_BADGE[lead.priority]}`}>
                              {lead.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{lead.contact_name}</p>
                          <p className="text-sm font-bold text-gray-800 mb-1">{formatAmount(lead.estimated_amount)}</p>
                          <p className="text-xs text-gray-400 mb-2">{lead.source}</p>
                          {(stage === '提案中' || stage === '交渉中') && (
                            <button
                              onClick={() => convertLead.mutate(lead.id)}
                              disabled={convertLead.isPending}
                              className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              リード変換
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  TAB: ブランド                                                    */}
        {/* ================================================================ */}
        {activeTab === 'ブランド' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowBrandForm(!showBrandForm)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
              >
                {showBrandForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showBrandForm ? '閉じる' : 'ブランド追加'}
              </button>
            </div>

            {/* Brand Add Form */}
            {showBrandForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">ブランド追加</h2>
                <form
                  onSubmit={(e) => { e.preventDefault(); createBrand.mutate(brandForm); }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ブランド名</label>
                    <input
                      type="text"
                      value={brandForm.name}
                      onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
                    <input
                      type="text"
                      value={brandForm.trade_type}
                      onChange={(e) => setBrandForm({ ...brandForm, trade_type: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">許可番号</label>
                    <input
                      type="text"
                      value={brandForm.license_number}
                      onChange={(e) => setBrandForm({ ...brandForm, license_number: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={createBrand.isPending}
                      className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                    >
                      {createBrand.isPending ? '保存中...' : '保存'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Brand Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((b) => (
                <div key={b.id} className="bg-white rounded-xl shadow-sm border p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Tag className="w-5 h-5 text-sky-500" />
                    <h3 className="text-base font-semibold text-gray-900">{b.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{b.trade_type}</p>
                  {b.license_number && (
                    <p className="text-xs text-gray-400">許可番号: {b.license_number}</p>
                  )}
                </div>
              ))}
              {brands.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  ブランドが登録されていません
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
