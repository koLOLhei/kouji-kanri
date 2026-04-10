'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Phone, Mail, User, Star, ChevronDown, ChevronRight,
  Plus, X, PhoneCall, MailIcon, Users as UsersIcon, MapPin,
  Calendar, Clock, FileText, MessageSquare, Link2, Briefcase,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate, formatAmount } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomerDetail {
  id: string;
  company_name: string;
  company_type: '官公庁' | '民間' | '管理会社';
  industry: string | null;
  address: string | null;
  rank: 'S' | 'A' | 'B' | 'C';
  status: 'active' | 'prospect' | 'dormant';
  total_contract_amount: number;
  contacts: Contact[];
}

interface Contact {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_decision_maker: boolean;
}

interface Interaction {
  id: string;
  type: 'phone' | 'email' | 'meeting' | 'site_visit';
  subject: string;
  content: string;
  performed_by: string;
  next_action: string | null;
  created_at: string;
  contact_id: string | null;
}

interface LinkedEntity {
  id: string;
  entity_type: 'project' | 'facility';
  entity_id: string;
  entity_name: string;
  relationship: string;
  meta: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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

const STATUS_LABEL: Record<string, string> = {
  active: 'アクティブ',
  prospect: '見込み',
  dormant: '休眠',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  dormant: 'bg-gray-100 text-gray-500',
};

const INTERACTION_TYPES = [
  { value: 'phone', label: '電話', icon: PhoneCall },
  { value: 'email', label: 'メール', icon: MailIcon },
  { value: 'meeting', label: '打合せ', icon: UsersIcon },
  { value: 'site_visit', label: '現場訪問', icon: MapPin },
] as const;

const INTERACTION_ICON: Record<string, typeof PhoneCall> = {
  phone: PhoneCall,
  email: MailIcon,
  meeting: UsersIcon,
  site_visit: MapPin,
};

const INTERACTION_COLOR: Record<string, string> = {
  phone: 'bg-sky-100 text-sky-700',
  email: 'bg-indigo-100 text-indigo-700',
  meeting: 'bg-green-100 text-green-700',
  site_visit: 'bg-orange-100 text-orange-700',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CustomerDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const customerId = params.id as string;
  const queryClient = useQueryClient();

  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const [interactionForm, setInteractionForm] = useState({
    type: 'phone' as string,
    subject: '',
    content: '',
    next_action: '',
    contact_id: '',
  });

  const [linkForm, setLinkForm] = useState({
    entity_type: 'project' as string,
    entity_id: '',
    relationship: '',
  });

  /* ---- Queries ---- */

  const { data: customer } = useQuery<CustomerDetail>({
    queryKey: ['crm-customer', customerId],
    queryFn: () => apiFetch(`/api/crm/customers/${customerId}`),
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ['crm-interactions', customerId],
    queryFn: () => apiFetch(`/api/crm/interactions?customer_id=${customerId}`),
  });

  const { data: links = [] } = useQuery<LinkedEntity[]>({
    queryKey: ['crm-links', customerId],
    queryFn: () => apiFetch(`/api/links?entity_type=customer&entity_id=${customerId}`),
  });

  /* ---- Mutations ---- */

  const createInteraction = useMutation({
    mutationFn: (data: typeof interactionForm) =>
      apiFetch('/api/crm/interactions', {
        method: 'POST',
        body: JSON.stringify({ ...data, customer_id: customerId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-interactions', customerId] });
      setShowInteractionForm(false);
      setInteractionForm({ type: 'phone', subject: '', content: '', next_action: '', contact_id: '' });
    },
  });

  const createLink = useMutation({
    mutationFn: (data: typeof linkForm) =>
      apiFetch('/api/links', {
        method: 'POST',
        body: JSON.stringify({
          source_type: 'customer',
          source_id: customerId,
          target_type: data.entity_type,
          target_id: data.entity_id,
          relationship: data.relationship,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-links', customerId] });
      setShowLinkForm(false);
      setLinkForm({ entity_type: 'project', entity_id: '', relationship: '' });
    },
  });

  /* ---- Derived ---- */

  const linkedProjects = links.filter((l) => l.entity_type === 'project');
  const linkedFacilities = links.filter((l) => l.entity_type === 'facility');

  const contactInteractions = (contactId: string) =>
    interactions.filter((i) => i.contact_id === contactId);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <Link href="/crm" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> CRM
        </Link>

        {/* ============================================================ */}
        {/*  Customer Header                                              */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{customer.company_name}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[customer.company_type] || ''}`}>
                  {customer.company_type}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${RANK_BADGE[customer.rank] || ''}`}>
                  ランク {customer.rank}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[customer.status] || ''}`}>
                  {STATUS_LABEL[customer.status] || customer.status}
                </span>
              </div>
              {customer.industry && <p className="text-sm text-gray-500 mb-1">業種: {customer.industry}</p>}
              {customer.address && <p className="text-sm text-gray-500 mb-1">住所: {customer.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">累計契約額</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(customer.total_contract_amount)}</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Contacts                                                     */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            担当者
          </h2>
          {customer.contacts.length === 0 ? (
            <p className="text-sm text-gray-400">担当者が登録されていません</p>
          ) : (
            <div className="space-y-2">
              {customer.contacts.map((contact) => {
                const isExpanded = expandedContact === contact.id;
                const cInteractions = contactInteractions(contact.id);
                return (
                  <div key={contact.id} className="border rounded-lg">
                    <button
                      onClick={() => setExpandedContact(isExpanded ? null : contact.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{contact.name}</span>
                          {contact.is_primary && (
                            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] rounded font-bold">主担当</span>
                          )}
                          {contact.is_decision_maker && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-bold">決裁者</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {[contact.department, contact.position].filter(Boolean).join(' / ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                        {contact.phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t px-4 py-3 bg-gray-50">
                        <p className="text-xs font-medium text-gray-500 mb-2">やりとり履歴 ({cInteractions.length}件)</p>
                        {cInteractions.length === 0 ? (
                          <p className="text-xs text-gray-400">履歴なし</p>
                        ) : (
                          <div className="space-y-2">
                            {cInteractions.map((inter) => {
                              const Icon = INTERACTION_ICON[inter.type] || MessageSquare;
                              return (
                                <div key={inter.id} className="flex items-start gap-2 text-xs">
                                  <span className={`p-1 rounded ${INTERACTION_COLOR[inter.type] || 'bg-gray-100'}`}>
                                    <Icon className="w-3 h-3" />
                                  </span>
                                  <div>
                                    <span className="text-gray-400">{formatDate(inter.created_at)}</span>
                                    <span className="mx-1 text-gray-300">|</span>
                                    <span className="font-medium text-gray-700">{inter.subject}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  Linked Projects                                              */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gray-400" />
            関連案件
          </h2>
          {linkedProjects.length === 0 ? (
            <p className="text-sm text-gray-400">関連案件はありません</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedProjects.map((lp) => (
                <Link
                  key={lp.id}
                  href={`/projects/${lp.entity_id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-sky-600">{lp.entity_name}</h3>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">{lp.relationship}</p>
                  {(() => {
                    const meta = lp.meta as Record<string, string | number | null> | null;
                    if (!meta) return null;
                    return (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {meta.status ? <span>{String(meta.status)}</span> : null}
                        {meta.contract_amount ? <span className="font-semibold text-gray-700">{formatAmount(Number(meta.contract_amount))}</span> : null}
                        {meta.start_date ? <span>{formatDate(String(meta.start_date))}</span> : null}
                        {meta.end_date ? <span>~ {formatDate(String(meta.end_date))}</span> : null}
                      </div>
                    );
                  })()}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  Linked Facilities                                            */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            関連施設
          </h2>
          {linkedFacilities.length === 0 ? (
            <p className="text-sm text-gray-400">関連施設はありません</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedFacilities.map((lf) => (
                <Link
                  key={lf.id}
                  href={`/facilities/${lf.entity_id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 group-hover:text-sky-600">{lf.entity_name}</h3>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{lf.relationship}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  Interaction Timeline                                         */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              やりとり履歴
            </h2>
            <button
              onClick={() => setShowInteractionForm(!showInteractionForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
            >
              {showInteractionForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showInteractionForm ? '閉じる' : 'やりとりを記録'}
            </button>
          </div>

          {/* Interaction Form */}
          {showInteractionForm && (
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <form
                onSubmit={(e) => { e.preventDefault(); createInteraction.mutate(interactionForm); }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
                  <select
                    value={interactionForm.type}
                    onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {INTERACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                  <select
                    value={interactionForm.contact_id}
                    onChange={(e) => setInteractionForm({ ...interactionForm, contact_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">-- 選択 --</option>
                    {customer.contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                  <input
                    type="text"
                    value={interactionForm.subject}
                    onChange={(e) => setInteractionForm({ ...interactionForm, subject: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                  <textarea
                    value={interactionForm.content}
                    onChange={(e) => setInteractionForm({ ...interactionForm, content: e.target.value })}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">次のアクション</label>
                  <input
                    type="text"
                    value={interactionForm.next_action}
                    onChange={(e) => setInteractionForm({ ...interactionForm, next_action: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="例: 見積書を送付する"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={createInteraction.isPending}
                    className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 text-sm"
                  >
                    {createInteraction.isPending ? '保存中...' : '記録する'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Timeline */}
          {interactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">やりとり履歴はありません</p>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {interactions.map((inter) => {
                  const Icon = INTERACTION_ICON[inter.type] || MessageSquare;
                  return (
                    <div key={inter.id} className="flex items-start gap-3 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${INTERACTION_COLOR[inter.type] || 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 border">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{inter.subject}</h4>
                          <span className="text-xs text-gray-400">{formatDate(inter.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{inter.content}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>実施: {inter.performed_by}</span>
                          {inter.next_action && (
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <Clock className="w-3 h-3" />
                              次: {inter.next_action}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  Add Link                                                     */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gray-400" />
              リンク管理
            </h2>
            <button
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
            >
              {showLinkForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showLinkForm ? '閉じる' : 'リンク追加'}
            </button>
          </div>

          {showLinkForm && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <form
                onSubmit={(e) => { e.preventDefault(); createLink.mutate(linkForm); }}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
                  <select
                    value={linkForm.entity_type}
                    onChange={(e) => setLinkForm({ ...linkForm, entity_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="project">案件</option>
                    <option value="facility">施設</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                  <input
                    type="text"
                    value={linkForm.entity_id}
                    onChange={(e) => setLinkForm({ ...linkForm, entity_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="エンティティID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">関係</label>
                  <input
                    type="text"
                    value={linkForm.relationship}
                    onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="例: 発注者、管理先"
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={createLink.isPending}
                    className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 text-sm"
                  >
                    {createLink.isPending ? '保存中...' : 'リンクを追加'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
