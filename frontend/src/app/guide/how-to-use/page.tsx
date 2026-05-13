"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  HardHat,
  Camera,
  FileText,
  ClipboardCheck,
  Users,
  Building2,
  BarChart3,
  Bell,
  Search,
  Truck,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  Receipt,
  BookOpen,
} from "lucide-react";
import { GuideNavbar } from "../guide-components";

type Role = "admin" | "worker";

const PRODUCTION_URL = "https://kouji.soara-mu.jp";

const ADMIN_FLOW: Array<{
  icon: typeof Shield;
  title: string;
  body: string;
  bullets?: string[];
}> = [
  {
    icon: Shield,
    title: "1. ログイン",
    body: "デモアカウントで管理者画面に入れます。",
    bullets: [
      "メール: admin@demo.co.jp",
      "パスワード: admin123",
    ],
  },
  {
    icon: Building2,
    title: "2. 案件を登録",
    body: "案件管理ページから新規案件を作成。案件名・現場住所・契約金額・工期を入力すると、公共建築工事標準仕様書(令和7年版)に基づいた工程が自動生成されます。",
  },
  {
    icon: Users,
    title: "3. ユーザー・組織管理",
    body: "/admin から組織メンバー(管理者・作業員)を招待。協力業者(/subcontractors)・車両重機(/equipment)もここで登録します。",
  },
  {
    icon: FileText,
    title: "4. 書類ダッシュボード",
    body: "案件ごとの「書類ダッシュボード」から、グリーンファイル・施工計画書・見積書・KYシート・作業日報など90+種類の書類を一括生成。",
    bullets: [
      "工種を選ぶと内訳が自動入力(41工種対応)",
      "PDF出力もワンクリック",
      "提出済み/未提出が一覧で見える",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "5. 承認キュー",
    body: "作業員が提出した日報・写真・KY活動・ヒヤリハットを /approval から承認・差戻し。",
  },
  {
    icon: Camera,
    title: "6. 写真台帳の管理",
    body: "案件ごとに作業員が撮影した写真がフェーズ・工種別に整理されます。EXIF情報(撮影日時/GPS)と電子黒板情報を自動記録。検査用にPDF台帳をワンクリック出力。",
  },
  {
    icon: AlertTriangle,
    title: "7. 安全管理",
    body: "KY活動・安全パトロール・ヒヤリハット・教育記録の一元管理。ヒヤリハットが発生したら即時通知。",
  },
  {
    icon: BarChart3,
    title: "8. ダッシュボードで全体把握",
    body: "/today で本日のタスク、/health で全案件の遅延・期限切れアラート、/admin で収益・契約状況を一覧。",
  },
  {
    icon: Receipt,
    title: "9. 工事原価管理",
    body: "案件ごとに予算・実績・予測を入力。利益率の見通しがリアルタイムで分かります。",
  },
  {
    icon: BookOpen,
    title: "10. 仕様書ブラウザ",
    body: "/specs から公共建築工事標準仕様書(令和7年版)を全文検索。条文を引いて施工計画書に貼り付けられます。",
  },
  {
    icon: Search,
    title: "11. 監査ログ",
    body: "/admin/audit-logs で誰がいつ何をしたかを完全追跡。電子納品時の証跡として使えます。",
  },
];

const WORKER_FLOW: Array<{
  icon: typeof Smartphone;
  title: string;
  body: string;
  bullets?: string[];
}> = [
  {
    icon: Shield,
    title: "1. ログイン",
    body: "スマートフォンで開いて作業員アカウントでログインします。",
    bullets: [
      "メール: worker@demo.co.jp",
      "パスワード: worker123",
    ],
  },
  {
    icon: Smartphone,
    title: "2. ホームに追加 (PWA)",
    body: "Safari/Chromeの「ホームに追加」でアプリ化。次回からアプリのように1タップで起動できます。",
  },
  {
    icon: Camera,
    title: "3. 写真撮影",
    body: "/capture から工種・撮影対象を選び、その場で撮影。EXIF(撮影日時)・GPS座標が自動付与され、電子黒板も合成可能。",
    bullets: [
      "オフラインで撮ってもキューに保存",
      "電波復帰時に自動アップロード",
      "サムネイル・WebP最適化も自動",
    ],
  },
  {
    icon: FileText,
    title: "4. 作業日報",
    body: "工程ページの「日報」タブから天候・出来高・作業員・打合せ事項を記録。テンプレートに沿って入力するだけ。",
  },
  {
    icon: AlertTriangle,
    title: "5. KY活動・ヒヤリハット",
    body: "朝礼前に /projects/{案件}/safety から本日のKY活動を作成。ヒヤリハットが起きたら /safety/quick-report から3タップで報告(写真添付可)。",
  },
  {
    icon: ClipboardCheck,
    title: "6. 工程の進捗報告",
    body: "案件詳細から担当工程を選んでチェックリストを更新。書類提出済みのチェックも同じ画面でできます。",
  },
  {
    icon: CalendarDays,
    title: "7. カレンダー・マイルストーン",
    body: "/projects/{案件}/calendar で検査予定や打合せ予定を確認。Googleカレンダーへの同期にも対応(iCal出力)。",
  },
  {
    icon: Truck,
    title: "8. 資材・重機の手配",
    body: "材料発注や重機の予約状況も同じアプリ内で管理。協力業者との契約も /contracts から見られます。",
  },
  {
    icon: Bell,
    title: "9. 通知",
    body: "/notifications で承認結果・期限アラート・他メンバーからのコメントを一覧。未読バッジで取りこぼし防止。",
  },
  {
    icon: CheckCircle2,
    title: "10. オフライン対応",
    body: "電波が無い現場でも写真撮影・日報作成・KY記録が可能。アプリが自動でキュー保存し、復帰時に同期します。",
  },
];

const SHARED_FEATURES = [
  { title: "案件管理 (CRUD)", desc: "現場ごとに案件を作成・編集" },
  { title: "工程管理", desc: "仕様書から工程を自動生成" },
  { title: "写真管理", desc: "EXIF/GPS自動・電子黒板合成" },
  { title: "日報・報告書", desc: "テンプレート式で記入5分" },
  { title: "安全管理", desc: "KY・巡回・ヒヤリ・教育" },
  { title: "検査管理", desc: "予定・実績・合否を記録" },
  { title: "資材管理", desc: "発注・試験記録" },
  { title: "工事原価", desc: "予算・実績・予測" },
  { title: "図面管理", desc: "版管理付き" },
  { title: "下請契約", desc: "契約書・支払い状況" },
  { title: "是正措置 (NCR)", desc: "不適合の記録と対応" },
  { title: "カレンダー", desc: "マイルストーン・検査予定" },
  { title: "天候記録", desc: "気象庁API連携" },
  { title: "打合せ記録", desc: "議事録テンプレ" },
  { title: "出来形管理", desc: "Cp/Cpk・x̄-R管理図" },
  { title: "廃棄物管理", desc: "マニフェスト" },
  { title: "書類一括生成", desc: "90+テンプレート" },
  { title: "監査ログ", desc: "全アクション追跡" },
  { title: "グローバル検索", desc: "全データ横断" },
  { title: "CSVエクスポート", desc: "Excel連携" },
];

export default function HowToUsePage() {
  const [role, setRole] = useState<Role>("admin");
  const flow = role === "admin" ? ADMIN_FLOW : WORKER_FLOW;

  return (
    <div className="min-h-screen bg-white">
      <GuideNavbar />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-4">
            How To Use
          </p>
          <h1 className="text-3xl lg:text-5xl font-extralight tracking-wider text-[#1a1a1a]">
            システムの使い方
          </h1>
          <div className="w-16 h-px bg-[#1a1a1a] mx-auto mt-6 mb-6" />
          <p className="text-sm text-gray-500 tracking-wide max-w-2xl mx-auto leading-relaxed">
            公共建築工事の案件管理・写真管理・書類自動生成を1つに統合した施工管理SaaS。
            管理者と作業員、それぞれの使い方を解説します。
          </p>
        </div>
      </section>

      {/* Role switcher */}
      <section className="pb-8 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 border border-gray-200">
            <button
              onClick={() => setRole("admin")}
              className={`px-6 py-5 text-sm tracking-wider transition-colors ${
                role === "admin"
                  ? "bg-[#1a1a1a] text-white"
                  : "bg-white text-[#1a1a1a] hover:bg-gray-50"
              }`}
            >
              <Shield className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              管理者として使う
            </button>
            <button
              onClick={() => setRole("worker")}
              className={`px-6 py-5 text-sm tracking-wider transition-colors ${
                role === "worker"
                  ? "bg-[#1a1a1a] text-white"
                  : "bg-white text-[#1a1a1a] hover:bg-gray-50"
              }`}
            >
              <HardHat className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              作業員として使う
            </button>
          </div>
        </div>
      </section>

      {/* Quick login */}
      <section className="pb-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="bg-gray-50 border border-gray-100 p-8">
            <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3">
              Demo Account
            </p>
            <p className="text-sm text-[#1a1a1a] mb-4 tracking-wide">
              下のリンクから直接ログインしてお試しください(誰でも入れます)
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-5 text-xs">
              <div className="bg-white border border-gray-200 px-4 py-3">
                <div className="text-gray-400 mb-1">メール</div>
                <div className="font-mono text-[#1a1a1a]">
                  {role === "admin" ? "admin@demo.co.jp" : "worker@demo.co.jp"}
                </div>
              </div>
              <div className="bg-white border border-gray-200 px-4 py-3">
                <div className="text-gray-400 mb-1">パスワード</div>
                <div className="font-mono text-[#1a1a1a]">
                  {role === "admin" ? "admin123" : "worker123"}
                </div>
              </div>
            </div>
            <a
              href={`${PRODUCTION_URL}/login`}
              className="inline-flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white px-6 py-3 text-sm tracking-wider transition-colors"
            >
              ログイン画面を開く
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Step flow */}
      <section className="pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3 text-center">
            Step by Step
          </p>
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] text-center mb-12">
            {role === "admin" ? "管理者の操作手順" : "作業員の操作手順"}
          </h2>

          <div className="space-y-5">
            {flow.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="flex gap-6 border border-gray-100 hover:border-gray-300 transition-colors p-6 lg:p-8"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#1a1a1a]" strokeWidth={1.2} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium tracking-wider text-[#1a1a1a] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed tracking-wide mb-3">
                      {step.body}
                    </p>
                    {step.bullets && (
                      <ul className="space-y-1.5">
                        {step.bullets.map((b, bi) => (
                          <li
                            key={bi}
                            className="text-xs text-gray-400 leading-relaxed tracking-wide flex gap-2"
                          >
                            <span className="text-gray-300">·</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* All features */}
      <section className="pb-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-20">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3 text-center">
            All Features
          </p>
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] text-center mb-3">
            搭載機能一覧
          </h2>
          <p className="text-xs text-gray-400 text-center tracking-wide mb-12">
            管理者・作業員問わず、案件単位で使える機能
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SHARED_FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-gray-100 px-5 py-4"
              >
                <div className="text-sm tracking-wider text-[#1a1a1a] mb-1">
                  {f.title}
                </div>
                <div className="text-xs text-gray-400 leading-relaxed tracking-wide">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center pt-20">
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] mb-4">
            まずは触ってみてください
          </h2>
          <p className="text-sm text-gray-500 tracking-wide mb-8 leading-relaxed">
            ログイン情報は上記のとおりで、契約や登録は不要です。
            <br />
            データはデモ用テナント内のみで他社からは見えません。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${PRODUCTION_URL}/login`}
              className="inline-flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white px-8 py-3 text-sm tracking-wider transition-colors"
            >
              ログイン画面を開く
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/guide"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-[#1a1a1a] px-8 py-3 text-sm tracking-wider transition-colors"
            >
              ガイド一覧に戻る
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3">
            KAMO Construction Co., Ltd.
          </p>
          <p className="text-xs text-gray-400 tracking-wide">
            公共建築工事SaaS · 公共建築工事標準仕様書(令和7年版)準拠
          </p>
        </div>
      </footer>
    </div>
  );
}
