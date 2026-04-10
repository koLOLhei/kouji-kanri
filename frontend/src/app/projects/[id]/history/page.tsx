'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, User, Truck, Package, MapPin, Lightbulb,
  Clock, Camera, ClipboardCheck, Users as UsersIcon, AlertTriangle,
  Flag, FileText, Wrench, ChevronDown, ChevronRight, Calendar,
  DollarSign, Shield, HardHat,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate, formatAmount } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectHistory {
  id: string;
  name: string;
  status: string;
  contract_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
  entities: LinkedEntityGroup;
}

interface LinkedEntityGroup {
  customers: EntityCard[];
  contacts: EntityCard[];
  subcontractors: EntityCard[];
  materials: EntityCard[];
  facilities: EntityCard[];
  lead_source: EntityCard | null;
}

interface EntityCard {
  id: string;
  name: string;
  relationship: string;
  entity_type: string;
  meta: Record<string, unknown>;
}

interface TimelineEntry {
  id: string;
  date: string;
  type: 'daily_report' | 'inspection' | 'meeting' | 'photo' | 'ncr' | 'milestone' | 'safety' | 'material';
  title: string;
  detail: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  planning: '計画中',
  active: '施工中',
  inspection: '検査中',
  completed: '完了',
};

const STATUS_COLOR: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  inspection: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
};

const ENTITY_CARD_STYLES: Record<string, { bg: string; border: string; icon: typeof Building2 }> = {
  customer: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Building2 },
  contact: { bg: 'bg-green-50', border: 'border-green-200', icon: User },
  subcontractor: { bg: 'bg-orange-50', border: 'border-orange-200', icon: Truck },
  material: { bg: 'bg-gray-50', border: 'border-gray-200', icon: Package },
  facility: { bg: 'bg-purple-50', border: 'border-purple-200', icon: MapPin },
  lead: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Lightbulb },
};

const TIMELINE_ICON: Record<string, typeof FileText> = {
  daily_report: FileText,
  inspection: ClipboardCheck,
  meeting: UsersIcon,
  photo: Camera,
  ncr: AlertTriangle,
  milestone: Flag,
  safety: Shield,
  material: Package,
};

const TIMELINE_COLOR: Record<string, string> = {
  daily_report: 'bg-sky-100 text-sky-700',
  inspection: 'bg-indigo-100 text-indigo-700',
  meeting: 'bg-green-100 text-green-700',
  photo: 'bg-pink-100 text-pink-700',
  ncr: 'bg-red-100 text-red-700',
  milestone: 'bg-amber-100 text-amber-700',
  safety: 'bg-emerald-100 text-emerald-700',
  material: 'bg-gray-100 text-gray-600',
};

const TIMELINE_LABEL: Record<string, string> = {
  daily_report: '日報',
  inspection: '検査',
  meeting: '打合せ',
  photo: '写真',
  ncr: '是正',
  milestone: 'マイルストーン',
  safety: '安全',
  material: '資材',
};

