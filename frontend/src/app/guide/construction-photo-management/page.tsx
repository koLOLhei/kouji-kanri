import type { Metadata } from "next";
import {
  GuideLayout,
  GuideBreadcrumb,
  TableOfContents,
  CtaBanner,
  AuthorBox,
  RelatedArticles,
} from "../guide-components";

export const metadata: Metadata = {
  title:
    "工事写真の撮り方・管理方法を完全解説｜電子黒板・分類のコツ・PHOTO.XML",
  description:
    "公共工事の工事写真の撮り方、電子黒板（電子小黒板）の使い方、工種・区分別の分類方法、写真台帳の作り方、PHOTO.XML対応の電子納品まで実践的に解説します。",
  keywords: [
    "工事写真 撮り方",
    "工事写真管理 アプリ",
    "電子黒板",
    "PHOTO.XML",
    "写真台帳",
    "電子納品 写真",
    "工事写真 管理",
  ],
  alternates: {
    canonical:
      "https://kouji.soara-mu.jp/guide/construction-photo-management",
  },
};

const TOC = [
  { id: "why-photo", label: "なぜ工事写真が重要なのか" },
  { id: "what-to-shoot", label: "撮影すべき写真の種類と区分" },
  { id: "how-to-shoot", label: "正しい撮影の基本" },
  { id: "denshikokuban", label: "電子黒板（電子小黒板）の使い方" },
  { id: "classification", label: "工事写真の分類・整理方法" },
  { id: "photo-ledger", label: "写真台帳の作り方" },
  { id: "photo-xml", label: "PHOTO.XMLと電子納品" },
  { id: "app-benefits", label: "アプリ活用で劇的に効率化" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "工事写真はどのくらいの頻度で撮影すればよいですか？",
    a: "施工管理基準（国土交通省）では工種・区分ごとに撮影頻度が定められています。基本は「施工前・施工中・施工後」の3枚セットで、コンクリート打設などは数量確認写真（型枠・鉄筋）なども必要です。仕様書の写真管理計画書に従いましょう。",
  },
  {
    q: "スマホで撮影した写真は使えますか？",
    a: "使えます。近年はスマートフォンのカメラ性能が向上しており、有効画素数の要件（300万画素以上が推奨）を満たすものがほとんどです。ただし、EXIF情報（GPS・撮影日時）が正確に記録されるよう設定を確認してください。",
  },
  {
    q: "電子黒板（電子小黒板）は必須ですか？",
    a: "国土交通省「デジタル写真管理情報基準」では、電子小黒板の使用が推奨されています。従来の黒板（ホワイトボード）も認められていますが、電子黒板ならテキストが明瞭で文字化けがなく、後から情報を確認しやすいため、電子納品審査でも好印象です。",
  },
  {
    q: "PHOTO.XMLとはどのようなファイルですか？",
    a: "国土交通省の電子納品基準（デジタル写真管理情報基準）で定められたXMLファイルです。各写真のメタデータ（工種・撮影区分・撮影年月日・写真種別）を格納します。電子納品検査ソフトでの検査に使用されます。",
  },
  {
    q: "写真の容量はどのくらいにすればよいですか？",
    a: "国交省のデジタル写真管理情報基準では1枚あたり1MB以上（JPEG形式）を推奨しています。スマホの「高画質」設定で撮影すればほぼ問題ありません。ただし発注機関によって基準が異なる場合があるため、特記仕様書を確認してください。",
  },
];

export default function ConstructionPhotoManagementPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "工事写真の撮り方・管理方法を完全解説｜電子黒板・分類のコツ・PHOTO.XML",
    datePublished: "2026-01-15",
    dateModified: "2026-04-06",
    author: { "@type": "Organization", name: "工事管理SaaS 編集部" },
    publisher: {
      "@type": "Organization",
      name: "工事管理SaaS",
      url: "https://kouji.soara-mu.jp",
    },
    url: "https://kouji.soara-mu.jp/guide/construction-photo-management",
  };

  return (
    <GuideLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <GuideBreadcrumb
        items={[
          { label: "ガイド一覧", href: "/guide" },
          { label: "工事写真の撮り方・管理方法" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約8分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        工事写真の撮り方・管理方法を完全解説
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          ｜電子黒板・分類のコツ・PHOTO.XML
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        公共工事では工事写真の撮影・管理が義務付けられています。
        「どこで何を撮ればいいか分からない」「写真整理に毎日1時間以上かかる」
        「電子納品の写真整理が大変」という現場の方に向けて、基本から電子納品対応まで体系的に解説します。
      </p>

      <TableOfContents items={TOC} />

      {/* 1. なぜ写真が重要か */}
      <section id="why-photo" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. なぜ工事写真が重要なのか
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工事写真は単なる記録ではなく、工事品質を証明するための重要な書類です。
          具体的には次の役割を果たします。
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {[
            {
              title: "出来形・品質の証明",
              desc: "配筋・コンクリート打設・防水など、後から確認できない隠れた部分を記録する唯一の証拠。",
            },
            {
              title: "検査での確認資料",
              desc: "段階確認検査・完成検査で監督員が施工状況を確認する際の資料として提出が求められる。",
            },
            {
              title: "トラブル時の証拠",
              desc: "施工不良クレーム・近隣トラブル・損害賠償請求に対して施工状況を証明できる。",
            },
            {
              title: "電子納品の構成要素",
              desc: "CALS/EC電子納品に必須。PHOTO.XMLと組み合わせて納品する。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-blue-50 rounded-xl p-4"
            >
              <p className="font-bold text-blue-800 text-sm mb-1">
                {item.title}
              </p>
              <p className="text-xs text-gray-700">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 何を撮るか */}
      <section id="what-to-shoot" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. 撮影すべき写真の種類と区分
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          国土交通省の「デジタル写真管理情報基準」では、写真の種類を次のように分類しています。
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">写真種別</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">内容</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">例</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["着手前・完成写真", "工事前後の状況", "全景・周辺状況"],
                ["施工状況写真", "施工中の状況", "配筋・型枠・打設"],
                ["安全管理写真", "安全対策の実施状況", "仮設・防護柵・標識"],
                ["品質管理写真", "品質管理のための確認", "スランプ試験・圧縮試験"],
                ["出来形管理写真", "寸法・数量の確認", "幅・高さ・延長の実測"],
                ["材料写真", "使用材料の確認", "JIS規格票・受入れ検査"],
                ["災害写真", "事故・被害の状況", "台風・地震被害"],
              ].map(([type, content, ex]) => (
                <tr key={type} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">{type}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">{content}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-600">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 leading-relaxed">
          各工種・区分で「施工前・施工中・施工後」の3ショットが基本セットです。
          撮影基準は工事ごとの「写真管理計画書」（施工計画書の一部）に定め、監督員の承認を得ておきましょう。
        </p>
      </section>

      {/* 3. 正しい撮影の基本 */}
      <section id="how-to-shoot" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. 正しい撮影の基本
        </h2>
        <div className="space-y-4">
          {[
            {
              title: "黒板（または電子黒板）を入れる",
              desc: "工種名・測定値・撮影日・撮影者を記入した黒板を写真内に収めます。黒板が読めないほど小さい・ぼやけているのはNG。写真の1/4〜1/3程度を黒板が占めるのが目安。",
            },
            {
              title: "全体と詳細をセットで撮る",
              desc: "全景写真と寸法確認のアップ写真の両方が必要です。どこを撮ったか分かるよう、周囲の状況が分かる写真を先に撮ってから詳細部をアップで撮影。",
            },
            {
              title: "逆光・ブレ・ピンボケを避ける",
              desc: "光源を背にして撮影する（被写体側に光を当てる）。スマホはタップでピントを合わせてから撮影。雨天時は水滴がレンズに付かないよう注意。",
            },
            {
              title: "スケール（巻き尺）を入れる",
              desc: "出来形確認写真では、実測値が分かるようスケールを当てた状態で撮影します。スケールの数値が鮮明に読めることを確認してから撮影。",
            },
            {
              title: "EXIF情報を活用する",
              desc: "スマホ・デジカメのGPS機能をONにして撮影すると、写真に撮影位置が記録されます。電子黒板アプリならこれが自動で記録されます。日付・時刻は必ず正確に設定。",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-1">
                ✓ {item.title}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 電子黒板 */}
      <section id="denshikokuban" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. 電子黒板（電子小黒板）の使い方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          電子黒板（電子小黒板）はスマホ・タブレット上に黒板情報をオーバーレイ表示して写真撮影できるアプリ機能です。
          従来の手書き黒板と比べてメリットがあります。
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            { merit: "文字が鮮明で読みやすい", demerit: "" },
            { merit: "書き直し不要（データ入力のみ）", demerit: "" },
            { merit: "工種・区分をテンプレートで管理", demerit: "" },
            { merit: "EXIF情報と連携して自動分類", demerit: "" },
          ].map((item) => (
            <div
              key={item.merit}
              className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2"
            >
              <span className="text-green-500 font-bold">✓</span>
              {item.merit}
            </div>
          ))}
        </div>

        <h3 className="font-bold text-gray-800 mb-2 text-sm">
          電子黒板に記入すべき項目
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {[
            "工事名称",
            "工種・種別・細別",
            "測定項目・規格値",
            "実測値",
            "撮影箇所",
            "撮影年月日",
            "受注会社名",
            "工事担当者名",
            "撮影区分（施工前/中/後）",
          ].map((item) => (
            <div
              key={item}
              className="bg-blue-50 text-blue-800 text-xs rounded-lg px-2.5 py-1.5 text-center font-medium"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="電子黒板機能付き工事写真管理アプリを無料で試す" />

      {/* 5. 分類・整理 */}
      <section id="classification" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. 工事写真の分類・整理方法
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          電子納品用のフォルダ構成に合わせて写真を整理します。
          国交省の基準では「PHOTO」フォルダ以下に工種別のサブフォルダを作成します。
        </p>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs mb-6 overflow-x-auto">
          <pre>{`PHOTO/
├── PIC/
│   ├── PHOT0001.JPG
│   ├── PHOT0002.JPG
│   └── ...
└── PHOTO.XML`}</pre>
        </div>
        <p className="text-gray-700 leading-relaxed mb-4">
          ファイル名は「PHOT」＋4桁の連番（例：PHOT0001.JPG）が基本ルールです。
          写真の分類情報はすべてPHOTO.XMLに記載するため、フォルダ分けではなくXMLで管理します。
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <strong>注意：</strong>ファイル名は大文字で記述します（PHOT0001.JPG）。小文字のphot0001.jpgは
          電子納品チェックで不合格になる場合があります。アプリを使うと自動で正しいファイル名が付きます。
        </div>
      </section>

      {/* 6. 写真台帳 */}
      <section id="photo-ledger" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. 写真台帳の作り方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          写真台帳とは、撮影した工事写真を一覧にまとめた書類です。
          監督員への提出書類として使用します。
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          従来のExcelによる写真台帳作成は、写真の貼り付け→説明文入力→印刷設定という
          繰り返し作業に多大な時間がかかります。100枚の写真で4〜8時間かかることも珍しくありません。
        </p>
        <div className="bg-blue-50 rounded-xl p-5">
          <h3 className="font-bold text-blue-800 mb-2">写真台帳に記載すべき項目</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>・ 工事名称・工事番号</li>
            <li>・ 工種・種別・細別</li>
            <li>・ 撮影区分（施工前・施工中・施工後）</li>
            <li>・ 撮影年月日・場所</li>
            <li>・ 写真（サムネイル）</li>
            <li>・ 写真説明（特記事項）</li>
            <li>・ 規格値・実測値（出来形管理写真）</li>
          </ul>
        </div>
      </section>

      {/* 7. PHOTO.XML */}
      <section id="photo-xml" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. PHOTO.XMLと電子納品
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          PHOTO.XMLは国土交通省「デジタル写真管理情報基準」で定められた
          写真メタデータファイルです。各写真の情報を格納します。
        </p>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs mb-4 overflow-x-auto">
          <pre>{`<?xml version="1.0" encoding="Shift_JIS"?>
<写真情報>
  <基礎情報>
    <発注者名>○○地方整備局</発注者名>
    <工事名>○○橋補修工事</工事名>
    <写真枚数>120</写真枚数>
  </基礎情報>
  <写真情報>
    <写真ファイル情報>
      <写真ファイル名>PHOT0001.JPG</写真ファイル名>
      <写真工種>コンクリート工</写真工種>
      <撮影区分>施工状況</撮影区分>
      <撮影年月日>20260115</撮影年月日>
    </写真ファイル情報>
  </写真情報>
</写真情報>`}</pre>
        </div>
        <p className="text-gray-700 leading-relaxed">
          PHOTO.XMLを手作業で作成するのは非常に手間がかかります。
          施工管理アプリなら、写真アップロード時に入力した情報からPHOTO.XMLを自動生成できます。
          電子納品に必要なZIPファイルもワンクリックで作成可能です。
        </p>
      </section>

      {/* 8. アプリ活用 */}
      <section id="app-benefits" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          8. アプリ活用で劇的に効率化
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工事写真管理アプリを使うと、次の作業が自動化・省力化されます。
        </p>
        <div className="space-y-3">
          {[
            {
              before: "写真をPCに転送して名前を変更",
              after: "スマホで撮影→即クラウド同期・自動ファイル名",
            },
            {
              before: "Excelに写真を1枚ずつ貼り付け",
              after: "ボタン1つで写真台帳PDF自動生成",
            },
            {
              before: "PHOTO.XMLを手作業で編集",
              after: "入力データからXML自動生成",
            },
            {
              before: "電子黒板を手書きして持参",
              after: "スマホの電子黒板オーバーレイで撮影",
            },
            {
              before: "写真の分類を手動でフォルダ整理",
              after: "工種・区分を選択→自動分類・自動命名",
            },
          ].map((item) => (
            <div key={item.before} className="grid sm:grid-cols-2 gap-2">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-gray-700">
                <span className="text-red-500 font-bold text-xs block mb-1">BEFORE</span>
                {item.before}
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-gray-700">
                <span className="text-green-600 font-bold text-xs block mb-1">AFTER</span>
                {item.after}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="工事写真管理をアプリで自動化する" />

      {/* FAQ */}
      <section id="faq" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          よくある質問
        </h2>
        <div className="space-y-4">
          {FAQ.map((f, i) => (
            <details
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <summary className="px-5 py-4 cursor-pointer font-bold text-gray-900 hover:bg-gray-50 text-sm">
                Q. {f.q}
              </summary>
              <div className="px-5 py-4 bg-blue-50 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
                A. {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      <AuthorBox />

      <RelatedArticles
        articles={[
          {
            href: "/guide/electronic-delivery",
            title: "電子納品とは？やり方・フォルダ構成を解説",
            description: "CALS/EC、PHOTO.XML、INDEX_C.XMLの作り方を解説",
          },
          {
            href: "/guide/public-works-bidding",
            title: "公共工事の入札方法を完全解説",
            description: "入札参加から落札・書類管理まで",
          },
          {
            href: "/guide/construction-management-app",
            title: "施工管理アプリ比較【2026年最新】",
            description: "写真管理に強いアプリの選び方",
          },
          {
            href: "/guide/daily-report-template",
            title: "工事日報の書き方ガイド",
            description: "記入例付きで分かりやすく解説",
          },
        ]}
      />
    </GuideLayout>
  );
}
