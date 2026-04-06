import type { Metadata } from "next";
import Link from "next/link";
import { GuideNavbar, GuideFooter } from "./guide-components";

export const metadata: Metadata = {
  title: "公共工事ガイド | 入札から電子納品まで",
  description:
    "公共工事の入札方法、施工管理、工事写真の撮り方、電子納品のやり方、KY活動、出来形管理など、建設業のDXに役立つ実践ガイド集。",
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide",
  },
};

const GUIDES = [
  {
    href: "/guide/public-works-bidding",
    title: "【初心者向け】公共工事の入札方法を完全解説",
    description:
      "公共工事とは何か、建設業許可・経審の取得から入札参加資格申請、一般競争・指名競争入札の仕組み、落札のコツまで網羅。",
    tags: ["入札", "公共工事", "経審", "建設業許可"],
    readTime: "約10分",
  },
  {
    href: "/guide/construction-photo-management",
    title: "工事写真の撮り方・管理方法を完全解説",
    description:
      "電子黒板の使い方、撮影区分・工種の分類、PHOTO.XML対応の電子納品まで。写真台帳作成を効率化する実践ガイド。",
    tags: ["工事写真", "電子黒板", "PHOTO.XML", "写真台帳"],
    readTime: "約8分",
  },
  {
    href: "/guide/electronic-delivery",
    title: "電子納品とは？やり方・フォルダ構成を初心者向けに解説",
    description:
      "CALS/ECとは何か、電子納品に必要なフォルダ構成、INDEX_C.XML・PHOTO.XMLの作り方を分かりやすく説明。",
    tags: ["電子納品", "CALS/EC", "PHOTO.XML", "INDEX_C.XML"],
    readTime: "約9分",
  },
  {
    href: "/guide/daily-report-template",
    title: "【無料テンプレート】工事日報の書き方ガイド",
    description:
      "工事日報に記入すべき項目、天候・出来高・作業員の記録方法、よくある記入ミスと注意点を記入例付きで解説。",
    tags: ["工事日報", "テンプレート", "日報書き方", "施工管理"],
    readTime: "約7分",
  },
  {
    href: "/guide/construction-management-app",
    title: "【2026年最新】施工管理アプリ比較｜中小建設会社向け",
    description:
      "ANDPAD・蔵衛門・Photorectionなど主要アプリを比較。中小建設会社・公共工事特化のアプリ選び方ガイド。",
    tags: ["施工管理アプリ", "比較", "ANDPAD", "無料アプリ"],
    readTime: "約12分",
  },
  {
    href: "/guide/ky-activity",
    title: "KY活動（危険予知活動）のやり方を完全解説",
    description:
      "KYTの4ラウンド法、KYシートの書き方、TBM-KYの進め方、ヒヤリハット報告まで。現場の安全管理を体系化。",
    tags: ["KY活動", "KYT", "安全管理", "ヒヤリハット"],
    readTime: "約8分",
  },
  {
    href: "/guide/quality-management",
    title: "出来形管理・品質管理とは？管理図の見方と作り方",
    description:
      "x̄-R管理図、ヒストグラム、工程能力指数Cp・Cpkの計算方法、出来形管理図の書き方を実例を交えて解説。",
    tags: ["出来形管理", "品質管理", "管理図", "工程能力"],
    readTime: "約10分",
  },
];

export default function GuidePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "公共工事ガイド",
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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-blue-600 font-semibold text-sm mb-2">
            建設業・公共工事の実践ガイド
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            公共工事ガイド
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            入札から電子納品まで、現場で役立つ知識を分かりやすく解説。
            中小建設会社・職人のためのDX実践ガイド集。
          </p>
        </div>
      </div>

      {/* Articles */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 gap-6">
          {GUIDES.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-400">{guide.readTime}</span>
              </div>
              <h2 className="font-bold text-gray-900 text-lg leading-snug mb-2 group-hover:text-blue-700 transition-colors">
                {guide.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {guide.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {guide.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center">
          <h2 className="text-white text-2xl font-extrabold mb-2">
            施工管理を、もっとシンプルに。
          </h2>
          <p className="text-blue-200 mb-6">
            ガイドで紹介した作業をすべてアプリで自動化。無料プランで今すぐお試しください。
          </p>
          <Link
            href="/login"
            className="inline-block bg-white text-blue-700 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            無料で始める →
          </Link>
        </div>
      </div>

      <GuideFooter />
    </div>
  );
}
