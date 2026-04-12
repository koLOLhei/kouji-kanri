import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "./app-shell";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "工事の見える化で安心を届ける | KAMO construction",
    template: "%s | KAMO construction",
  },
  description:
    "KAMO constructionは、独自の施工管理システムで工事の全工程をリアルタイムに共有。マンション管理組合・戸建て住宅オーナーに、透明性と安心をお届けします。大規模修繕・外壁塗装・リフォームに対応。創業1994年・建設業許可8業種。",
  keywords: [
    "マンション管理組合 大規模修繕",
    "工事進捗 リアルタイム共有",
    "外壁塗装 写真報告",
    "戸建て リフォーム 安心",
    "施工管理 透明性",
    "工事見える化",
    "KAMO construction",
    "マンション理事会 工事報告",
    "建設会社 信頼",
    "大規模修繕 管理組合",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://kouji.soara-mu.jp",
    siteName: "KAMO construction",
    title: "工事の見える化で安心を届ける | KAMO construction",
    description:
      "独自の施工管理システムで工事の全工程をリアルタイムに共有。マンション管理組合様・戸建て住宅オーナー様に、かつてない透明性と安心をお届けします。",
    images: [
      {
        url: "https://kouji.soara-mu.jp/og-image.png",
        width: 1200,
        height: 630,
        alt: "KAMO construction - 工事の見える化で安心を届ける",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "工事の見える化で安心を届ける | KAMO construction",
    description:
      "リアルタイム工事写真共有・報告書自動生成。マンション管理組合・戸建てオーナーのための施工管理システム。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://kouji.soara-mu.jp",
  },
  verification: {},
  manifest: "/manifest.json",
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "KAMO construction 施工管理システム",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: "https://kouji.soara-mu.jp",
  description:
    "マンション管理組合・戸建て住宅オーナー向けの工事見える化システム。リアルタイム写真共有・報告書自動生成・安全管理の透明化。",
  featureList: [
    "リアルタイム工事写真共有",
    "報告書の自動生成",
    "安全管理のデジタル化",
    "品質管理の可視化",
    "施工前後写真比較",
    "工程進捗リアルタイム確認",
  ],
  screenshot: "https://kouji.soara-mu.jp/og-image.png",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KAMO construction",
  url: "https://kamo.soara-mu.jp",
  logo: "https://kouji.soara-mu.jp/og-image.png",
  description:
    "創業1994年。建設業許可8業種を持つ総合建設会社。独自の施工管理システムで施主様・管理組合様に安心と透明性をお届けします。",
  foundingDate: "1994",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: "https://kamo.soara-mu.jp/contact",
    availableLanguage: "Japanese",
  },
  sameAs: ["https://kamo.soara-mu.jp"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <head>
        {/* Content-Security-Policy: mitigate XSS risk from localStorage JWT storage.
            'unsafe-inline' for scripts is required by Next.js for inline script tags.
            staticmap.openstreetmap.de is needed for the photo map component. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://kouji-kanri-api.onrender.com http://127.0.0.1:8001 https://*.onrender.com; font-src 'self' https://fonts.gstatic.com;"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
