"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

const GLOSSARY: Record<string, string> = {
  "KY活動": "「危険予知活動」の略。作業前にチームで危険を予測し、対策を話し合う安全活動。",
  "工程": "工事の作業段階。例：基礎工事→躯体工事→仕上げ工事",
  "出来形": "工事の完成部分の寸法や品質を測定・記録すること",
  "ヒヤリハット": "事故には至らなかったが「ヒヤリ」「ハッ」とした危険な出来事",
  "是正措置": "品質不良や安全上の問題に対する修正・改善の記録",
  "段階確認": "工事の各段階で発注者立会いの下で行う品質確認検査",
  "施工体制台帳": "工事に関わる全ての業者と責任者の一覧表（法定書類）",
  "電子納品": "工事書類を電子データとして発注者に提出すること",
  "工事写真帳": "工事の進捗を証明する写真をまとめた書類",
  "打合簿": "発注者と施工者の間の協議・指示・承諾を記録した書類",
  "配筋検査": "コンクリート打設前に鉄筋の配置を確認する検査",
  "クリティカルパス": "工事全体の工期を決める最長の工程経路",
  "日報": "その日の作業内容・人員・進捗を記録する毎日の報告書",
  "施工計画書": "工事の施工方法・手順・品質管理方法をまとめた計画書",
  "品質管理": "工事の品質が設計仕様を満たしているか確認・記録する活動",
  "安全管理": "工事中の労働災害防止のための計画・実施・確認の活動",
  "工程管理": "工事のスケジュールを計画・管理し、工期内に完成させる管理活動",
  "原価管理": "工事の費用を計画・管理し、利益を確保するための管理活動",
  "下請業者": "元請業者から工事の一部を請け負う専門工事業者",
  "監理者": "発注者の代理として設計図書通りに工事が行われているか確認する技術者",
  "施工者": "実際に工事を行う請負業者（元請）",
  "発注者": "工事を発注する主体（公共工事では国・都道府県・市町村等）",
  "仕様書": "工事の品質・材料・工法・施工方法などの技術的基準を定めた文書",
  "工事台帳": "工事に関する費用・工程・品質管理などを記録する帳簿",
  "完成検査": "工事完成後に発注者が行う最終的な品質確認検査",
  "中間検査": "工事の途中段階で行われる品質確認検査",
  "施工図": "設計図をもとに実際の施工のために詳細を書き込んだ図面",
  "竣工図": "完成した建物の実際の状態を反映した最終図面",
  "マニフェスト": "産業廃棄物の種類・数量・処理業者などを記録した廃棄物管理票",
  "NCR": "Non-Conformance Reportの略。品質不適合報告書のこと",
  "総括安全衛生管理者": "工事現場の安全衛生管理の最高責任者",
  "安全衛生協議会": "元請と下請が合同で安全衛生について協議する会議",
  "ToolBox Meeting": "作業開始前に行う短時間の安全確認ミーティング（TBM）",
};

interface HelpTooltipProps {
  term: string;
  children: React.ReactNode;
}

export function HelpTooltip({ term, children }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const definition = GLOSSARY[term];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!definition) {
    return <>{children}</>;
  }

  return (
    <span ref={containerRef} className="inline-flex items-center gap-1 relative">
      {children}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={`${term}の説明を見る`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors flex-shrink-0"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-gray-900 text-white text-xs rounded-xl shadow-xl p-3 pointer-events-none"
          style={{ pointerEvents: "none" }}
        >
          <span className="font-bold block mb-1 text-blue-300">{term}</span>
          {definition}
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// Export glossary for use elsewhere
export { GLOSSARY };
