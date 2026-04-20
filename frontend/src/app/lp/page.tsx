import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "./navbar";

export const metadata: Metadata = {
  title: "工事の見える化で安心を届ける | KAMO construction",
  description:
    "KAMO constructionは独自の施工管理システムで工事の全工程をリアルタイムに共有。マンション管理組合・戸建て住宅オーナーに透明性と安心をお届けします。",
  openGraph: {
    title: "工事の見える化で安心を届ける | KAMO construction",
    description:
      "リアルタイム工事写真共有・報告書自動生成。管理組合・施主のための施工管理システム。",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "500+", label: "施工実績", sub: "Projects" },
  { value: "50+", label: "公共工事", sub: "Public Works" },
  { value: "8", label: "建設業許可", sub: "Licenses" },
  { value: "1994", label: "創業", sub: "Founded" },
];

const PAIN_POINTS = [
  {
    num: "01",
    title: "工事の進捗がわからない",
    description:
      "工事が始まってから完了まで、現場の様子が一切見えない。何が行われているのか、予定通りに進んでいるのか、気になっても聞きづらい。",
  },
  {
    num: "02",
    title: "写真報告が遅くて不安",
    description:
      "「後で送ります」と言われたまま数週間。施工途中の大切な部分の写真が届かず、品質に不安だけが募る。",
  },
  {
    num: "03",
    title: "どの業者を選べば安心なのか",
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image src="/hero-construction.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/85 via-[#1a1a1a]/60 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-32">
          <div className="max-w-2xl">
            <p className="text-[10px] tracking-[0.5em] text-white/50 uppercase mb-8">
              Since 1994 — Construction DX
            </p>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white leading-[1.1] tracking-wider mb-8">
              工事の
              <br />
              <span className="font-light">&ldquo;見える化&rdquo;</span>
              <br />
              <span className="text-4xl sm:text-5xl">で、安心を届ける。</span>
            </h1>

            <p className="text-base text-white/60 leading-[2] tracking-wide mb-14 max-w-lg">
              独自の施工管理システムで工事の全工程をリアルタイムに共有。
              管理組合様・施主様に、かつてない透明性と安心をお届けします。
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#reasons"
                className="inline-flex items-center justify-center px-10 py-4 bg-white text-[#1a1a1a] text-sm tracking-[0.2em] hover:bg-gray-100 transition-colors"
              >
                選ばれる理由を見る
              </a>
              <a
                href="https://kamo.soara-mu.jp/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-10 py-4 border border-white/40 text-white text-sm tracking-[0.2em] hover:bg-white/10 transition-colors"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator — hidden on mobile to avoid overlap with CTAs */}
        <div className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-3">
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase">Scroll</span>
          <div className="w-px h-12 bg-white/20" />
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-white/10">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center lg:px-8">
                <p className="text-4xl md:text-5xl font-extralight text-white tracking-wider">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm text-gray-400 tracking-wider">{stat.label}</p>
                <p className="text-[10px] tracking-[0.3em] text-gray-600 uppercase mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain Points ───────────────────────────────────────────────── */}
      <section className="py-32 lg:py-44 bg-white relative">
        {/* Decorative lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gray-50" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gray-50" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-3">Problem</p>
            <h2 className="text-3xl lg:text-4xl font-extralight tracking-wider text-[#1a1a1a]">
              こんなお悩みはありませんか？
            </h2>
            <div className="w-16 h-px bg-[#1a1a1a] mx-auto mt-6" />
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-gray-100">
            {PAIN_POINTS.map((point) => (
              <div key={point.num} className="bg-white p-12">
                <p className="text-4xl font-extralight text-gray-200 mb-6">{point.num}</p>
                <h3 className="text-lg font-medium tracking-wider text-[#1a1a1a] mb-4">
                  {point.title}
                </h3>
                <p className="text-sm text-gray-500 leading-[2]">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DX Reasons ────────────────────────────────────────────────── */}
      <section id="reasons" className="py-32 lg:py-44 bg-[#f7f6f3]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left: Title (sticky) */}
            <div className="lg:sticky lg:top-32">
              <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-3">Reasons</p>
              <h2 className="text-3xl lg:text-4xl font-extralight tracking-wider text-[#1a1a1a] leading-relaxed">
                KAMOが選ばれる理由
              </h2>
              <div className="w-16 h-px bg-[#1a1a1a] mt-6 mb-8" />
              <p className="text-sm text-gray-500 leading-[2] tracking-wide">
                独自の施工管理システムにより、工事のすべての過程を透明化。
                施主様・管理組合様が「見える」工事を実現しています。
              </p>
            </div>

            {/* Right: Cards */}
            <div className="space-y-6">
              {DX_REASONS.map((reason) => (
                <div key={reason.number} className="bg-white p-10 relative group">
                  <div className="absolute top-0 left-0 w-0 h-px bg-[#1a1a1a] group-hover:w-full transition-all duration-700" />
                  <div className="flex gap-6">
                    <p className="text-3xl font-extralight text-gray-200 flex-shrink-0">
                      {reason.number}
                    </p>
                    <div>
                      <h3 className="text-base font-medium tracking-wider text-[#1a1a1a] mb-3">
                        {reason.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-[2]">{reason.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Persona: Condo ────────────────────────────────────────────── */}
      <section id="persona" className="py-32 lg:py-44 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Text */}
            <div>
              <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-3">
                For Condominium Associations
              </p>
              <h2 className="text-3xl lg:text-4xl font-extralight tracking-wider text-[#1a1a1a] leading-relaxed mb-6">
                マンション管理組合の
                <br />
                皆様へ
              </h2>
              <div className="w-16 h-px bg-[#1a1a1a] mb-8" />
              <p className="text-sm text-gray-500 leading-[2.2] tracking-wide mb-10">
                大規模修繕工事は、管理組合にとって数千万円規模の重大な決断です。
                KAMOは、理事会・組合員の皆様が工事の全過程を安心して見守れるよう、
                完全な透明性をご提供します。
              </p>
              <ul className="space-y-4">
                {CONDO_BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full flex-shrink-0" />
                    <span className="text-sm text-[#1a1a1a] tracking-wide">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock UI card */}
            <div className="bg-[#1a1a1a] p-10 lg:p-12 relative">
              <div className="absolute -top-3 -right-3 w-20 h-20 border-t border-r border-gray-300" />
              <div className="absolute -bottom-3 -left-3 w-20 h-20 border-b border-l border-gray-300" />

              <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-8">Progress Report</p>
              <div className="space-y-6">
                {[
                  { label: "仮設工事", pct: 100 },
                  { label: "外壁下地補修", pct: 100 },
                  { label: "塗装工事", pct: 72 },
                  { label: "防水工事", pct: 30 },
                  { label: "付帯設備", pct: 0 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white/60 tracking-wider">{item.label}</span>
                      <span className="text-xs text-white/40">{item.pct}%</span>
                    </div>
                    <div className="h-px bg-white/10 w-full">
                      <div className="h-px bg-white/60" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-[11px] mt-10 tracking-wider">
                本日の作業写真 14枚 アップロード済み
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Persona: House ────────────────────────────────────────────── */}
      <section className="py-32 lg:py-44 bg-[#f7f6f3]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Mock UI card */}
            <div className="bg-white p-10 lg:p-12 relative order-2 lg:order-1">
              <div className="absolute -top-3 -right-3 w-20 h-20 border-t border-r border-gray-200" />
              <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-8">Before / After Report</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <p className="text-[10px] text-gray-400 tracking-widest mb-2 uppercase">Before</p>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-xs tracking-wider">施工前</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-[#1a1a1a] tracking-widest mb-2 uppercase font-medium">After</p>
                  <div className="aspect-square bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 flex items-center justify-center">
                    <span className="text-[#1a1a1a] text-xs tracking-wider">施工後</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-6 space-y-3">
                {[
                  ["工事種別", "外壁塗装・屋根塗装"],
                  ["工期", "14日間"],
                  ["写真記録数", "128枚"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-xs text-gray-400 tracking-wider">{k}</span>
                    <span className="text-xs text-[#1a1a1a] tracking-wider">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-3">
                For Homeowners
              </p>
              <h2 className="text-3xl lg:text-4xl font-extralight tracking-wider text-[#1a1a1a] leading-relaxed mb-6">
                戸建て住宅オーナーの
                <br />
                皆様へ
              </h2>
              <div className="w-16 h-px bg-[#1a1a1a] mb-8" />
              <p className="text-sm text-gray-500 leading-[2.2] tracking-wide mb-10">
                外壁塗装・屋根工事・内装リフォームは、住まいを守る大切な投資です。
                KAMOでは、毎日の施工状況をスマートフォンでご確認いただけるため、
                仕事中でも安心して工事をお任せいただけます。
              </p>
              <ul className="space-y-4">
                {HOUSE_BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full flex-shrink-0" />
                    <span className="text-sm text-[#1a1a1a] tracking-wide">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section id="voices" className="py-32 lg:py-44 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-3">Testimonials</p>
            <h2 className="text-3xl lg:text-4xl font-extralight tracking-wider text-[#1a1a1a]">
              お客様の声
            </h2>
            <div className="w-16 h-px bg-[#1a1a1a] mx-auto mt-6" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-[#f7f6f3] p-10 lg:p-12 relative">
                <span className="absolute top-6 right-8 text-6xl font-serif text-gray-200 leading-none select-none">
                  &rdquo;
                </span>
                <p className="text-sm text-gray-600 leading-[2] tracking-wide relative z-10 mb-8">
                  {t.quote}
                </p>
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-sm font-medium text-[#1a1a1a] tracking-wider">{t.name}</p>
                  <p className="text-[11px] text-gray-400 mt-1 tracking-wide">{t.role}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative py-32 lg:py-44">
        <div className="absolute inset-0 bg-[#1a1a1a]" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-4">Contact</p>
          <h2 className="text-3xl lg:text-4xl font-extralight tracking-wider text-white leading-relaxed">
            まずはお気軽にご相談ください
          </h2>
          <p className="mt-6 text-sm text-white/40 tracking-wide leading-relaxed max-w-md mx-auto">
            工事の透明化・安心な施工管理について、どんな些細なご質問でも構いません。
            専門スタッフが丁寧にお答えします。
          </p>
          <div className="mt-14 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://kamo.soara-mu.jp/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-12 py-4 bg-white text-[#1a1a1a] text-sm tracking-[0.2em] hover:bg-white/90 transition-colors"
            >
              お問い合わせフォームへ
            </a>
            <a
              href="https://kamo.soara-mu.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-12 py-4 border border-white/20 text-white text-sm tracking-[0.2em] hover:bg-white/5 transition-colors"
            >
              コーポレートサイトへ
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-[#111] text-white/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <Image src="/logo.png" alt="KAMO construction" width={280} height={280} className="h-20 w-auto brightness-0 invert mb-6" />
              <p className="text-sm leading-relaxed">
                創業1994年。建設業許可8業種を持つ総合建設会社。
                独自の施工管理システムで安心と透明性をお届けします。
              </p>
            </div>

            <div>
              <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-5">Service</p>
              <ul className="space-y-3 text-sm">
                <li><a href="#reasons" className="hover:text-white transition-colors tracking-wide">KAMOが選ばれる理由</a></li>
                <li><a href="#persona" className="hover:text-white transition-colors tracking-wide">マンション管理組合の方へ</a></li>
                <li><a href="#persona" className="hover:text-white transition-colors tracking-wide">戸建て住宅オーナーの方へ</a></li>
                <li><a href="#voices" className="hover:text-white transition-colors tracking-wide">お客様の声</a></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-5">Links</p>
              <ul className="space-y-3 text-sm">
                <li><a href="https://kamo.soara-mu.jp" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors tracking-wide">コーポレートサイト</a></li>
                <li><a href="https://kamo.soara-mu.jp/contact" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors tracking-wide">お問い合わせ</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors tracking-wide">施工管理システム ログイン</Link></li>
                <li><Link href="/guide" className="hover:text-white transition-colors tracking-wide">工事ガイド一覧</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs tracking-widest">
              &copy; {new Date().getFullYear()} KAMO construction. All rights reserved.
            </p>
            <p className="text-xs tracking-wider">
              <a href="https://kamo.soara-mu.jp" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                kamo.soara-mu.jp
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
