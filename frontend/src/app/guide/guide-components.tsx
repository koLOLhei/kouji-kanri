import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared guide page components — LP/コーポレートサイト統一デザイン     */
/* ------------------------------------------------------------------ */

export function GuideNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/lp" className="flex items-center">
          <Image src="/logo.png" alt="KAMO construction" width={280} height={280} className="h-16 w-auto" priority />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/guide"
            className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide hidden md:block"
          >
            ガイド一覧
          </Link>
          <Link
            href="/lp"
            className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide hidden md:block"
          >
            サービス紹介
          </Link>
          <a
            href="https://kamo.soara-mu.jp/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1a1a1a] hover:bg-[#333] text-white px-6 py-2.5 text-sm tracking-wider transition-colors"
          >
            お問い合わせ
          </a>
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
      <nav className="text-sm text-gray-400 mb-8" aria-label="パンくずリスト">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-[#1a1a1a] transition-colors tracking-wide"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#1a1a1a] tracking-wide">{item.label}</span>
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
    <aside className="bg-[#f7f6f3] p-6 mb-10">
      <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-4">Contents</p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide"
            >
              {i + 1}. {item.label}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function CtaBanner({ text, href }: { text?: string; href?: string }) {
  const ctaHref = href ?? "https://kamo.soara-mu.jp/contact";
  const isExternal = ctaHref.startsWith("http");
  return (
    <div className="bg-[#1a1a1a] p-8 sm:p-10 text-center my-12">
      <p className="text-white font-extralight text-xl tracking-wider mb-3">
        {text ?? "工事の「見える化」について、まずはご相談ください。"}
      </p>
      <p className="text-white/40 text-sm tracking-wide mb-6">
        KAMO constructionは施工管理システムで工事の全工程を透明化。管理組合・施主様に安心をお届けします。
      </p>
      <a
        href={ctaHref}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="inline-block bg-white text-[#1a1a1a] px-8 py-3 text-sm tracking-[0.15em] hover:bg-gray-100 transition-colors"
      >
        KAMOに無料相談する
      </a>
    </div>
  );
}

export function AuthorBox() {
  return (
    <div className="border-t border-gray-100 pt-8 flex gap-5 items-start my-12">
      <div className="w-14 h-14 bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-medium tracking-wider">KAMO</span>
      </div>
      <div>
        <p className="text-sm font-medium text-[#1a1a1a] tracking-wider mb-1">
          KAMO construction 編集部
        </p>
        <p className="text-xs text-gray-400 leading-relaxed tracking-wide">
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
    <section className="mt-12 border-t border-gray-100 pt-10">
      <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-6">Related Articles</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {articles.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="border border-gray-100 p-5 hover:bg-[#f7f6f3] transition-colors group"
          >
            <p className="text-sm font-medium text-[#1a1a1a] tracking-wider mb-1 group-hover:text-gray-600 transition-colors">{a.title}</p>
            <p className="text-xs text-gray-400 tracking-wide">{a.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function GuideFooter() {
  return (
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
            <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-5">Guide</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/guide" className="hover:text-white transition-colors tracking-wide">ガイド一覧</Link></li>
              <li><Link href="/guide/mansion-renovation" className="hover:text-white transition-colors tracking-wide">大規模修繕ガイド</Link></li>
              <li><Link href="/guide/exterior-painting" className="hover:text-white transition-colors tracking-wide">外壁塗装業者選びガイド</Link></li>
              <li><Link href="/guide/construction-photo-management" className="hover:text-white transition-colors tracking-wide">工事写真管理ガイド</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-5">Links</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/lp" className="hover:text-white transition-colors tracking-wide">サービス紹介</Link></li>
              <li><a href="https://kamo.soara-mu.jp" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors tracking-wide">コーポレートサイト</a></li>
              <li><a href="https://kamo.soara-mu.jp/contact" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors tracking-wide">お問い合わせ</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors tracking-wide">施工管理システム ログイン</Link></li>
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
  );
}

export function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <GuideNavbar />
      <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-28 pb-12">
        {children}
      </div>
      <GuideFooter />
    </div>
  );
}
