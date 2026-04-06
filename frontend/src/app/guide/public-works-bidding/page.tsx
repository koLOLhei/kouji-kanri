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
  title: "【初心者向け】公共工事の入札方法を完全解説｜必要な準備から落札まで",
  description:
    "公共工事の入札を初めて受ける建設会社向けに、建設業許可・経審取得から入札参加資格申請、一般競争入札・指名競争入札の違い、落札のコツまでを分かりやすく解説します。",
  keywords: [
    "公共工事 入札 方法",
    "公共工事 入札 初めて",
    "公共工事 必要書類",
    "経審 とは",
    "建設業許可",
    "入札参加資格",
  ],
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/public-works-bidding",
  },
};

const TOC = [
  { id: "what-is-public-works", label: "公共工事とは" },
  { id: "required-qualifications", label: "入札に必要な資格・許可" },
  { id: "keishin", label: "経営事項審査（経審）とは" },
  { id: "participation-application", label: "入札参加資格申請の流れ" },
  { id: "types-of-bidding", label: "入札の種類（一般競争・指名競争・随意契約）" },
  { id: "bidding-flow", label: "入札から落札・契約までの流れ" },
  { id: "winning-tips", label: "落札のコツ" },
  { id: "document-management", label: "受注後の書類管理" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "建設業許可なしで公共工事は受注できますか？",
    a: "1件の請負金額が500万円（建築一式は1,500万円）未満の軽微な建設工事であれば建設業許可は不要です。ただし、多くの発注機関では入札参加資格の要件として建設業許可を必須としているため、実質的に許可取得が必要なケースがほとんどです。",
  },
  {
    q: "経審はどこで受ければいいですか？",
    a: "許可を受けた都道府県知事または国土交通大臣に申請します。建設業許可行政庁と同じ窓口で受付けています。申請は通常、決算後4ヶ月以内に行います。",
  },
  {
    q: "入札参加資格の申請はどのくらい前に準備すればよいですか？",
    a: "発注機関ごとに申請受付期間が異なります。国・都道府県は概ね2年に1度の定期申請（競争参加資格）があり、締切の半年以上前から準備を始めるのが安全です。随時申請を受け付けている機関もあります。",
  },
  {
    q: "落札率はどのくらいが目安ですか？",
    a: "低入札価格調査基準があるため、設計金額の70〜75%を下回ると失格になる場合があります。一方で高すぎると落札できません。同種工事の過去の落札事例を調べ、85〜92%程度を目安に積算するケースが多いです。",
  },
  {
    q: "JV（共同企業体）で入札するメリットは何ですか？",
    a: "単体では技術点や経営規模が不足する場合でも、他社と組むことで要件を満たせます。大規模工事での実績作り、技術・資金リスク分散というメリットがあります。構成比率や代表者の決め方は契約書（協定書）で定めます。",
  },
];

