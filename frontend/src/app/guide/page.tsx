import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GuideNavbar, GuideFooter } from "./guide-components";

export const metadata: Metadata = {
  title: "工事ガイド | 入札から電子納品まで | KAMO construction",
  description:
    "公共工事の入札方法、施工管理、工事写真の撮り方、電子納品のやり方、KY活動、出来形管理など、建設業のDXに役立つ実践ガイド集。",
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide",
  },
};

const GUIDES = [
  {
    href: "/guide/public-works-bidding",
    title: "公共工事の入札方法を完全解説",
    description:
      "建設業許可・経審の取得から入札参加資格申請、一般競争・指名競争入札の仕組み、落札のコツまで。",
    tags: ["入札", "公共工事", "経審"],
    readTime: "約10分",
  },
  {
    href: "/guide/construction-photo-management",
    title: "工事写真の撮り方・管理方法を完全解説",
    description:
      "電子黒板の使い方、撮影区分・工種の分類、PHOTO.XML対応の電子納品まで。",
    tags: ["工事写真", "電子黒板", "写真台帳"],
    readTime: "約8分",
  },
  {
    href: "/guide/electronic-delivery",
    title: "電子納品のやり方・フォルダ構成を解説",
    description:
      "CALS/ECとは何か、電子納品に必要なフォルダ構成、XMLファイルの作り方。",
    tags: ["電子納品", "CALS/EC"],
    readTime: "約9分",
  },
  {
    href: "/guide/daily-report-template",
    title: "工事日報の書き方ガイド",
    description:
      "工事日報に記入すべき項目、天候・出来高・作業員の記録方法、記入例付き。",
    tags: ["工事日報", "施工管理"],
    readTime: "約7分",
  },
  {
    href: "/guide/construction-management-app",
    title: "施工管理アプリ比較｜中小建設会社向け",
    description:
      "ANDPAD・蔵衛門・Photorectionなど主要アプリを比較。選び方ガイド。",
    tags: ["施工管理アプリ", "比較"],
    readTime: "約12分",
  },
  {
    href: "/guide/ky-activity",
    title: "KY活動（危険予知活動）のやり方を完全解説",
    description:
      "KYTの4ラウンド法、KYシートの書き方、TBM-KYの進め方、ヒヤリハット報告まで。",
    tags: ["KY活動", "安全管理"],
    readTime: "約8分",
  },
  {
    href: "/guide/quality-management",
    title: "出来形管理・品質管理とは？管理図の見方",
    description:
      "x-R管理図、ヒストグラム、工程能力指数の計算方法、出来形管理図の書き方。",
    tags: ["出来形管理", "品質管理"],
    readTime: "約10分",
  },
  {
    href: "/guide/mansion-renovation",
    title: "マンション大規模修繕の進め方ガイド",
    description:
      "管理組合の役割、業者選びのポイント、工事中のチェックポイントまで網羅。",
    tags: ["大規模修繕", "管理組合"],
    readTime: "約12分",
  },
  {
    href: "/guide/exterior-painting",
    title: "外壁塗装業者の選び方ガイド",
    description:
      "失敗しない業者選びの5つのポイント、見積書の見方、悪質業者の見分け方。",
    tags: ["外壁塗装", "業者選び"],
    readTime: "約10分",
  },
  {
    href: "/guide/transparent-construction",
    title: "施工管理DXで実現する工事の透明化",
    description:
      "リアルタイム写真共有・日報自動生成・品質管理グラフなど、施工管理のデジタル化。",
    tags: ["施工管理DX", "透明化"],
    readTime: "約8分",
  },
];

export default function GuidePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "工事ガイド",
    description:
      "公共工事の入札から電子納品まで、施工管理のDXに役立つ実践ガイド集",
    url: "https://kouji.soara-mu.jp/guide",
    hasPart: GUIDES.map((g) => ({
      "@type": "Article",
      name: g.title,
      url: `https://kouji.soara-mu.jp${g.href}`,
      description: g.description,
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <GuideNavbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-4">
            Construction Guide
          </p>
          <h1 className="text-3xl lg:text-5xl font-extralight tracking-wider text-[#1a1a1a]">
            工事ガイド
          </h1>
          <div className="w-16 h-px bg-[#1a1a1a] mx-auto mt-6 mb-6" />
          <p className="text-sm text-gray-500 tracking-wide max-w-xl mx-auto leading-relaxed">
            入札から電子納品まで、現場で役立つ知識を分かりやすく解説。
            中小建設会社・職人のためのDX実践ガイド集。
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GUIDES.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group block border border-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] tracking-[0.2em] text-gray-400 uppercase">{guide.readTime}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <h2 className="text-base font-medium tracking-wider text-[#1a1a1a] mb-3 group-hover:text-gray-600 transition-colors leading-relaxed">
                    {guide.title}
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed tracking-wide mb-5">
                    {guide.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {guide.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-gray-400 tracking-wider border border-gray-100 px-2.5 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 bg-[#1a1a1a] p-10 lg:p-14 text-center">
            <p className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-4">Get Started</p>
            <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-white mb-4">
              施工管理を、もっとシンプルに。
            </h2>
            <p className="text-sm text-white/40 tracking-wide mb-8">
              ガイドで紹介した作業をすべてシステムで自動化。まずはお気軽にご相談ください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://kamo.soara-mu.jp/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-[#1a1a1a] text-sm tracking-[0.2em] hover:bg-gray-100 transition-colors"
              >
                お問い合わせ
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-10 py-4 border border-white/20 text-white text-sm tracking-[0.2em] hover:bg-white/5 transition-colors"
              >
                ログインして試す
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GuideFooter />
    </div>
  );
}
