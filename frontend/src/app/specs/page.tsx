"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";

interface SpecChapter {
  id: string;
  chapter_number: number;
  section_number: number | null;
  title: string;
  required_documents: string[];
}

export default function SpecsPage() {
  const { token } = useAuth();
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const { data: chapters = [] } = useQuery({
    queryKey: ["spec-chapters"],
    queryFn: () => apiFetch<SpecChapter[]>("/api/specs/chapters", { token: token! }),
    enabled: !!token,
  });

  // Group by chapter
  const grouped = new Map<number, SpecChapter[]>();
  chapters.forEach((ch) => {
    const num = ch.chapter_number;
    if (!grouped.has(num)) grouped.set(num, []);
    grouped.get(num)!.push(ch);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <BookOpen className="w-6 h-6" /> 公共建築工事標準仕様書
      </h1>
      <p className="text-sm text-gray-500 mb-6">建築工事編 令和7年版 | 全23章</p>

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
                  <span className="font-medium text-gray-900">
                    {chapter?.title || `${chNum}章`}
                  </span>
                  <span className="text-xs text-gray-400">{sections.length} 節</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
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
    </div>
  );
}
