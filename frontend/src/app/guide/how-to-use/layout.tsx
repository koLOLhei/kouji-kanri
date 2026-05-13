import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "システムの使い方｜管理者・作業員それぞれの操作手順 | KAMO construction",
  description:
    "公共建築工事SaaSの使い方を、管理者と作業員それぞれの目線で解説。デモアカウントで誰でも無料で全機能を試せます。",
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/how-to-use",
  },
  openGraph: {
    title: "システムの使い方 | KAMO construction",
    description:
      "管理者・作業員それぞれの操作手順を1ページで。デモアカウントで誰でも全機能をお試しいただけます。",
    url: "https://kouji.soara-mu.jp/guide/how-to-use",
    type: "article",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
