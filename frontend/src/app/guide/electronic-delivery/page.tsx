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
    "電子納品とは？やり方・フォルダ構成・PHOTO.XMLを初心者向けに解説",
  description:
    "公共工事の電子納品（CALS/EC）の基本から、フォルダ構成・PHOTO.XML・INDEX_C.XMLの作り方、電子納品チェックまで分かりやすく解説します。初めて電子納品する方向けの完全ガイドです。",
  keywords: [
    "電子納品 やり方",
    "電子納品 ソフト",
    "CALS/EC",
    "PHOTO.XML",
    "INDEX_C.XML",
    "電子納品 フォルダ構成",
    "電子納品 初めて",
  ],
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/electronic-delivery",
  },
};

const TOC = [
  { id: "what-is", label: "電子納品とは（CALS/EC）" },
  { id: "target-works", label: "電子納品が必要な工事" },
  { id: "folder-structure", label: "電子納品のフォルダ構成" },
  { id: "required-files", label: "必要なファイルと作成方法" },
  { id: "photo-xml", label: "PHOTO.XMLの作り方" },
  { id: "index-xml", label: "INDEX_C.XMLの作り方" },
  { id: "check-tools", label: "電子納品チェックツール" },
  { id: "submission-flow", label: "提出（納品）の流れ" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "電子納品はすべての公共工事で必要ですか？",
    a: "発注機関や工事規模によって異なります。国土交通省直轄工事では原則として電子納品が必要です。都道府県・市区町村発注工事は機関によって異なるため、特記仕様書で確認してください。近年は小規模工事でも電子納品を求める機関が増えています。",
  },
  {
    q: "電子納品はCDに焼いて提出するのですか？",
    a: "以前はCD-R/DVD-Rに焼いて提出するのが一般的でしたが、現在は電子納品データをオンラインポータル（CALS/EC電子入札コアシステムなど）を通じて提出する方式に移行しています。ただし発注機関によってはまだCD-R提出を求める場合もあります。",
  },
  {
    q: "PHOTO.XMLは手作業で作れますか？",
    a: "テキストエディタで作成することは技術的には可能ですが、写真が100枚を超える場合は現実的ではありません。国土交通省が提供する「電子納品作成支援ツール」や、施工管理アプリを使うのが実用的です。",
  },
  {
    q: "文字コードはどれを使えばよいですか？",
    a: "国交省の電子納品基準ではShift_JIS（SJIS）が指定されています。XMLファイルをUTF-8で保存すると電子納品チェックで不合格になるため注意が必要です。",
  },
  {
    q: "電子納品チェックで不合格になったらどうすればよいですか？",
    a: "チェックツールのエラーメッセージを確認し、対象ファイルを修正します。よくあるエラーは「ファイル名の大文字・小文字の誤り」「XMLの文字コード誤り」「必須タグの欠落」などです。修正後に再チェックして全項目合格してから納品します。",
  },
];