export default function PublicWorksBiddingPage() {
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
    headline:
      "【初心者向け】公共工事の入札方法を完全解説｜必要な準備から落札まで",
    datePublished: "2026-01-10",
    dateModified: "2026-04-06",
    author: { "@type": "Organization", name: "工事管理SaaS 編集部" },
    publisher: {
      "@type": "Organization",
      name: "工事管理SaaS",
      url: "https://kouji.soara-mu.jp",
    },
    description:
      "公共工事の入札を初めて受ける建設会社向けに、建設業許可・経審取得から入札参加資格申請、一般競争入札・指名競争入札の違い、落札のコツまでを解説",
    url: "https://kouji.soara-mu.jp/guide/public-works-bidding",
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
          { label: "公共工事の入札方法" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約10分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        【初心者向け】公共工事の入札方法を完全解説
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          ｜必要な準備から落札まで
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        「公共工事を受注したいが、何から始めればいいのか分からない」という建設会社の方向けに、
        建設業許可の取得から経営事項審査（経審）、入札参加資格申請、入札当日の流れ、落札後の書類管理まで
        一連のプロセスをステップごとに解説します。
      </p>

      <TableOfContents items={TOC} />

      {/* 1. 公共工事とは */}
      <section id="what-is-public-works" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. 公共工事とは
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          公共工事とは、国・都道府県・市区町村などの公共機関が発注する建設工事のことです。
          道路、橋梁、学校、庁舎、公営住宅など、税金で整備されるインフラ・施設の建設・改修が対象となります。
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          民間工事と比較した公共工事の主な特徴は次のとおりです。
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-800">
                  項目
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-800">
                  公共工事
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-800">
                  民間工事
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["発注者", "国・地方公共団体", "民間企業・個人"],
                ["発注方法", "競争入札が原則", "任意の業者と交渉"],
                ["代金の安全性", "高い（税金が原資）", "倒産リスクあり"],
                ["書類・検査", "厳格（国交省基準）", "発注者による"],
                ["電子納品", "多くの機関で義務", "原則任意"],
              ].map(([item, pub, priv]) => (
                <tr key={item} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800">
                    {item}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">
                    {pub}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">
                    {priv}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 leading-relaxed">
          公共工事は代金回収リスクが低く、実績を積むことで経審点数が向上し、より大きな工事に参加できるようになるため、
          建設会社にとって重要な受注源となっています。
        </p>
      </section>

      {/* 2. 必要な資格 */}
      <section id="required-qualifications" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. 入札に必要な資格・許可
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          公共工事の入札に参加するには、主に次の3段階の資格・許可が必要です。
        </p>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-5">
            <h3 className="font-bold text-blue-800 mb-2">
              ① 建設業許可（建設業法）
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              請負金額500万円以上（建築一式は1,500万円以上）の建設工事を受注するために必要な許可です。
              知事許可（1都道府県のみ営業）と大臣許可（2都道府県以上で営業）があります。
              申請から許可まで、標準処理期間は知事許可で約30日、大臣許可で約90日かかります。
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-5">
            <h3 className="font-bold text-green-800 mb-2">
              ② 経営事項審査（経審）
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              公共工事を直接受注するために必ず受けなければならない審査です。
              完成工事高・経営規模・技術職員数・財務状況などを点数化し、「総合評定値（P点）」が算出されます。
              P点が高いほど大きな工事の入札に参加できます。審査結果の有効期間は申請日から1年7ヶ月間。
            </p>
          </div>
          <div className="bg-orange-50 rounded-xl p-5">
            <h3 className="font-bold text-orange-800 mb-2">
              ③ 入札参加資格申請（競争参加資格）
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              各発注機関（国・都道府県・市区町村）に対して個別に申請する資格です。
              経審の結果や財務状況、施工実績などを審査され、等級（A・B・C・D）が格付けされます。
              工事規模に応じて入札できる等級が決まります。
            </p>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed">
          これら3つを順番に取得することで、公共工事の入札に参加できるようになります。
          建設業許可→経審→入札参加資格申請の順に進めましょう。
        </p>
      </section>

      {/* 3. 経審 */}
      <section id="keishin" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. 経営事項審査（経審）とは
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          経営事項審査（経審）は、公共工事の入札参加資格を得るために必要な審査制度です。
          建設業許可を受けた業者が、決算ごとに申請します。
        </p>
        <h3 className="font-bold text-gray-800 mb-2">評価の5項目</h3>
        <div className="space-y-2 mb-6">
          {[
            { label: "X（経営規模）", desc: "完成工事高、自己資本額、平均利益額" },
            { label: "Y（経営状況）", desc: "純支払利息比率、負債回転期間、売上高経常利益率など8指標" },
            { label: "Z（技術力）", desc: "技術職員数（一級・二級建築士、施工管理技士など）、元請完成工事高" },
            { label: "W（社会性等）", desc: "雇用保険・健康保険・厚生年金加入、建設業退職金共済制度加入など" },
            { label: "P（総合評定値）", desc: "X・Y・Z・Wを加重平均した総合点" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex gap-3 border border-gray-200 rounded-lg p-3"
            >
              <span className="font-bold text-blue-700 text-sm w-36 flex-shrink-0">
                {item.label}
              </span>
              <span className="text-sm text-gray-700">{item.desc}</span>
            </div>
          ))}
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700">
          <strong>ポイント：</strong>
          経審のP点を上げる最も効果的な方法は、①完成工事高を増やす（実績を積む）、
          ②一級施工管理技士など有資格者を増やす、③保険類をすべて加入する、です。
          P点は毎年更新され、有効期間は1年7ヶ月です。
        </div>
      </section>

      {/* 4. 入札参加資格申請 */}
      <section id="participation-application" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. 入札参加資格申請の流れ
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          各発注機関に対して「競争参加資格」を申請します。発注機関ごとに申請方法・時期が異なります。
        </p>
        <ol className="space-y-4 mb-6">
          {[
            {
              step: "1",
              title: "申請する発注機関を決める",
              desc: "国（各省庁・地方整備局）、都道府県、市区町村のどこに申請するかを決めます。複数の機関に申請可能です。",
            },
            {
              step: "2",
              title: "申請受付期間を確認する",
              desc: "定期申請（2年に1度）の受付期間は機関によって異なります。国交省関係は「一般競争（指名競争）参加資格審査申請」として電子申請が主流。",
            },
            {
              step: "3",
              title: "必要書類を準備する",
              desc: "経審の結果通知書、財務諸表（直近2年分）、工事実績一覧、登記簿謄本、納税証明書、技術者名簿など。",
            },
            {
              step: "4",
              title: "電子申請（または窓口申請）",
              desc: "国・都道府県はほぼ電子申請対応。市区町村は窓口持参が多い。申請ポータルにID登録後、フォームに入力して送信。",
            },
            {
              step: "5",
              title: "審査・格付け結果の通知",
              desc: "審査完了後、等級（A・B・C・D）が格付けされた資格認定通知書が届きます。有効期間は通常2年間。",
            },
          ].map((item) => (
            <li
              key={item.step}
              className="flex gap-4 bg-gray-50 rounded-xl p-4"
            >
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <CtaBanner text="公共工事の書類管理を自動化しませんか？" />

      {/* 5. 入札の種類 */}
      <section id="types-of-bidding" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. 入札の種類
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          公共工事の発注方式には主に3種類あります。
        </p>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-gray-900 mb-1">
              一般競争入札（最も一般的）
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              資格を持つすべての業者が参加できる入札です。公告期間（10日以上）中に参加申請を行い、
              入札日に各社が価格を提示し、予定価格の範囲内で最低価格を提示した業者が落札します。
              透明性が高く、現在の公共工事の主流方式です。
              総合評価落札方式では価格だけでなく技術提案書も評価されます。
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-bold text-gray-900 mb-1">指名競争入札</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              発注者が数社を指名して競争させる方式です。250万円以下の小規模工事や、
              特殊な技術が必要な工事で使われます。指名されるためには日頃からの実績・信頼関係が重要です。
            </p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <h3 className="font-bold text-gray-900 mb-1">随意契約</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              特定の業者と競争なしに契約する方式です。緊急工事、少額工事（250万円以下）、
              特許工法を使う工事などに限定されます。
            </p>
          </div>
        </div>
      </section>

      {/* 6. 入札の流れ */}
      <section id="bidding-flow" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. 入札から落札・契約までの流れ
        </h2>
        <div className="space-y-3">
          {[
            "発注機関が入札公告を掲示（電子入札システム・公式サイト）",
            "入札参加申請・参加資格確認（設計図書・仕様書を入手）",
            "設計図書の内容確認・現場説明会への参加（必要な場合）",
            "積算・見積り（材料費・労務費・経費を積み上げ）",
            "入札書の提出（電子入札または書面）",
            "開札・落札者決定（最低価格かつ予定価格以下の業者）",
            "低入札価格調査（最低価格が調査基準価格を下回る場合）",
            "請負契約の締結（契約書・工事請負契約書）",
            "着工届・工事着手（施工計画書提出など）",
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. 落札のコツ */}
      <section id="winning-tips" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. 落札のコツ
        </h2>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-1">
              ① 過去の落札事例を徹底調査
            </h3>
            <p className="text-sm text-gray-700">
              各発注機関のウェブサイトや電子入札システムで過去の落札金額・落札率を調べましょう。
              同種・類似工事の落札率分布から適正な入札価格帯を把握できます。
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-1">
              ② 積算の精度を上げる
            </h3>
            <p className="text-sm text-gray-700">
              材料費・労務費・経費を正確に積み上げる精度が落札率を安定させます。
              公共工事設計労務単価（国交省発表）を参考に、地域の実勢価格も反映させましょう。
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-1">
              ③ 総合評価の技術提案書を磨く
            </h3>
            <p className="text-sm text-gray-700">
              総合評価落札方式では、価格点＋技術評価点で落札者が決まります。
              過去の施工実績・品質管理の取り組み・環境配慮を具体的に提案することで技術点を上げられます。
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-1">
              ④ 低入札価格調査基準に注意
            </h3>
            <p className="text-sm text-gray-700">
              設計金額の70〜75%を下回る入札は低入札価格調査の対象となり、
              調査の結果、失格となる場合があります。「安すぎる入札」は禁物です。
            </p>
          </div>
        </div>
      </section>

      {/* 8. 受注後の書類管理 */}
      <section id="document-management" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          8. 受注後の書類管理
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          公共工事を落札・着工した後は、多数の書類を適切に作成・管理する必要があります。
          主な書類は次のとおりです。
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            "施工計画書",
            "工事打合簿",
            "施工体制台帳",
            "施工体系図",
            "工事日報",
            "安全管理計画書",
            "品質管理計画書",
            "工事写真台帳",
            "出来形管理図",
            "材料承認申請書",
            "段階確認記録",
            "完成図書（電子納品）",
          ].map((doc) => (
            <div
              key={doc}
              className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 rounded-lg px-3 py-2"
            >
              <span className="text-blue-500 text-xs">✓</span>
              {doc}
            </div>
          ))}
        </div>
        <p className="text-gray-700 leading-relaxed">
          これらの書類をExcelや紙で管理すると多大な工数がかかります。
          施工管理アプリを活用することで、書類作成時間を大幅に削減できます。
        </p>
      </section>

      <CtaBanner text="30種類以上の公共工事書類を自動生成" />

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
            description:
              "CALS/EC、PHOTO.XML、INDEX_C.XMLの作り方を初心者向けに解説",
          },
          {
            href: "/guide/construction-photo-management",
            title: "工事写真の撮り方・管理方法を完全解説",
            description:
              "電子黒板の使い方、写真分類のコツ、写真台帳の作り方",
          },
          {
            href: "/guide/daily-report-template",
            title: "【無料テンプレート】工事日報の書き方ガイド",
            description: "記入例付きで工事日報の書き方を分かりやすく解説",
          },
          {
            href: "/guide/construction-management-app",
            title: "施工管理アプリ比較【2026年最新】",
            description: "中小建設会社向けの施工管理アプリ選び方ガイド",
          },
        ]}
      />
    </GuideLayout>
  );
}
