"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import Link from "next/link";
import {
  Search,
  Building2,
  HardHat,
  Handshake,
  Layers,
  FileText,
  ClipboardCheck,
  AlertOctagon,
  Loader2,
  SearchX,
} from "lucide-react";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
}

const ENTITY_TYPES = [
  { value: "project", label: "案件", icon: Building2, color: "bg-blue-100 text-blue-700" },
  { value: "worker", label: "作業員", icon: HardHat, color: "bg-amber-100 text-amber-700" },
  { value: "subcontractor", label: "協力業者", icon: Handshake, color: "bg-purple-100 text-purple-700" },
  { value: "phase", label: "工程", icon: Layers, color: "bg-teal-100 text-teal-700" },
  { value: "daily_report", label: "日報", icon: FileText, color: "bg-green-100 text-green-700" },
  { value: "inspection", label: "検査", icon: ClipboardCheck, color: "bg-indigo-100 text-indigo-700" },
  { value: "corrective_action", label: "是正措置", icon: AlertOctagon, color: "bg-red-100 text-red-700" },
];

function TypeBadge({ type }: { type: string }) {
  const entity = ENTITY_TYPES.find(t => t.value === type);
  if (!entity) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{type}</span>;
  }
  const Icon = entity.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${entity.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {entity.label}
    </span>
  );
}

export default function SearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Debounce search input
  const debounce = useCallback(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const cleanup = debounce();
    return cleanup;
  }, [debounce]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const searchParams = new URLSearchParams();
  if (debouncedQuery) searchParams.set("q", debouncedQuery);
  if (selectedTypes.length > 0) searchParams.set("types", selectedTypes.join(","));

  const { data: results = [], isLoading, isFetched } = useQuery<SearchResult[]>({
    queryKey: ["search", debouncedQuery, selectedTypes.join(",")],
    queryFn: () => apiFetch(`/api/search?${searchParams.toString()}`, { token: token! }),
    enabled: !!token && debouncedQuery.length >= 1,
  });

  const showEmpty = isFetched && debouncedQuery.length >= 1 && results.length === 0;
  const showInitial = debouncedQuery.length === 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Search className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">グローバル検索</h1>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-2xl bg-white shadow-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder:text-gray-400"
          placeholder="キーワードで検索..."
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500 animate-spin" />
        )}
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        {ENTITY_TYPES.map(type => {
          const isSelected = selectedTypes.includes(type.value);
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => toggleType(type.value)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                isSelected
                  ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {showInitial && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center">
            <Search className="w-10 h-10 text-violet-400" />
          </div>
          <p className="text-gray-500 text-lg">キーワードを入力して検索</p>
          <p className="text-gray-400 text-sm mt-1">案件、作業員、協力業者、工程、日報、検査、是正措置から横断検索します</p>
        </div>
      )}

      {showEmpty && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <SearchX className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">「{debouncedQuery}」に一致する結果はありません</p>
          <p className="text-gray-400 text-sm mt-1">別のキーワードで検索するか、フィルターを変更してください</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{results.length}件の結果</p>
          {results.map(result => (
            <Link
              key={`${result.type}-${result.id}`}
              href={result.link}
              className="block bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="pt-0.5">
                  <TypeBadge type={result.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors truncate">
                    {result.title}
                  </h3>
                  {result.subtitle && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{result.subtitle}</p>
                  )}
                </div>
                <div className="text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
