"use client";

import Link from "next/link";
import {
  Camera, FileText, Shield, ClipboardList, BarChart2,
  CheckCircle2, Smartphone, Cloud, Lock, Users, Zap,
  ChevronRight, ArrowRight, Star, Building2, HardHat,
  Clock, TrendingUp, FolderCheck, FileCheck2, CalendarCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const HERO_STATS = [
  { value: "100%", label: "進捗の透明性を保証" },
  { value: "24h", label: "スマホでいつでも確認" },
  { value: "0", label: "工事中の不安をゼロに" },
  { value: "98%", label: "満足度の高い報告体制" },
];

const PAIN_POINTS = [
  {
    icon: Clock,
    title: "書類作成に何時間も…",
    description: "Excel・Wordを開いて、コピペして、体裁を整えて…。同じ書類を何度も作り直していませんか？",
  },
  {
    icon: Camera,
    title: "写真の整理が追いつかない",
    description: "スマホで撮った写真をPCに移して、フォルダに振り分けて、台帳に貼り付けて…。気づけば写真整理だけで1日が終わる。",
  },
  {
    icon: FileText,
    title: "提出書類の不備で差し戻し",
    description: "「この書類が足りません」「様式が違います」。役所から何度も差し戻されて、工期が圧迫される。",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "施主様専用ポータル",
    subtitle: "「見えない」不安を解消",
    description: "マンション管理組合様や戸建オーナー様に、専用の進捗確認画面を提供。今、どの工程が、どんな品質で進んでいるのか。スマホ一つでいつでも確認できます。",
    color: "from-blue-600 to-indigo-600",
    highlights: ["リアルタイム進捗共有", "写真付きデイリー報告", "検査結果の透明化", "チャットでのクイック相談"],
  },
  {
    icon: Camera,
    title: "確かな施工の証拠",
    subtitle: "隠れる部分こそ丁寧に",
    description: "壁の内部や基礎など、完成後は見えなくなる部分こそ写真を徹底記録。高品質な施工の証拠を、デジタル台帳として一生保管いただけます。",
    color: "from-amber-500 to-orange-500",
    highlights: ["全工程のデジタル記録", "GPS・日時付きの信頼性", "美しく整理された写真集", "修繕履歴としての活用"],
  },
  {
    icon: Shield,
    title: "安全管理",
    subtitle: "3タップでヒヤリハット報告",
    description: "KY活動、安全巡回、ヒヤリハット報告、安全教育記録をまとめて管理。現場からスマホで即報告。トレンド分析で事故を未然に防止。",
    color: "from-red-500 to-rose-500",
    highlights: ["ワンタップ報告", "トレンド分析", "資格期限アラート", "入場教育チェック"],
  },
  {
    icon: BarChart2,
    title: "品質・出来形管理",
    subtitle: "管理図を自動作成",
    description: "測定値を入力するだけで、x̄-R管理図、ヒストグラム、出来形管理図が自動生成。規格値との比較もリアルタイムで確認。",
    color: "from-emerald-500 to-teal-500",
    highlights: ["x̄-R管理図", "ヒストグラム", "Cp/Cpk自動計算", "段階確認記録"],
  },
  {
    icon: CalendarCheck,
    title: "工程管理",
    subtitle: "ガントチャートで一目瞭然",
    description: "ドラッグ&ドロップで工程を管理。依存関係を設定すればクリティカルパスを自動計算。遅延リスクを事前に把握。",
    color: "from-violet-500 to-purple-500",
    highlights: ["ガントチャート", "クリティカルパス", "自動スケジュール", "マイルストーン"],
  },
  {
    icon: FolderCheck,
    title: "電子納品",
    subtitle: "CALS/EC対応パッケージ出力",
    description: "PHOTO.XML、INDEX_C.XMLを自動生成。電子納品に必要なフォルダ構造のZIPファイルをワンクリックで作成。",
    color: "from-cyan-500 to-blue-500",
    highlights: ["PHOTO.XML", "INDEX_C.XML", "ZIP一括生成", "写真管理基準準拠"],
  },
];

const MOBILE_FEATURES = [
  { icon: Camera, text: "現場で写真撮影・即アップロード" },
  { icon: ClipboardList, text: "日報をその場で入力・提出" },
  { icon: Shield, text: "ヒヤリハット即報告" },
  { icon: Cloud, text: "オフラインでも使える" },
  { icon: Zap, text: "音声入力で手がふさがっていてもOK" },
  { icon: Lock, text: "顔認証・指紋認証でログイン" },
];

const PLANS = [
  {
    name: "フリー",
    price: "¥0",
    period: "/月",
    description: "まずは無料でお試し",
    features: ["案件3つまで", "ユーザー5名まで", "写真管理", "日報管理", "書類自動生成"],
    cta: "無料で始める",
    popular: false,
    gradient: "from-gray-600 to-gray-700",
  },
  {
    name: "スタンダード",
    price: "¥29,800",
    period: "/月",
    description: "中小建設会社に最適",
    features: ["案件20つまで", "ユーザー30名まで", "全機能利用可能", "電子納品出力", "品質管理図", "優先サポート"],
    cta: "お問い合わせ",
    popular: true,
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    name: "エンタープライズ",
    price: "¥98,000",
    period: "/月",
    description: "大規模事業者向け",
    features: ["案件無制限", "ユーザー無制限", "全機能利用可能", "専用サポート", "カスタム帳票", "API連携", "SLA保証"],
    cta: "お問い合わせ",
    popular: false,
    gradient: "from-purple-600 to-violet-600",
  },
];

const TESTIMONIALS = [
  {
    quote: "書類作成の時間が1/10になりました。これまでExcelで丸一日かかっていた月次報告が、ボタン1つで完成します。",
    name: "田中 建設部長",
    company: "中堅ゼネコン（従業員200名）",
    role: "工事部長",
  },
  {
    quote: "現場の若手が自分から写真を撮るようになった。スマホで3タップだから、面倒がらない。写真台帳も勝手にできる。",
    name: "佐藤 現場所長",
    company: "地方建設会社",
    role: "現場所長",
  },
  {
    quote: "電子納品の準備に2週間かかっていたのが、半日で終わるようになりました。PHOTO.XMLの手作業がなくなったのが大きい。",
    name: "鈴木 技術主任",
    company: "設備工事会社",
    role: "主任技術者",
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Navbar() {
  const { token } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">工事管理<span className="text-blue-600">SaaS</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">機能</a>
          <a href="#mobile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">モバイル</a>
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">料金</a>
          <a href="#voices" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">導入事例</a>
        </div>
        <div className="flex items-center gap-3">
          {token ? (
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              ダッシュボードへ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors px-4 py-2.5"
              >
                ログイン
              </Link>
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
              >
                無料で始める
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const LP_JSON_LD_SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "工事管理SaaS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: "https://kouji.soara-mu.jp",
  description:
    "公共工事の施工管理を圧倒的に効率化する施工管理クラウドアプリ。写真管理、工事日報、電子納品、書類自動生成まで。",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "JPY", name: "フリープラン" },
    { "@type": "Offer", price: "29800", priceCurrency: "JPY", name: "スタンダードプラン" },
    { "@type": "Offer", price: "98000", priceCurrency: "JPY", name: "エンタープライズプラン" },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "127",
  },
};

const LP_FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "施工管理アプリは無料で使えますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。工事管理SaaSのフリープランは案件3件・ユーザー5名まで完全無料です。クレジットカード不要で30秒から利用開始できます。",
      },
    },
    {
      "@type": "Question",
      name: "電子納品（CALS/EC）に対応していますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。PHOTO.XMLおよびINDEX_C.XMLの自動生成、電子納品用ZIPファイルのワンクリック生成に対応しています。",
      },
    },
    {
      "@type": "Question",
      name: "スマートフォンで使えますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。PWA（プログレッシブウェブアプリ）対応でアプリインストール不要です。iPhoneでもAndroidでも、ブラウザからホーム画面に追加するだけで使えます。",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LP_JSON_LD_SOFTWARE) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LP_FAQ_JSON_LD) }}
      />
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50/50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <Zap className="w-4 h-4" />
              公共建築工事標準仕様書 令和7年版対応
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              工事の
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">「見えない」不安</span>
              を
              <br className="hidden sm:block" />
              ゼロにします。
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              マンション管理組合・戸建オーナー様におくる、
              <br className="hidden sm:block" />
              圧倒的な透明性と安心を約束する「見える化」施工管理。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
              >
                無料で始める
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-2xl text-lg font-bold transition-all border-2 border-gray-200 hover:border-gray-300"
              >
                機能を見る
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">{s.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pain Points ─── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              こんな<span className="text-red-500">お悩み</span>ありませんか？
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                  <p.icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-lg font-bold shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
              すべて解決できます
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              現場が変わる<span className="text-blue-600">6つの機能</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              写真管理から電子納品まで、公共工事に必要な全てをカバー
            </p>
          </div>
          <div className="space-y-8">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-8 items-center bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow`}
              >
                {/* Icon / visual side */}
                <div className="md:w-2/5 flex-shrink-0">
                  <div className={`bg-gradient-to-br ${f.color} rounded-2xl p-8 sm:p-10 flex items-center justify-center aspect-[4/3]`}>
                    <f.icon className="w-20 h-20 sm:w-24 sm:h-24 text-white/90" />
                  </div>
                </div>
                {/* Text side */}
                <div className="md:w-3/5">
                  <p className="text-sm font-bold text-blue-600 mb-1">{f.subtitle}</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">{f.title}</h3>
                  <p className="text-gray-500 leading-relaxed mb-5">{f.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {f.highlights.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mobile / PWA ─── */}
      <section id="mobile" className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <Smartphone className="w-4 h-4" />
                PWA対応
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                スマホが<br />現場の武器になる。
              </h2>
              <p className="text-blue-200 text-lg mb-8 leading-relaxed">
                アプリのインストール不要。ブラウザからホーム画面に追加するだけ。
                オフラインでも使えるので、電波の悪い現場でも安心。
              </p>
              <div className="space-y-4">
                {MOBILE_FEATURES.map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-5 h-5 text-blue-300" />
                    </div>
                    <span className="text-white/90 font-medium">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              {/* Phone mockup */}
              <div className="relative w-64 sm:w-72">
                <div className="bg-gray-800 rounded-[2.5rem] p-3 shadow-2xl border border-gray-700">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] overflow-hidden aspect-[9/16] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                      <HardHat className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-white text-xl font-bold mb-2">工事管理SaaS</p>
                    <p className="text-blue-200 text-sm mb-6">現場の書類地獄から解放</p>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 w-full">
                      <div className="flex items-center gap-3 text-left mb-3">
                        <Camera className="w-6 h-6 text-amber-300 flex-shrink-0" />
                        <span className="text-white text-sm font-medium">写真を撮影</span>
                      </div>
                      <div className="flex items-center gap-3 text-left mb-3">
                        <ClipboardList className="w-6 h-6 text-green-300 flex-shrink-0" />
                        <span className="text-white text-sm font-medium">日報を入力</span>
                      </div>
                      <div className="flex items-center gap-3 text-left">
                        <FileCheck2 className="w-6 h-6 text-purple-300 flex-shrink-0" />
                        <span className="text-white text-sm font-medium">書類が自動完成</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">シンプルな料金プラン</h2>
            <p className="text-gray-500 text-lg">まずは無料で始めて、必要に応じてアップグレード</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-3xl border-2 p-6 sm:p-8 flex flex-col ${
                  plan.popular
                    ? "border-blue-500 shadow-xl shadow-blue-500/10 scale-105"
                    : "border-gray-100 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      人気 No.1
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`w-full py-3 rounded-xl text-center font-bold text-sm transition-all ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="voices" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">導入企業の声</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <blockquote className="text-gray-700 leading-relaxed mb-6 text-sm">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            今すぐ、現場を変えませんか？
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            無料プランで全ての機能をお試しいただけます。
            クレジットカード不要、最短30秒で利用開始。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-blue-700 px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl active:scale-[0.98]"
            >
              無料で始める
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all border-2 border-white/20"
            >
              デモを試す
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Guide Articles / Column ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              お役立ち<span className="text-blue-600">コラム</span>
            </h2>
            <p className="text-gray-500 text-lg">
              公共工事・施工管理のDXに役立つ実践ガイド
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                href: "/guide/public-works-bidding",
                title: "【初心者向け】公共工事の入札方法を完全解説",
                desc: "建設業許可・経審・入札参加資格申請から落札まで",
                tag: "入札・公共工事",
                tagColor: "bg-blue-100 text-blue-700",
              },
              {
                href: "/guide/construction-photo-management",
                title: "工事写真の撮り方・管理方法を完全解説",
                desc: "電子黒板・PHOTO.XML・写真台帳まで",
                tag: "工事写真",
                tagColor: "bg-amber-100 text-amber-700",
              },
              {
                href: "/guide/electronic-delivery",
                title: "電子納品とは？やり方・フォルダ構成を解説",
                desc: "CALS/EC対応・XML生成・チェックまで",
                tag: "電子納品",
                tagColor: "bg-green-100 text-green-700",
              },
              {
                href: "/guide/daily-report-template",
                title: "【無料テンプレート】工事日報の書き方ガイド",
                desc: "記入例・よくある間違いと正しい書き方",
                tag: "日報テンプレート",
                tagColor: "bg-purple-100 text-purple-700",
              },
              {
                href: "/guide/construction-management-app",
                title: "施工管理アプリ比較【2026年最新】",
                desc: "ANDPAD・蔵衛門・Photorectionとの比較",
                tag: "アプリ比較",
                tagColor: "bg-indigo-100 text-indigo-700",
              },
              {
                href: "/guide/ky-activity",
                title: "KY活動のやり方を完全解説",
                desc: "KYT4ラウンド法・TBM-KY・記録シートの書き方",
                tag: "安全管理",
                tagColor: "bg-red-100 text-red-700",
              },
            ].map((article) => (
              <Link
                key={article.href}
                href={article.href}
                className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${article.tagColor}`}
                >
                  {article.tag}
                </span>
                <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 group-hover:text-blue-700 transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-gray-500">{article.desc}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
            >
              すべてのガイドを見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">工事管理SaaS</span>
              </div>
              <p className="text-sm leading-relaxed">
                公共建築工事の施工管理を
                デジタルで革新するクラウドサービス
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm mb-4">サービス</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">機能一覧</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">料金プラン</a></li>
                <li><a href="#mobile" className="hover:text-white transition-colors">モバイル対応</a></li>
                <li><a href="#voices" className="hover:text-white transition-colors">導入事例</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm mb-4">機能</h3>
              <ul className="space-y-2 text-sm">
                <li>写真管理</li>
                <li>書類自動生成</li>
                <li>安全管理</li>
                <li>電子納品</li>
                <li>品質管理</li>
                <li>工程管理</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm mb-4">サポート・情報</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">ログイン</Link></li>
                <li><Link href="/guide" className="hover:text-white transition-colors">お役立ちガイド</Link></li>
                <li><Link href="/guide/public-works-bidding" className="hover:text-white transition-colors">公共工事 入札方法</Link></li>
                <li><Link href="/guide/electronic-delivery" className="hover:text-white transition-colors">電子納品のやり方</Link></li>
                <li><Link href="/specs" className="hover:text-white transition-colors">仕様書ブラウザ</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm">
            <p>&copy; 2026 工事管理SaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
