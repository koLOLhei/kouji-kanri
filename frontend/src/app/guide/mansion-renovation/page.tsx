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
  title: "マンション大規模修繕の進め方ガイド｜管理組合が知るべき全知識",
  description:
    "マンション大規模修繕の基本から管理組合の役割、業者選びのポイント、工事中のチェックポイントまでを網羅。施工管理DXで実現する透明性についても解説。",
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/mansion-renovation",
  },
};

const TOC = [
  { id: "what-is", label: "大規模修繕とは" },
  { id: "role", label: "管理組合の役割" },
  { id: "vendor-selection", label: "業者選びのポイント" },
  { id: "during-construction", label: "工事中のチェックポイント" },
  { id: "dx", label: "KAMOの施工管理システムで実現する透明性" },
  { id: "faq", label: "よくある質問（FAQ）" },
];

export default function MansionRenovationPage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "マンション大規模修繕の進め方ガイド｜管理組合が知るべき全知識",
    author: { "@type": "Organization", name: "工事管理SaaS 編集部" },
    publisher: { "@type": "Organization", name: "工事管理SaaS" },
    datePublished: "2026-04-12",
    dateModified: "2026-04-12",
    url: "https://kouji.soara-mu.jp/guide/mansion-renovation",
    description:
      "マンション大規模修繕の基本から管理組合の役割、業者選びのポイント、工事中のチェックポイントまでを網羅。施工管理DXで実現する透明性についても解説。",
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
          { label: "マンション大規模修繕の進め方" },
        ]}
      />

      {/* Hero */}
      <div className="mb-8">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
          大規模修繕
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
          マンション大規模修繕の進め方ガイド｜管理組合が知るべき全知識
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          公開日：2026年4月12日 ／ 読了時間：約12分
        </p>
      </div>

      <TableOfContents items={TOC} />

      {/* Section 1 */}
      <section id="what-is" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          大規模修繕とは
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          マンションの大規模修繕とは、建物の外壁・屋上・バルコニー・共用廊下など、
          経年劣化した部位を一斉に修繕する大規模な工事のことです。
          国土交通省のガイドラインでは<strong>12〜15年周期</strong>での実施が推奨されており、
          建物の長寿命化と資産価値の維持に欠かせない取り組みです。
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          主な修繕箇所は以下のとおりです。
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 mb-4 ml-2">
          <li>外壁塗装・タイル補修（建物の防水性・美観を維持）</li>
          <li>屋上・バルコニー防水（漏水防止に最重要）</li>
          <li>シーリング（コーキング）の打ち替え</li>
          <li>鉄部（手すり・フェンス）の錆止め・塗装</li>
          <li>共用廊下・階段の防水塗装</li>
          <li>給排水管の更新（第2回大規模修繕時に多い）</li>
        </ul>
        <p className="text-sm text-gray-700 leading-relaxed">
          50戸規模のマンションでは、1回の大規模修繕に<strong>5,000万〜1億円</strong>程度かかることも珍しくありません。
          そのため、長期修繕計画に基づく修繕積立金の積み立てと計画的な実施が不可欠です。
        </p>
      </section>

      {/* Section 2 */}
      <section id="role" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          管理組合の役割
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          大規模修繕は管理組合が主体となって進めます。一般的な流れは以下のとおりです。
        </p>

        <div className="space-y-4 mb-6">
          {[
            {
              step: "1",
              title: "修繕委員会の設置",
              desc: "理事会とは別に、大規模修繕専門の委員会を設置します。建築に詳しい区分所有者や外部の建築士を交えると効果的です。",
            },
            {
              step: "2",
              title: "建物診断の実施",
              desc: "劣化調査・建物診断を行い、修繕が必要な箇所を科学的に把握します。打診調査、赤外線調査、コア採取などが一般的です。",
            },
            {
              step: "3",
              title: "設計・監理業者の選定",
              desc: "施工業者とは独立したコンサルタント（設計監理者）を選定することで、第三者による品質チェックが可能になります。",
            },
            {
              step: "4",
              title: "施工業者の選定",
              desc: "複数の業者から見積を取得し、金額・実績・施工体制を比較して決定します。",
            },
            {
              step: "5",
              title: "住民説明会の開催",
              desc: "工事期間中の生活への影響（騒音・駐車場・ベランダの使用制限等）を事前に説明し、理解を得ます。",
            },
            {
              step: "6",
              title: "工事実施・完成検査",
              desc: "施工管理者と連携しながら定期的に進捗確認。完了後は竣工検査を実施し、引き渡しを受けます。",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="施工管理を透明化して、管理組合の負担を軽減" />

      {/* Section 3 */}
      <section id="vendor-selection" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          業者選びのポイント
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          大規模修繕の業者選びは、費用だけでなく施工実績・品質管理体制・透明性を重視することが重要です。
        </p>

        <div className="space-y-4">
          {[
            {
              title: "複数業者からの相見積もり",
              body: "最低3社から見積を取得します。金額が極端に安い業者は、材料のグレードを落としているか、追加工事で費用を増やす可能性があります。",
            },
            {
              title: "施工実績の確認",
              body: "同規模・同構造のマンションの施工実績を確認しましょう。竣工写真や施工管理記録を提示できる業者は信頼性が高いです。",
            },
            {
              title: "施工体制（直接施工か下請か）",
              body: "多重下請けになるほど品質管理が難しくなります。元請として直接施工する業者、または監理体制が整っている業者を選びましょう。",
            },
            {
              title: "アフターフォローと保証",
              body: "施工後の保証内容（期間・保証範囲）を確認します。塗装工事では10年保証、防水工事では10〜15年保証が目安です。",
            },
            {
              title: "コミュニケーションの透明性",
              body: "工事中の報告頻度・報告方法を事前に確認します。写真付きの進捗報告書を定期的に提出できる業者を選びましょう。",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-4">
              <p className="font-bold text-gray-900 text-sm mb-1.5">{item.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 */}
      <section id="during-construction" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          工事中のチェックポイント
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          工事が始まった後も、管理組合として定期的に確認することが重要です。
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {[
            {
              label: "進捗報告の確認",
              body: "週次または月次の進捗報告書を確認。計画工程との差異がないかをチェックします。",
            },
            {
              label: "写真記録の確認",
              body: "施工前・中・後の写真が適切に撮影・保管されているか確認。特に下地処理や防水層の写真は必須です。",
            },
            {
              label: "品質管理記録",
              body: "塗料の希釈率、防水材の使用量、乾燥時間などの品質管理記録が適切に付けられているか確認します。",
            },
            {
              label: "安全管理の確認",
              body: "足場の安全性、養生の適切さ、作業員の安全装備着用状況を現場巡回で確認します。",
            },
          ].map((item) => (
            <div key={item.label} className="border border-gray-200 rounded-xl p-4">
              <p className="font-bold text-gray-900 text-sm mb-1.5">{item.label}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-1">重要</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            竣工後に問題が発覚しても、施工中の記録がなければ責任の所在が不明確になります。
            写真・日報・品質管理記録は必ず保管させましょう。
          </p>
        </div>
      </section>

      {/* Section 5 */}
      <section id="dx" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          KAMOの施工管理システムで実現する透明性
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          株式会社KAMOでは、独自の施工管理システムを活用し、
          管理組合様に対してリアルタイムで工事の進捗を共有しています。
        </p>

        <div className="space-y-3 mb-6">
          {[
            "スマホで撮影した写真がGPS・日時付きで即座にクラウドへ",
            "工程の進捗状況をオンラインポータルからいつでも確認",
            "品質管理データ（塗料使用量・乾燥時間など）の自動記録",
            "日報・週報が自動生成され、管理組合に共有",
            "問い合わせ・相談はチャットで24時間対応",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-600 mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-900 mb-2">
            KAMO construction について詳しくはこちら
          </p>
          <p className="text-sm text-blue-700 mb-3">
            創業30年のKAMO constructionでは、東京・神奈川エリアの大規模修繕を多数手がけています。
            施工管理DXによる透明性の高い工事を提供しています。
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

      {/* Section 6 - FAQ */}
      <section id="faq" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          よくある質問（FAQ）
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "大規模修繕はいつ行えばいいですか？",
              a: "目安は築12〜15年ですが、外壁のひび割れ、タイルの浮き・剥離、防水の劣化などが見られた場合は早めに建物診断を受けることをお勧めします。",
            },
            {
              q: "大規模修繕の費用はどれくらいかかりますか？",
              a: "マンションの規模や劣化状況によって大きく異なります。50戸規模で5,000万〜1億円、100戸規模で1〜2億円が目安です。修繕積立金の残高と照らし合わせた計画が重要です。",
            },
            {
              q: "管理組合役員でなくても工事内容を確認できますか？",
              a: "KAMOの施工管理システムでは、区分所有者様向けの閲覧専用ポータルをご用意しています。工事の進捗写真や日報を随時確認していただけます。",
            },
            {
              q: "工事中の生活への影響はどのくらいありますか？",
              a: "足場設置期間中はバルコニーが使用制限される場合があります。騒音は平日の日中（8〜17時程度）に発生します。事前の住民説明会で詳細をご案内します。",
            },
            {
              q: "工事後の保証はどうなっていますか？",
              a: "塗装工事は10年、防水工事は10〜15年の保証を提供しています。保証期間中に不具合が発生した場合は、無償で補修対応します。",
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
            href: "/guide/exterior-painting",
            title: "戸建て外壁塗装の業者選びガイド｜失敗しない7つのポイント",
            description:
              "外壁塗装の業者選びで失敗しないための7つのポイントを解説。塗料の種類・見積書の見方も。",
          },
          {
            href: "/guide/transparent-construction",
            title: "工事の見える化とは？施工管理DXの全貌",
            description:
              "DXで変わる工事管理の全容。写真共有・報告書自動生成・品質管理がどう変わるかを解説。",
          },
          {
            href: "/guide/construction-photo-management",
            title: "工事写真の撮り方・管理方法を完全解説",
            description:
              "電子黒板・PHOTO.XML・写真台帳作成まで。写真管理を効率化する実践ガイド。",
          },
          {
            href: "/guide/quality-management",
            title: "出来形管理・品質管理とは？管理図の見方と作り方",
            description:
              "x̄-R管理図・ヒストグラム・工程能力指数の計算方法を実例を交えて解説。",
          },
        ]}
      />
    </GuideLayout>
  );
}
