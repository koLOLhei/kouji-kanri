"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "500件以上", label: "施工実績" },
  { value: "50件以上", label: "公共工事" },
  { value: "8業種", label: "建設業許可" },
  { value: "1994年", label: "創業" },
];

const PAIN_POINTS = [
  {
    title: "「工事の進捗がわからない…」",
    description:
      "工事が始まってから完了まで、現場の様子が一切見えない。何が行われているのか、予定通りに進んでいるのか、気になっても聞きづらい。",
  },
  {
    title: "「写真報告が遅くて不安」",
    description:
      "「後で送ります」と言われたまま数週間。施工途中の大切な部分の写真が届かず、品質に不安だけが募る。",
  },
  {
    title: "「どの業者を選べば安心なのか」",
    description:
      "見積もりは安くても、実際の施工品質はどうなのか。信頼できる根拠がないまま、高額な工事を任せなければならない。",
  },
];

const DX_REASONS = [
  {
    number: "01",
    title: "リアルタイム工事写真共有",
    description:
      "毎日の施工状況を写真付きで自動共有。現場から直接スマートフォンでアップロードされた写真が、即座に施主様・管理組合様へ届きます。",
  },
  {
    number: "02",
    title: "報告書の自動生成",
    description:
      "月次報告書・完了報告書が自動で作成されます。手書きやExcelでの転記作業が不要になり、正確で見やすい書類をいつでも確認いただけます。",
  },
  {
    number: "03",
    title: "安全管理の徹底",
    description:
      "KY活動・ヒヤリハット報告をデジタル管理。現場の安全状況が見える化され、施主様も安心して工事をお任せいただけます。",
  },
  {
    number: "04",
    title: "品質管理の可視化",
    description:
      "検査記録・管理図をリアルタイムで確認。完成後に見えなくなる部分の施工品質も、デジタル記録として永続的に保管します。",
  },
];

const CONDO_BENEFITS = [
  "大規模修繕の全工程をリアルタイムで確認",
  "理事会向け報告書が自動で完成",
  "スマートフォンでいつでも進捗確認",
  "工事写真・検査記録の完全デジタル保存",
];

const HOUSE_BENEFITS = [
  "外壁塗装・リフォームの施工過程を写真で確認",
  "施工前後の比較写真をアルバム形式で保管",
  "日々の作業報告をスマホで受け取れる",
  "完成後も施工記録として永続的に活用可能",
];

