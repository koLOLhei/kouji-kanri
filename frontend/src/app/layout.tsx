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
    default: "工事管理SaaS | 公共工事の施工管理・写真管理・書類自動生成アプリ",
    template: "%s | 工事管理SaaS",
  },
  description:
    "公共工事の施工管理を圧倒的に効率化。写真管理、工事日報、電子納品、書類自動生成まで。中小建設会社・職人のための無料から使える施工管理アプリ。",
  keywords: [
    "施工管理アプリ",
    "工事写真管理",
    "電子納品",
    "公共工事",
    "書類自動生成",
    "施工管理 無料",
    "工事日報",
    "中小建設会社 DX",
    "施工管理アプリ 無料",
    "施工管理 アプリ 比較",
    "電子納品 ソフト",
    "公共工事 書類作成",
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
