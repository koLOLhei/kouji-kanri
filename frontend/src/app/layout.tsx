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
    default: "施主・管理組合のための工事進捗共有アプリ | 安心・透明な施工管理 SaaS",
    template: "%s | 工事見える化 SaaS",
  },
  description:
    "マンション管理組合や戸建オーナー様への工事報告を劇的に透明化。写真付きのリアルタイム進捗共有で、施主様の不安を解消し、工事品質への信頼を築きます。大規模修繕から住宅リフォームまで対応。",
  keywords: [
    "マンション管理組合 工事報告",
    "大規模修繕 進捗共有",
    "戸建リフォーム 写真報告",
    "工事見える化",
    "施工管理アプリ 施主共有",
    "安心の工事報告",
    "信頼される建設会社 DX",
    "外壁塗装 報告書",
    "マンション理事会 報告",
    "工事進捗管理 無料",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://kouji.soara-mu.jp",
    siteName: "工事管理SaaS",
    title: "工事管理SaaS | 現場の書類地獄から解放する施工管理アプリ",
    description:
      "写真を撮るだけで自動整理。データ入力で書類が完成。公共工事に必要な30種類以上の帳票を自動生成。中小建設会社・職人のための施工管理クラウド。",
    images: [
      {
        url: "https://kouji.soara-mu.jp/og-image.png",
        width: 1200,
        height: 630,
        alt: "工事管理SaaS - 公共工事の施工管理アプリ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "工事管理SaaS | 公共工事の施工管理アプリ",
    description:
      "写真管理・書類自動生成・電子納品。中小建設会社のための無料施工管理アプリ。",
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
  name: "工事管理SaaS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: "https://kouji.soara-mu.jp",
  description:
    "公共工事の施工管理を圧倒的に効率化する施工管理クラウドアプリ。写真管理、工事日報、電子納品、書類自動生成まで。",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
      name: "フリープラン",
    },
    {
      "@type": "Offer",
      price: "29800",
      priceCurrency: "JPY",
      name: "スタンダードプラン",
    },
    {
      "@type": "Offer",
      price: "98000",
      priceCurrency: "JPY",
      name: "エンタープライズプラン",
    },
  ],
  featureList: [
    "工事写真管理・電子黒板",
    "書類自動生成（30種類以上）",
    "電子納品CALS/EC対応",
    "工事日報管理",
    "安全管理・KY活動",
    "品質・出来形管理",
    "工程管理・ガントチャート",
  ],
  screenshot: "https://kouji.soara-mu.jp/og-image.png",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "127",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "工事管理SaaS",
  url: "https://kouji.soara-mu.jp",
  logo: "https://kouji.soara-mu.jp/og-image.png",
  description: "公共建築工事の施工管理をデジタルで革新するクラウドサービス",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    availableLanguage: "Japanese",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <head>
        {/* Content-Security-Policy: mitigate XSS risk from localStorage JWT storage */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://kouji-kanri-api.onrender.com http://127.0.0.1:8001;"
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