const TESTIMONIALS = [
  {
    quote:
      "工事期間中、毎日写真と作業報告が届くので、遠方に住む組合員からも「安心して任せられる」と好評でした。理事会での説明もシステムの画面を見せるだけで済み、大幅に楽になりました。",
    name: "山田 理事長",
    role: "都内マンション管理組合",
    detail: "大規模修繕工事（外壁・防水）",
  },
  {
    quote:
      "以前は工事中に業者へ連絡するのが気を使いましたが、システムで進捗が見えるので余計な心配をしなくて済みます。施工前後の写真も残っていて、後悔のない工事ができました。",
    name: "鈴木 様",
    role: "戸建て住宅オーナー",
    detail: "外壁・屋根塗装工事",
  },
  {
    quote:
      "管理している物件の工事状況を一か所で確認できるのが非常に便利です。オーナー様への報告資料も自動で作成されるので、業務効率が格段に上がりました。",
    name: "中村 マネージャー",
    role: "不動産管理会社",
    detail: "複数棟の修繕工事管理",
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Navbar() {
  const { token } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf7f2]/90 backdrop-blur-xl border-b border-[#1a4d3e]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo — same sizing as kamo.soara-mu.jp header */}
        <Link href="/lp" className="flex items-center">
          <Image src="/logo.png" alt="KAMO construction" width={280} height={280} className="h-14 w-auto" priority />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#reasons" className="text-sm text-[#3a3a3a] hover:text-[#1a4d3e] transition-colors font-medium tracking-wide">
            選ばれる理由
          </a>
          <a href="#persona" className="text-sm text-[#3a3a3a] hover:text-[#1a4d3e] transition-colors font-medium tracking-wide">
            お客様別のご案内
          </a>
          <a href="#voices" className="text-sm text-[#3a3a3a] hover:text-[#1a4d3e] transition-colors font-medium tracking-wide">
            お客様の声
          </a>
          <a
            href="https://kamo.soara-mu.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#3a3a3a] hover:text-[#1a4d3e] transition-colors font-medium tracking-wide"
          >
            コーポレートサイト
          </a>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {token ? (
            <Link
              href="/"
              className="bg-[#1a4d3e] hover:bg-[#2d6a5a] text-white px-5 py-2.5 text-sm font-semibold transition-all tracking-wide"
            >
              ダッシュボードへ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[#1a4d3e] hover:text-[#2d6a5a] transition-colors px-3 py-2 tracking-wide"
              >
                ログイン
              </Link>
              <a
                href="https://kamo.soara-mu.jp/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1a4d3e] hover:bg-[#2d6a5a] text-white px-5 py-2.5 text-sm font-semibold transition-all tracking-wide"
              >
                お問い合わせ
              </a>
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2] font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-[#1a4d3e] overflow-hidden pt-16">
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)",
          }}
        />
        {/* Gold accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#b8973a] via-[#d4af5a] to-[#b8973a]" />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-32">
          <div className="max-w-3xl">
            {/* Logo + Eyebrow */}
            <div className="mb-8">
              <Image src="/logo.png" alt="KAMO construction" width={280} height={280} className="h-20 w-auto brightness-0 invert mb-4" />
              <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase">
                施工管理の透明化
              </p>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-8 tracking-tight">
              工事の
              <span className="block text-[#b8973a]">"見える化"</span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl font-light mt-2">
                で、安心を届ける。
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-12 max-w-2xl font-light tracking-wide">
              KAMO constructionは、独自の施工管理システムで工事の全工程をリアルタイムに共有。
              管理組合様・施主様に、かつてない透明性と安心をお届けします。
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#reasons"
                className="inline-flex items-center justify-center gap-2 bg-[#b8973a] hover:bg-[#d4af5a] text-white px-8 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
              >
                施工事例を見る
                <span className="text-lg leading-none">→</span>
              </a>
              <a
                href="https://kamo.soara-mu.jp/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/40 hover:border-white text-white px-8 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </div>

        {/* Decorative right side element */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 lg:w-96 lg:h-96 border border-[#b8973a]/20 rounded-full opacity-30 mr-16" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 lg:w-72 lg:h-72 border border-[#b8973a]/15 rounded-full opacity-20 mr-24" />
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────── */}
      <section className="bg-[#f5f0e8] border-y border-[#1a4d3e]/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-[#1a4d3e] tracking-tight mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-[#5a5a5a] tracking-widest font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain Points ───────────────────────────────────────────────── */}
      <section className="py-28 bg-[#faf7f2]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          {/* Section header */}
          <div className="text-center mb-20">
            <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase mb-4">
              よくあるご不安
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] tracking-tight">
              こんなお悩みはありませんか？
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-0 border border-[#1a4d3e]/15">
            {PAIN_POINTS.map((point, i) => (
              <div
                key={i}
                className="p-10 border-b md:border-b-0 md:border-r border-[#1a4d3e]/15 last:border-0"
              >
                <div className="w-8 h-px bg-[#b8973a] mb-6" />
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 leading-snug">
                  {point.title}
                </h3>
                <p className="text-[#5a5a5a] leading-relaxed text-sm">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DX System / Reasons ───────────────────────────────────────── */}
      <section id="reasons" className="py-28 bg-[#1a4d3e]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          {/* Section header */}
          <div className="mb-20">
            <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase mb-4">
              KAMOの強み
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight max-w-xl">
              KAMOが選ばれる理由
            </h2>
            <p className="text-white/60 mt-4 max-w-xl leading-relaxed font-light">
              独自の施工管理システムにより、工事のすべての過程を透明化。
              施主様・管理組合様が「見える」工事を実現しています。
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-white/10">
            {DX_REASONS.map((reason) => (
              <div key={reason.number} className="bg-[#1a4d3e] p-10 hover:bg-[#2d6a5a]/40 transition-colors">
                <p className="text-[#b8973a] text-4xl font-bold leading-none mb-6 opacity-60">
                  {reason.number}
                </p>
                <h3 className="text-xl font-bold text-white mb-4">{reason.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm font-light">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Persona: Condo ────────────────────────────────────────────── */}
      <section id="persona" className="py-28 bg-[#faf7f2]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Text */}
            <div>
              <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase mb-4">
                For Condominium Associations
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight leading-tight">
                マンション管理組合の
                <span className="block text-[#1a4d3e]">皆様へ</span>
              </h2>
              <p className="text-[#5a5a5a] leading-relaxed mb-10 font-light">
                大規模修繕工事は、管理組合にとって数千万円規模の重大な決断です。
                KAMOは、理事会・組合員の皆様が工事の全過程を安心して見守れるよう、
                完全な透明性をご提供します。
              </p>
              <ul className="space-y-4">
                {CONDO_BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 w-5 h-5 flex-shrink-0 border border-[#1a4d3e] flex items-center justify-center">
                      <span className="w-2 h-2 bg-[#1a4d3e]" />
                    </span>
                    <span className="text-[#3a3a3a] font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual card */}
            <div className="bg-[#1a4d3e] p-12 relative">
              <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-[#b8973a]/40" />
              <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-[#b8973a]/40" />
              <p className="text-[#b8973a] text-xs tracking-[0.3em] uppercase mb-8">工事進捗レポート</p>
              {/* Mock progress UI */}
              <div className="space-y-5">
                {[
                  { label: "仮設工事", pct: 100 },
                  { label: "外壁下地補修", pct: 100 },
                  { label: "塗装工事", pct: 72 },
                  { label: "防水工事", pct: 30 },
                  { label: "付帯設備", pct: 0 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-white/70 tracking-wide">{item.label}</span>
                      <span className="text-xs text-white/70">{item.pct}%</span>
                    </div>
                    <div className="h-1 bg-white/10 w-full">
                      <div
                        className="h-1 bg-[#b8973a]"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-8 tracking-widest">
                本日の作業写真 14枚 アップロード済み
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Persona: House ────────────────────────────────────────────── */}
      <section className="py-28 bg-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Visual card */}
            <div className="bg-white border border-[#1a4d3e]/10 p-12 relative order-2 lg:order-1">
              <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-[#b8973a]/30" />
              <p className="text-[#b8973a] text-xs tracking-[0.3em] uppercase mb-8">施工前後レポート</p>
              {/* Mock before/after */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-[#5a5a5a] tracking-widest mb-2 uppercase">Before</p>
                  <div className="aspect-square bg-[#e8e0d0] flex items-center justify-center">
                    <span className="text-[#a0a0a0] text-xs">施工前</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#1a4d3e] tracking-widest mb-2 uppercase font-semibold">After</p>
                  <div className="aspect-square bg-[#1a4d3e]/10 border border-[#1a4d3e]/20 flex items-center justify-center">
                    <span className="text-[#1a4d3e] text-xs">施工後</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#1a4d3e]/10 pt-5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-[#5a5a5a]">工事種別</span>
                  <span className="text-xs text-[#1a1a1a] font-medium">外壁塗装・屋根塗装</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#5a5a5a]">工期</span>
                  <span className="text-xs text-[#1a1a1a] font-medium">14日間</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#5a5a5a]">写真記録数</span>
                  <span className="text-xs text-[#1a1a1a] font-medium">128枚</span>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase mb-4">
                For Homeowners
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight leading-tight">
                戸建て住宅オーナーの
                <span className="block text-[#1a4d3e]">皆様へ</span>
              </h2>
              <p className="text-[#5a5a5a] leading-relaxed mb-10 font-light">
                外壁塗装・屋根工事・内装リフォームは、住まいを守る大切な投資です。
                KAMOでは、毎日の施工状況をスマートフォンでご確認いただけるため、
                仕事中でも安心して工事をお任せいただけます。
              </p>
              <ul className="space-y-4">
                {HOUSE_BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 w-5 h-5 flex-shrink-0 border border-[#1a4d3e] flex items-center justify-center">
                      <span className="w-2 h-2 bg-[#1a4d3e]" />
                    </span>
                    <span className="text-[#3a3a3a] font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section id="voices" className="py-28 bg-[#faf7f2]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          {/* Section header */}
          <div className="text-center mb-20">
            <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase mb-4">
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] tracking-tight">
              お客様の声
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white border border-[#1a4d3e]/10 p-10 flex flex-col">
                {/* Quote mark */}
                <div className="text-5xl leading-none text-[#b8973a]/40 font-serif mb-4">&ldquo;</div>
                <p className="text-[#3a3a3a] leading-relaxed text-sm flex-1 mb-8 font-light">
                  {t.quote}
                </p>
                <div className="border-t border-[#1a4d3e]/10 pt-6">
                  <p className="font-bold text-[#1a1a1a] text-sm">{t.name}</p>
                  <p className="text-[#5a5a5a] text-xs mt-1">{t.role}</p>
                  <p className="text-[#b8973a] text-xs mt-0.5 tracking-wide">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-28 bg-[#1a4d3e] relative overflow-hidden">
        {/* Decorative element */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] border border-[#b8973a]/10 rounded-full" />
          <div className="absolute w-[400px] h-[400px] border border-[#b8973a]/10 rounded-full" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-[#b8973a] text-xs font-semibold tracking-[0.35em] uppercase mb-6">
            Contact
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
            まずはお気軽にご相談ください
          </h2>
          <p className="text-white/60 leading-relaxed mb-12 font-light text-lg">
            工事の透明化・安心な施工管理について、どんな些細なご質問でも構いません。
            専門スタッフが丁寧にお答えします。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://kamo.soara-mu.jp/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#b8973a] hover:bg-[#d4af5a] text-white px-10 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
            >
              お問い合わせフォームへ
              <span className="text-base">→</span>
            </a>
            <a
              href="https://kamo.soara-mu.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-white/30 hover:border-white text-white px-10 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
            >
              コーポレートサイトへ
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-[#111] text-white/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-16">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="mb-5">
                <Image src="/logo.png" alt="KAMO construction" width={280} height={280} className="h-16 w-auto brightness-0 invert" />
              </div>
              <p className="text-sm leading-relaxed">
                創業1994年。建設業許可8業種を持つ総合建設会社。
                独自の施工管理システムで、施主様・管理組合様に
                安心と透明性をお届けします。
              </p>
            </div>

            {/* Service links */}
            <div>
              <p className="text-white text-xs font-semibold tracking-[0.25em] uppercase mb-5">サービス</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#reasons" className="hover:text-white transition-colors">
                    KAMOが選ばれる理由
                  </a>
                </li>
                <li>
                  <a href="#persona" className="hover:text-white transition-colors">
                    マンション管理組合の方へ
                  </a>
                </li>
                <li>
                  <a href="#persona" className="hover:text-white transition-colors">
                    戸建て住宅オーナーの方へ
                  </a>
                </li>
                <li>
                  <a href="#voices" className="hover:text-white transition-colors">
                    お客様の声
                  </a>
                </li>
              </ul>
            </div>

            {/* External & system links */}
            <div>
              <p className="text-white text-xs font-semibold tracking-[0.25em] uppercase mb-5">リンク</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="https://kamo.soara-mu.jp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    コーポレートサイト
                  </a>
                </li>
                <li>
                  <a
                    href="https://kamo.soara-mu.jp/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    お問い合わせ
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    施工管理システム ログイン
                  </Link>
                </li>
                <li>
                  <Link href="/guide" className="hover:text-white transition-colors">
                    工事ガイド一覧
                  </Link>
                </li>
                <li>
                  <Link href="/guide/mansion-renovation" className="hover:text-white transition-colors">
                    大規模修繕ガイド
                  </Link>
                </li>
                <li>
                  <Link href="/guide/exterior-painting" className="hover:text-white transition-colors">
                    外壁塗装業者選びガイド
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs tracking-widest">
              &copy; {new Date().getFullYear()} KAMO construction. All rights reserved.
            </p>
            <p className="text-xs">
              施工管理システム powered by{" "}
              <a
                href="https://kamo.soara-mu.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b8973a] hover:text-[#d4af5a] transition-colors"
              >
                kamo.soara-mu.jp
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
