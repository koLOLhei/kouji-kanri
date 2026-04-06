import Link from "next/link";
import { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared guide page components                                       */
/* ------------------------------------------------------------------ */

export function GuideNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/lp" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">工</span>
          </div>
          <span className="text-base font-bold text-gray-900">
            工事管理<span className="text-blue-600">SaaS</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/guide"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            ガイド一覧
          </Link>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </nav>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function GuideBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href
        ? { item: `https://kouji.soara-mu.jp${item.href}` }
        : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-gray-500 mb-6" aria-label="パンくずリスト">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-blue-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export function TableOfContents({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  return (
    <aside className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
      <p className="font-bold text-blue-800 text-sm mb-3">目次</p>
      <ol className="space-y-1.5">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm text-blue-700 hover:text-blue-900 hover:underline"
            >
              {i + 1}. {item.label}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function CtaBanner({ text }: { text?: string }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-center my-10">
      <p className="text-white font-bold text-xl mb-2">
        {text ?? "書類作成の手間を大幅削減しませんか？"}
      </p>
      <p className="text-blue-200 text-sm mb-5">
        工事管理SaaSなら、この記事で紹介した作業をすべてアプリで完結できます。無料プランで今すぐ試せます。
      </p>
      <Link
        href="/login"
        className="inline-block bg-white text-blue-700 font-bold px-7 py-3 rounded-xl hover:bg-blue-50 transition-colors"
      >
        無料で始める →
      </Link>
    </div>
  );
}

export function AuthorBox() {
  return (
    <div className="border border-gray-200 rounded-xl p-5 flex gap-4 items-start my-10">
      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xl font-bold">工</span>
      </div>
      <div>
        <p className="font-bold text-gray-900 text-sm mb-1">
          工事管理SaaS 編集部
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          公共建築工事の施工管理・DX化を専門とするライター・エンジニアチームが執筆しています。
          公共工事標準仕様書（建築工事編）令和7年版をはじめ、国土交通省の電子納品基準に基づいた正確な情報を提供しています。
        </p>
      </div>
    </div>
  );
}

interface RelatedArticle {
  href: string;
  title: string;
  description: string;
}

export function RelatedArticles({ articles }: { articles: RelatedArticle[] }) {
  return (
    <section className="mt-12 border-t border-gray-100 pt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">関連記事</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {articles.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <p className="font-bold text-blue-700 text-sm mb-1">{a.title}</p>
            <p className="text-xs text-gray-500">{a.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function GuideFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <Link href="/lp" className="text-white font-bold text-lg hover:text-blue-400 transition-colors">
          工事管理SaaS
        </Link>
        <p className="text-sm mt-2 mb-6">
          公共建築工事の施工管理をデジタルで革新するクラウドサービス
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/lp" className="hover:text-white transition-colors">
            サービス紹介
          </Link>
          <Link href="/guide" className="hover:text-white transition-colors">
            ガイド一覧
          </Link>
          <Link href="/login" className="hover:text-white transition-colors">
            ログイン
          </Link>
          <Link href="/login" className="hover:text-white transition-colors">
            無料で始める
          </Link>
        </div>
        <p className="text-xs mt-6">
          &copy; 2026 工事管理SaaS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <GuideNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-8">
        {children}
      </div>
      <GuideFooter />
    </div>
  );
}
