import type { Metadata } from "next";
import Link from "next/link";
import {
  GuideLayout,
  GuideBreadcrumb,
  TableOfContents,
  CtaBanner,
  AuthorBox,
  RelatedArticles,
} from "../guide-components";

export const metadata: Metadata = {
  title: "工事の見える化とは？施主が安心できる施工管理DXの全貌",
  description:
    "工事の「見える化」が求められる背景から、DXで変わる施工管理の全容を解説。写真共有・報告書自動生成・品質管理のデジタル化が施主と管理組合にもたらすメリット。",
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/transparent-construction",
  },
};

const TOC = [
  { id: "background", label: "「見える化」が求められる背景" },
  { id: "problems", label: "従来の工事報告の課題" },
  { id: "dx-change", label: "DXで変わる工事管理" },
  { id: "kamo-system", label: "KAMOの施工管理システムの特徴" },
  { id: "benefits", label: "管理組合・施主にとってのメリット" },
  { id: "faq", label: "よくある質問（FAQ）" },
];

export default function TransparentConstructionPage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "工事の見える化とは？施主が安心できる施工管理DXの全貌",
    author: { "@type": "Organization", name: "工事管理SaaS 編集部" },
    publisher: { "@type": "Organization", name: "工事管理SaaS" },
    datePublished: "2026-04-12",
    dateModified: "2026-04-12",
    url: "https://kouji.soara-mu.jp/guide/transparent-construction",
    description:
      "工事の「見える化」が求められる背景から、DXで変わる施工管理の全容を解説。",
  };

  return (
    <GuideLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <GuideBreadcrumb
        items={[
          { label: "ホーム", href: "/lp" },
          { label: "ガイド一覧", href: "/guide" },
          { label: "工事の見える化とは？" },
        ]}
      />

      {/* Hero */}
      <div className="mb-8">
        <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
          施工管理DX
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
          工事の見える化とは？施主が安心できる施工管理DXの全貌
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          公開日：2026年4月12日 ／ 読了時間：約10分
        </p>
      </div>

      <TableOfContents items={TOC} />

      {/* Section 1 */}
      <section id="background" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          「見える化」が求められる背景
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          工事の「見える化」とは、施工中の進捗・品質・安全の状況を施主や管理組合が
          リアルタイムで把握できる状態にすることです。
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          建設工事はその性質上、施主が工事現場に立ち入ることが難しく、
          工事中に何が行われているかを確認する手段が限られていました。
          特に大規模修繕や外壁塗装では、完成後に表面からは見えない部分（防水層・下地処理など）の
          品質を後から確認することは事実上不可能です。
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
          <p className="text-sm font-bold text-blue-900 mb-2">
            こんな不安を感じたことはありませんか？
          </p>
          <ul className="space-y-1.5">
            {[
              "工事が本当にちゃんと進んでいるか確認できない",
              "下地処理がきちんと行われているか不安",
              "報告書が来ても内容が専門的すぎて分からない",
              "写真を見ても何の工程なのか説明がない",
              "業者に聞いても「大丈夫です」としか言ってくれない",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-blue-800">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          こうした施主・管理組合の不安を解消するために、建設業界でもDX（デジタルトランスフォーメーション）が
          進んでいます。スマートフォン・クラウド・AIを活用した「見える化」が、
          業者と施主の信頼関係を大きく変えつつあります。
        </p>
      </section>

      {/* Section 2 */}
      <section id="problems" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          従来の工事報告の課題
        </h2>
        <div className="space-y-4">
          {[
            {
              title: "報告書が工事後にまとめて提出される",
              body: "工事中に問題が発生していても、完成後の報告書では気づけません。リアルタイムな情報共有がなければ、問題の早期発見・対応が難しい状況でした。",
              icon: "📋",
            },
            {
              title: "写真の整理・共有に時間がかかる",
              body: "デジカメで撮影した写真をPCに取り込み、フォルダに整理し、報告書に貼り付ける作業が必要でした。1件の工事で数百枚の写真を整理するのに数日かかることも。",
              icon: "📷",
            },
            {
              title: "書面の報告書では品質の証明が難しい",
              body: "紙の報告書や簡単なPDFでは、塗料の使用量・乾燥時間・施工手順などの詳細な品質管理データを伝えることが困難でした。",
              icon: "📄",
            },
            {
              title: "施主が現場に行かないと状況を確認できない",
              body: "工事期間中に現場を確認したくても、足場のある現場への立ち入りは危険を伴います。また、施主が仕事で現場確認できないケースも多くありました。",
              icon: "🏗️",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="施工管理DXで、工事の不安をゼロにする" />

      {/* Section 3 */}
      <section id="dx-change" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          DXで変わる工事管理
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-6">
          施工管理DXは、従来の紙・電話・メールによる管理を、
          スマートフォン・クラウド・AIに置き換えることで、
          工事の透明性と効率を劇的に向上させます。
        </p>

        <div className="space-y-6">
          {[
            {
              title: "写真共有のデジタル化",
              before: "デジカメ→PC移行→フォルダ整理→報告書貼付（数日かかる）",
              after: "スマホで撮影→即座にクラウド保存→GPS・日時が自動付与→施主ポータルでリアルタイム閲覧",
            },
            {
              title: "報告書の自動生成",
              before: "Word/Excelで手入力→体裁整理→印刷→郵送（1日以上かかる）",
              after: "入力データから自動で帳票生成→PDFで即日送付→クラウドで永久保存",
            },
            {
              title: "品質管理のデジタル化",
              before: "紙の管理図・ノート記録→集計は手作業→誤記入リスクあり",
              after: "測定値入力→管理図自動生成→規格値外れを即アラート→全データをクラウド保存",
            },
          ].map((item) => (
            <div key={item.title} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <p className="font-bold text-gray-900 text-sm">{item.title}</p>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-red-600 mb-1.5">従来</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.before}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 mb-1.5">DX後</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 */}
      <section id="kamo-system" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          KAMOの施工管理システムの特徴
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-5">
          株式会社KAMOでは、独自開発の施工管理システムを全工事に導入しています。
          施主様・管理組合様は、専用ポータルサイトからいつでも工事の状況を確認できます。
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {[
            {
              icon: "📱",
              title: "スマホ対応の施主ポータル",
              desc: "PCでもスマホでも、専用URLにアクセスするだけで工事状況を確認できます。アプリのインストール不要。",
            },
            {
              icon: "📸",
              title: "リアルタイム写真共有",
              desc: "職人がスマホで撮影した写真がGPS・日時付きで即座に共有されます。工程ごとに整理されて見やすく表示。",
            },
            {
              icon: "📊",
              title: "自動生成される品質管理図",
              desc: "測定値を入力するだけで管理図が自動生成。規格値内かどうかが一目でわかります。",
            },
            {
              icon: "📝",
              title: "日報・週報の自動送付",
              desc: "工事日報が自動でまとめられ、定期的にメールで送付されます。確認の手間が大幅に削減されます。",
            },
            {
              icon: "✅",
              title: "工程チェックリスト",
              body: "各工程が完了したかをチェックリストで管理。完了した工程には証拠写真がセットで記録されます。",
            },
            {
              icon: "💬",
              title: "チャットでの問い合わせ",
              desc: "疑問点はチャットで直接担当者に質問できます。電話やメールよりも素早いレスポンスが可能です。",
            },
          ].map((item) => (
            <div key={item.title} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{item.icon}</span>
                <p className="font-bold text-gray-900 text-sm">{item.title}</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {"desc" in item ? item.desc : (item as { body?: string }).body ?? ""}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-900 mb-2">
            KAMO construction について詳しくはこちら
          </p>
          <p className="text-sm text-blue-700 mb-3">
            創業30年・施工実績500件以上のKAMOが提供する、DXで実現する透明性の高い施工管理。
            東京・神奈川エリアで外壁塗装・大規模修繕をご検討の方はお気軽にご相談ください。
          </p>
          <a
            href="https://kamo.soara-mu.jp/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            KAMOに無料相談する →
          </a>
        </div>
      </section>

      {/* Section 5 */}
      <section id="benefits" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          管理組合・施主にとってのメリット
        </h2>

        <div className="space-y-4">
          {[
            {
              title: "工事への不安・ストレスが大幅に減少",
              body: "リアルタイムで進捗を確認できることで、「本当に工事が進んでいるのか」という不安がなくなります。管理組合の定期巡回の負担も軽減されます。",
            },
            {
              title: "品質トラブルの早期発見",
              body: "施工写真や品質管理データをリアルタイムで確認できるため、問題が生じた際に工事中に指摘・修正できます。完成後のトラブルが大幅に減少します。",
            },
            {
              title: "竣工後も使える施工記録",
              body: "全施工写真・品質管理データが電子保存されるため、保証期間中のトラブル対応や次回修繕計画の立案に活用できます。",
            },
            {
              title: "住民への説明が容易に",
              body: "管理組合として区分所有者への進捗報告が必要な場合、システムの画面を見せながら説明できます。専門知識がなくても分かりやすく伝えられます。",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="text-emerald-500 text-lg flex-shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6 - FAQ */}
      <section id="faq" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          よくある質問（FAQ）
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "施工管理システムを使うのに特別な操作が必要ですか？",
              a: "スマートフォンでウェブサイトを見るのと同じ操作で使えます。アプリのインストールは不要で、URLにアクセスするだけで工事状況を確認できます。",
            },
            {
              q: "写真はどのくらいの頻度で更新されますか？",
              a: "職人が撮影した写真は即時（数分以内）にポータルに反映されます。工事が行われていれば、1日に何枚も更新されます。",
            },
            {
              q: "システムを使っていない業者と比べて工事費用は変わりますか？",
              a: "KAMOのシステム導入コストは工事費に上乗せされることはありません。同等の品質・規模の工事であれば、従来型の業者と同水準の費用でご提供しています。",
            },
            {
              q: "工事の記録データはいつまで保存されますか？",
              a: "竣工後も永久に保存されます。将来の修繕計画や保証対応時に、いつでもデータを参照することができます。",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <span className="font-bold text-gray-900 text-sm pr-4">{item.q}</span>
                <span className="text-blue-600 flex-shrink-0 text-lg">+</span>
              </summary>
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <AuthorBox />

      <RelatedArticles
        articles={[
          {
            href: "/guide/mansion-renovation",
            title: "マンション大規模修繕の進め方ガイド｜管理組合が知るべき全知識",
            description:
              "大規模修繕の基本から管理組合の役割、業者選びのポイントまで網羅した完全ガイド。",
          },
          {
            href: "/guide/exterior-painting",
            title: "戸建て外壁塗装の業者選びガイド｜失敗しない7つのポイント",
            description:
              "外壁塗装の業者選びで失敗しないための7つのポイント。塗料・見積書の見方も。",
          },
          {
            href: "/guide/construction-photo-management",
            title: "工事写真の撮り方・管理方法を完全解説",
            description:
              "電子黒板・PHOTO.XML・写真台帳作成まで。写真管理を効率化する実践ガイド。",
          },
          {
            href: "/guide/construction-management-app",
            title: "施工管理アプリ比較【2026年最新】",
            description:
              "ANDPAD・蔵衛門・Photorectionなど主要アプリを比較した中小建設会社向けガイド。",
          },
        ]}
      />
    </GuideLayout>
  );
}