export default function ElectronicDeliveryPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <GuideLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <GuideBreadcrumb
        items={[
          { label: "ガイド一覧", href: "/guide" },
          { label: "電子納品のやり方" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約9分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        電子納品とは？やり方・フォルダ構成・PHOTO.XMLを
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          初心者向けに解説
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        「電子納品って何をどこに提出すればいいの？」「PHOTO.XMLが作れない」
        「電子納品チェックで何度も不合格になる」という方に向けて、
        CALS/ECの基本概念からフォルダ構成・XML作成・チェックまで一連の流れを解説します。
      </p>

      <TableOfContents items={TOC} />

      {/* 1. 電子納品とは */}
      <section id="what-is" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. 電子納品とは（CALS/EC）
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          電子納品とは、公共工事の完成時に紙の書類の代わりに、電子データで書類・写真を納品することです。
          国土交通省が推進する<strong>CALS/EC（公共事業支援統合情報システム）</strong>の一環として進められています。
        </p>
        <div className="bg-blue-50 rounded-xl p-5 mb-4">
          <h3 className="font-bold text-blue-800 mb-2">CALS/ECとは</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong>CALS</strong>（Continuous Acquisition and Life-cycle Support）＋
            <strong>EC</strong>（Electronic Commerce）の略。
            公共事業の調査・設計から施工・維持管理まで、建設データを電子化して共有・活用する国のシステムです。
            電子納品はこのシステムへのデータ提供に当たります。
          </p>
        </div>
        <p className="text-gray-700 leading-relaxed">
          電子納品によって、発注機関は紙保管スペースが不要になり、将来の維持管理時にデータを再利用できます。
          受注者にとっても、電子化することで書類の紛失リスクが下がります。
        </p>
      </section>

      {/* 2. 対象工事 */}
      <section id="target-works" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. 電子納品が必要な工事
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          電子納品の義務付けは発注機関と工事規模によって異なります。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">発注機関</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">電子納品の扱い</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["国土交通省直轄工事", "原則として電子納品必須"],
                ["都道府県発注工事", "多くの都道府県で実施中（要確認）"],
                ["市区町村発注工事", "機関によって異なる（特記仕様書確認）"],
                ["独立行政法人・公社", "機関ごとに基準が異なる"],
              ].map(([org, req]) => (
                <tr key={org} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">{org}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">{req}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 mt-3 text-sm">
          ※ 特記仕様書の「電子納品」条項を必ず確認してください。「電子納品を行う」と記載がある場合は義務です。
        </p>
      </section>

      {/* 3. フォルダ構成 */}
      <section id="folder-structure" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. 電子納品のフォルダ構成
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          電子納品では、国土交通省が定めた統一フォルダ構成でデータを整理します。
          建築工事編の基本的なフォルダ構成は次のとおりです。
        </p>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs mb-4 overflow-x-auto">
          <pre>{`工事番号_工事名/
├── INDEX_C.XML          ← 工事管理ファイル（必須）
├── PLAN/               ← 施工計画書等
│   ├── 施工計画書.pdf
│   └── PLAN.XML
├── DRAW/               ← 図面（竣工図）
│   ├── *.P21
│   └── DRAW.XML
├── PHOTO/              ← 写真データ（必須）
│   ├── PIC/
│   │   ├── PHOT0001.JPG
│   │   ├── PHOT0002.JPG
│   │   └── ...
│   └── PHOTO.XML
├── MEET/               ← 打合簿
│   ├── *.pdf
│   └── MEET.XML
└── OTHRS/              ← その他資料
    └── OTHRS.XML`}</pre>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700">
          <strong>重要：</strong>フォルダ名・ファイル名はすべて<strong>半角大文字英数字</strong>で統一します。
          日本語のフォルダ名や小文字は電子納品チェックで不合格となります。
        </div>
      </section>

      {/* 4. 必要ファイル */}
      <section id="required-files" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. 必要なファイルと作成方法
        </h2>
        <div className="space-y-4">
          {[
            {
              file: "INDEX_C.XML",
              desc: "工事の基本情報を格納するファイル。工事名、発注者名、工期、業者情報などを記載。",
              how: "電子納品作成支援ツールまたは施工管理アプリで自動生成",
            },
            {
              file: "PHOTO.XML",
              desc: "写真のメタデータを格納するファイル。各写真の工種・撮影区分・撮影日などを記載。",
              how: "施工管理アプリで写真アップロード時に自動生成",
            },
            {
              file: "竣工図面（*.P21）",
              desc: "SXF形式（P21またはSFC）で作成した竣工図面。CADソフトで作成。",
              how: "対応CADソフト（AutoCAD、JW-CADなど）でSXF形式エクスポート",
            },
            {
              file: "工事打合簿・施工計画書（PDF）",
              desc: "紙書類をスキャンしたPDF、またはPDF直接出力。",
              how: "スキャナーでPDF化、またはWordからPDF出力",
            },
          ].map((item) => (
            <div
              key={item.file}
              className="border border-gray-200 rounded-xl p-4"
            >
              <p className="font-bold text-blue-700 text-sm mb-1 font-mono">
                {item.file}
              </p>
              <p className="text-sm text-gray-700 mb-2">{item.desc}</p>
              <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                作成方法：{item.how}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="電子納品に必要なXMLを自動生成する" />

      {/* 5. PHOTO.XML */}
      <section id="photo-xml" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. PHOTO.XMLの作り方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          PHOTO.XMLの主要な構造と各タグの意味を解説します。
        </p>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs mb-4 overflow-x-auto">
          <pre>{`<?xml version="1.0" encoding="Shift_JIS"?>
<!DOCTYPE 工事写真情報 SYSTEM "PHOTO04.DTD">
<工事写真情報>
  <基礎情報>
    <発注者名>○○地方整備局</発注者名>
    <工事名>○○橋補修工事</工事名>
    <工事番号>2025-001</工事番号>
    <受注者名>株式会社○○建設</受注者名>
    <写真枚数>150</写真枚数>
    <ソフトウェア名>工事管理SaaS</ソフトウェア名>
  </基礎情報>
  <写真情報>
    <写真ファイル情報>
      <写真ファイル名>PHOT0001.JPG</写真ファイル名>
      <写真工種>コンクリート工</写真工種>
      <写真種別>施工状況写真</写真種別>
      <撮影箇所>A1橋台</撮影箇所>
      <撮影区分>施工中</撮影区分>
      <撮影年月日>20260115</撮影年月日>
      <写真特記事項>コンクリート打設状況</写真特記事項>
    </写真ファイル情報>
  </写真情報>
</工事写真情報>`}</pre>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-gray-700">
          <strong>よくあるミス：</strong>文字コードをUTF-8で保存してしまうエラーが最多です。
          必ず<strong>Shift_JIS</strong>で保存してください。施工管理アプリを使えばこのミスがなくなります。
        </div>
      </section>

      {/* 6. INDEX_C.XML */}
      <section id="index-xml" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. INDEX_C.XMLの作り方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          INDEX_C.XMLは工事管理ファイルとも呼ばれ、納品データ全体の目次に当たります。
          フォルダ構成・収録データ・工事情報を記載します。
        </p>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs mb-4 overflow-x-auto">
          <pre>{`<?xml version="1.0" encoding="Shift_JIS"?>
<!DOCTYPE 工事管理ファイル SYSTEM "INDEX_C04.DTD">
<工事管理ファイル>
  <基礎情報>
    <発注者名>○○地方整備局</発注者名>
    <工事名>○○橋補修工事</工事名>
    <工事番号>2025-001</工事番号>
    <工事場所>○○県○○市</工事場所>
    <工期開始>20250401</工期開始>
    <工期終了>20260331</工期終了>
    <受注者名>株式会社○○建設</受注者名>
  </基礎情報>
  <ソフト情報>
    <ソフトウェア名>工事管理SaaS</ソフトウェア名>
  </ソフト情報>
</工事管理ファイル>`}</pre>
        </div>
      </section>

      {/* 7. チェックツール */}
      <section id="check-tools" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. 電子納品チェックツール
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          納品前に電子納品チェックツールで合否を確認します。
          国土交通省が提供する「電子納品チェックシステム」が主に使われます。
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-gray-800 mb-2 text-sm">
            よくあるチェックエラーと対処法
          </h3>
          <div className="space-y-2">
            {[
              {
                error: "ファイル名に小文字が含まれる",
                fix: "すべて半角大文字に変更（PHOT0001.JPG）",
              },
              {
                error: "XMLの文字コードがUTF-8",
                fix: "Shift_JISで保存し直す",
              },
              {
                error: "必須タグが欠落している",
                fix: "DTDファイルで必須タグを確認して追加",
              },
              {
                error: "写真枚数とXMLの記載枚数が一致しない",
                fix: "PHOTO.XMLの「写真枚数」タグを実際の枚数に修正",
              },
              {
                error: "日付フォーマットが誤り",
                fix: "「yyyymmdd」形式に統一（20260115）",
              },
            ].map((item) => (
              <div
                key={item.error}
                className="flex gap-3 items-start text-sm"
              >
                <span className="text-red-500 font-bold flex-shrink-0">✕</span>
                <span className="text-red-700">{item.error}</span>
                <span className="text-gray-400 flex-shrink-0">→</span>
                <span className="text-green-700">{item.fix}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. 提出の流れ */}
      <section id="submission-flow" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          8. 提出（納品）の流れ
        </h2>
        <ol className="space-y-3">
          {[
            "施工中に写真・書類データを随時整理（施工管理アプリで管理が便利）",
            "竣工後、全データを電子納品基準のフォルダ構成に整理",
            "PHOTO.XMLおよびINDEX_C.XMLを作成（またはアプリで自動生成）",
            "電子納品チェックツールで全項目合格を確認",
            "電子納品データをZIPファイルにまとめる",
            "発注機関の指定方法で提出（オンラインポータルまたはCD-R）",
            "発注機関による受領確認・完成検査",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700">{item}</p>
            </li>
          ))}
        </ol>
      </section>

      <CtaBanner text="電子納品ZIPを自動生成する施工管理アプリを試す" />

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
            href: "/guide/construction-photo-management",
            title: "工事写真の撮り方・管理方法を完全解説",
            description: "電子黒板・PHOTO.XMLの作り方を詳しく解説",
          },
          {
            href: "/guide/public-works-bidding",
            title: "公共工事の入札方法を完全解説",
            description: "入札参加資格から落札まで",
          },
          {
            href: "/guide/quality-management",
            title: "出来形管理・品質管理とは？",
            description: "管理図の見方と作り方を解説",
          },
          {
            href: "/guide/construction-management-app",
            title: "施工管理アプリ比較【2026年最新】",
            description: "電子納品対応アプリの選び方",
          },
        ]}
      />
    </GuideLayout>
  );
}
