"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";

const STEPS = [
  {
    emoji: "🏗️",
    title: "ようこそ！工事管理SaaSへ",
    description:
      "公共建築工事の案件管理から写真撮影・書類自動生成まで、現場のすべてをこのアプリで管理できます。初めての方向けに、基本的な使い方をご案内します。",
    highlight: "スマホでもPCでも使えます",
  },
  {
    emoji: "📁",
    title: "まず案件を作成しましょう",
    description:
      '「案件一覧」から新しい案件を登録します。工事名・発注者・工期・請負金額などを入力するだけで準備完了です。複数の案件を同時に管理できます。',
    highlight: "上部メニュー → 案件一覧 → ＋ボタン",
  },
  {
    emoji: "📋",
    title: "工程を登録して進捗を管理",
    description:
      "案件を作成したら、工程（作業段階）を登録します。「仕様書から自動生成」ボタンを押すと、公共建築工事標準仕様書（令和7年版）に基づいた工程ツリーが自動で作られます。",
    highlight: "手動での登録も可能です",
  },
  {
    emoji: "📷",
    title: "写真を撮って記録を残す",
    description:
      "工事の各工程で写真を撮影し、記録として保存できます。スマホから直接撮影でき、GPS位置情報・撮影日時も自動で記録されます。電子黒板機能も搭載しています。",
    highlight: "下部メニュー「写真」から素早くアクセス",
  },
  {
    emoji: "📝",
    title: "日報で作業を報告",
    description:
      "毎日の作業内容・投入人員・進捗状況を日報として記録します。記録した日報は後で書類として出力できます。音声入力にも対応しています。",
    highlight: "毎日の記録が後の書類生成に役立ちます",
  },
  {
    emoji: "📄",
    title: "書類が自動で生成されます",
    description:
      "工程・写真・日報などのデータをもとに、提出書類を自動生成できます。書類ダッシュボードから一括生成・ダウンロードが可能です。電子納品にも対応しています。",
    highlight: "書類管理 → 一括生成ボタン",
  },
];

const STORAGE_KEY = "onboarding_complete";

export function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setVisible(true);
    }
  }, []);

  function complete() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function skip() {
    complete();
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      complete();
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={skip}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="スキップ"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-5xl mb-3">{current.emoji}</div>
          <h2 className="text-xl font-bold leading-tight">{current.title}</h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">{current.description}</p>
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-blue-500 text-lg leading-none mt-0.5">💡</span>
            <span className="text-sm text-blue-800 font-medium">{current.highlight}</span>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-6 h-2 bg-blue-600"
                  : i < step
                  ? "w-2 h-2 bg-blue-300"
                  : "w-2 h-2 bg-gray-200"
              }`}
              aria-label={`ステップ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={skip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            スキップ
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                戻る
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4" />
                  はじめる
                </>
              ) : (
                <>
                  次へ
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export function to re-trigger the guide (for use in settings)
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
