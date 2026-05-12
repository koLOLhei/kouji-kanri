"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FileText, Search, Loader2 } from "lucide-react";

interface SpecChapter {
  id: string;
  chapter_number: number;
  section_number: number | null;
  title: string;
  required_documents: string[];
}

interface SpecListItem {
  spec_code: string;
  label: string;
  page_count: number;
  ingested: boolean;
}

interface SearchResult {
  id: string;
  spec_code: string;
  spec_label: string;
  page_number: number;
  chapter: string | null;
  section: string | null;
  title: string | null;
  snippet: string;
}

export default function SpecsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"chapters" | "search">("chapters");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 350);
  const [searchSpec, setSearchSpec] = useState<string>("");
  const [selectedContent, setSelectedContent] = useState<string | null>(null);

  const { data: chapters = [] } = useQuery({
    queryKey: ["spec-chapters"],
    queryFn: () => apiFetch<SpecChapter[]>("/api/specs/chapters", { token: token! }),
    enabled: !!token && tab === "chapters",
    staleTime: 10 * 60 * 1000, // 仕様書章構成はほぼ不変 — 10分キャッシュ
  });

  const { data: specList = [] } = useQuery({
    queryKey: ["spec-list"],
    queryFn: () => apiFetch<SpecListItem[]>("/api/specs/list", { token: token! }),
    enabled: !!token && tab === "search",
    staleTime: 5 * 60 * 1000, // PDF取込み一覧は5分キャッシュ
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["spec-search", debouncedQuery, searchSpec],
    queryFn: () => {
      const params = new URLSearchParams({ q: debouncedQuery });
      if (searchSpec) params.set("spec_code", searchSpec);
      return apiFetch<SearchResult[]>(`/api/specs/search?${params}`, { token: token! });
    },
    enabled: !!token && tab === "search" && debouncedQuery.length >= 2,
    staleTime: 60 * 1000, // 検索結果1分キャッシュ
  });

  const { data: pageContent } = useQuery({
    queryKey: ["spec-content", selectedContent],
    queryFn: () =>
      apiFetch<{ body_text: string; title: string | null; page_number: number; spec_label: string }>(
        `/api/specs/content/${selectedContent}`,
        { token: token! },
      ),
    enabled: !!token && !!selectedContent,
  });

  const grouped = new Map<number, SpecChapter[]>();
  chapters.forEach((ch) => {
    const num = ch.chapter_number;
    if (!grouped.has(num)) grouped.set(num, []);
    grouped.get(num)!.push(ch);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <BookOpen className="w-6 h-6" /> 仕様書
      </h1>
      <p className="text-sm text-gray-500 mb-6">公共建築工事標準仕様書・改修工事特記仕様書・横浜市積算マニュアル</p>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab("chapters")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "chapters" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          章構成（令和7年版）
        </button>
        <button
          onClick={() => setTab("search")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "search" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          PDF全文検索
        </button>
      </div>

      {tab === "chapters" && (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([chNum, items]) => {
            const chapter = items.find((i) => i.section_number === null);
            const sections = items.filter((i) => i.section_number !== null);
            const isExpanded = expandedChapter === chNum;
            return (
              <div key={chNum} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <button
                  onClick={() => setExpandedChapter(isExpanded ? null : chNum)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">
                      {chNum}
                    </span>
                    <span className="font-medium text-gray-900">{chapter?.title || `${chNum}章`}</span>
                    <span className="text-xs text-gray-400">{sections.length} 節</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {chapter?.required_documents && chapter.required_documents.length > 0 && (
                      <div className="px-4 py-2 bg-blue-50">
                        <p className="text-xs font-medium text-blue-700 mb-1">必要書類:</p>
                        <div className="flex flex-wrap gap-1">
                          {chapter.required_documents.map((doc) => (
                            <span key={doc} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded text-xs text-gray-700 border border-blue-200">
                              <FileText className="w-3 h-3" /> {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {sections.map((sec) => (
                      <div key={sec.id} className="px-4 py-2 pl-16 text-sm text-gray-700 hover:bg-gray-50">
                        {sec.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "search" && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="キーワードを入力 (2文字以上)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded text-sm"
                />
              </div>
              <select
                value={searchSpec}
                onChange={(e) => setSearchSpec(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">全ての仕様書</option>
                {specList.filter((s) => s.ingested).map((s) => (
                  <option key={s.spec_code} value={s.spec_code}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500">
              取り込み済み: {specList.filter((s) => s.ingested).map((s) => `${s.label}(${s.page_count}p)`).join(", ") || "なし"}
            </div>
          </div>

          {searching && (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin w-4 h-4" /> 検索中...</div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedContent(r.id)}
                  className="w-full text-left bg-white rounded-lg shadow border p-4 hover:border-blue-400 transition"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-blue-600 font-medium">{r.spec_label}</span>
                    <span className="text-xs text-gray-500">P.{r.page_number}</span>
                  </div>
                  {r.title && <div className="font-medium text-sm text-gray-900 mb-1">{r.title}</div>}
                  <div className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{r.snippet}</div>
                </button>
              ))}
            </div>
          )}

          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-sm text-gray-500 p-4">該当する結果がありません</div>
          )}

          {searchQuery.length < 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
              キーワードを2文字以上入力してください
            </div>
          )}
        </div>
      )}

      {selectedContent && pageContent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b flex justify-between items-center p-4">
              <div>
                <h2 className="text-lg font-bold">{pageContent.title || "本文"}</h2>
                <p className="text-xs text-gray-500">{pageContent.spec_label} P.{pageContent.page_number}</p>
              </div>
              <button onClick={() => setSelectedContent(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">{pageContent.body_text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