const TYPE_FILTERS = ['all', 'daily_report', 'inspection', 'meeting', 'photo', 'ncr', 'milestone', 'safety', 'material'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectHistoryPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  /* ---- Queries ---- */

  const { data: project } = useQuery<ProjectHistory>({
    queryKey: ['project-history', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/history/full`),
  });

  const { data: timeline = [] } = useQuery<TimelineEntry[]>({
    queryKey: ['project-timeline', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/history/timeline`),
  });

  /* ---- Derived ---- */

  const filteredTimeline = typeFilter === 'all'
    ? timeline
    : timeline.filter((t) => t.type === typeFilter);

  /* Group timeline by date */
  const groupedTimeline = filteredTimeline.reduce(
    (acc, entry) => {
      const date = entry.date.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, TimelineEntry[]>,
  );

  const sortedDates = Object.keys(groupedTimeline).sort((a, b) => b.localeCompare(a));

  /* ---- Render helpers ---- */

  function renderEntityCard(entity: EntityCard, type: string) {
    const style = ENTITY_CARD_STYLES[type] || ENTITY_CARD_STYLES.material;
    const Icon = style.icon;
    const isClickable = type === 'customer' || type === 'facility' || type === 'subcontractor';
    const href =
      type === 'customer' ? `/crm/customers/${entity.id}` :
      type === 'facility' ? `/facilities/${entity.id}` :
      type === 'subcontractor' ? `/subcontractors/${entity.id}` :
      null;

    const card = (
      <div
        className={`border rounded-lg p-3 ${style.bg} ${style.border} ${isClickable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className={`text-sm font-medium ${isClickable ? 'text-sky-700 hover:underline' : 'text-gray-900'}`}>
            {entity.name}
          </span>
        </div>
        <p className="text-xs text-gray-500">{entity.relationship}</p>
        {type === 'contact' && entity.meta && (
          <div className="mt-1 text-xs text-gray-400">
            {(entity.meta as Record<string, string>)?.department && <span>{String((entity.meta as Record<string, string>)?.department)}</span>}
            {(entity.meta as Record<string, string>)?.position && <span> / {String((entity.meta as Record<string, string>)?.position)}</span>}
            {(entity.meta as Record<string, string>)?.phone && <span className="block">{String((entity.meta as Record<string, string>)?.phone)}</span>}
          </div>
        )}
      </div>
    );

    if (href) {
      return <Link key={entity.id} href={href}>{card}</Link>;
    }
    return <div key={entity.id}>{card}</div>;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  const entities = project.entities;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> 案件詳細
        </Link>

        {/* ============================================================ */}
        {/*  Project Header                                               */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[project.status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[project.status] || project.status}
                </span>
                {project.client_name && (
                  <span className="text-sm text-gray-500">発注者: {project.client_name}</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                {project.start_date && <span>開始: {formatDate(project.start_date)}</span>}
                {project.end_date && <span>完了: {formatDate(project.end_date)}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">契約金額</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(project.contract_amount ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Entity Map                                                   */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-gray-400" />
            関連エンティティ
          </h2>

          <div className="space-y-4">
            {/* Customers */}
            {entities.customers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">顧客</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entities.customers.map((e) => renderEntityCard(e, 'customer'))}
                </div>
              </div>
            )}

            {/* Contacts */}
            {entities.contacts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">担当者</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entities.contacts.map((e) => renderEntityCard(e, 'contact'))}
                </div>
              </div>
            )}

            {/* Subcontractors */}
            {entities.subcontractors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">下請業者</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entities.subcontractors.map((e) => renderEntityCard(e, 'subcontractor'))}
                </div>
              </div>
            )}

            {/* Materials */}
            {entities.materials.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">材料</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entities.materials.map((e) => renderEntityCard(e, 'material'))}
                </div>
              </div>
            )}

            {/* Facilities */}
            {entities.facilities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">施設</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entities.facilities.map((e) => renderEntityCard(e, 'facility'))}
                </div>
              </div>
            )}

            {/* Lead Source */}
            {entities.lead_source && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">リード元</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {renderEntityCard(entities.lead_source, 'lead')}
                </div>
              </div>
            )}

            {/* Empty state */}
            {entities.customers.length === 0 &&
             entities.contacts.length === 0 &&
             entities.subcontractors.length === 0 &&
             entities.materials.length === 0 &&
             entities.facilities.length === 0 &&
             !entities.lead_source && (
              <p className="text-sm text-gray-400 text-center py-4">関連エンティティはありません</p>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Timeline                                                     */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              全履歴タイムライン
            </h2>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-1 mb-4">
            {TYPE_FILTERS.map((tf) => (
              <button
                key={tf}
                onClick={() => setTypeFilter(tf)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === tf
                    ? 'bg-sky-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tf === 'all' ? '全て' : TIMELINE_LABEL[tf] || tf}
              </button>
            ))}
          </div>

          {/* Timeline entries grouped by date */}
          {sortedDates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">履歴はありません</p>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const entries = groupedTimeline[date];
                return (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-700">{formatDate(date)}</h3>
                      <span className="text-xs text-gray-400">{entries.length}件</span>
                    </div>
                    <div className="relative ml-2">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                      <div className="space-y-3">
                        {entries.map((entry) => {
                          const Icon = TIMELINE_ICON[entry.type] || FileText;
                          const color = TIMELINE_COLOR[entry.type] || 'bg-gray-100 text-gray-600';
                          const label = TIMELINE_LABEL[entry.type] || entry.type;
                          return (
                            <div key={entry.id} className="flex items-start gap-3 relative">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${color}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 pb-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>{label}</span>
                                  <h4 className="text-sm font-medium text-gray-900">{entry.title}</h4>
                                </div>
                                {entry.detail && (
                                  <p className="text-xs text-gray-500 line-clamp-2">{entry.detail}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
