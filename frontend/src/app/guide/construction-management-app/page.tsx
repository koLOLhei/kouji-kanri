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
    "【2026年最新】施工管理アプリ比較｜中小建設会社におすすめの無料アプリ",
  description:
    "ANDPAD・蔵衛門・Photorectionなど主要施工管理アプリを機能・料金・使いやすさで比較。公共工事・電子納品に対応した中小建設会社向けアプリの選び方を解説します。",
  keywords: [
    "施工管理アプリ 無料",
    "施工管理 アプリ 比較",
    "ANDPAD",
    "蔵衛門",
    "Photoruction",
    "施工管理アプリ 中小企業向け",
    "工事写真管理 アプリ",
    "公共工事 書類作成",
  ],
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/construction-management-app",
  },
};

const TOC = [
  { id: "market-overview", label: "施工管理アプリ市場の現状" },
  { id: "selection-criteria", label: "アプリ選びの重要ポイント" },
  { id: "comparison", label: "主要アプリの機能比較" },
  { id: "kouji-saas", label: "工事管理SaaSの特徴" },
  { id: "andpad", label: "ANDPADの特徴" },
  { id: "kurae-mon", label: "蔵衛門の特徴" },
  { id: "photoruction", label: "Photorectionの特徴" },
  { id: "how-to-choose", label: "会社規模・工事種別別おすすめ" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "無料で使える施工管理アプリはありますか？",
    a: "はい、あります。工事管理SaaSはフリープランで案件3件・ユーザー5名まで完全無料で使えます。写真管理・日報管理・書類自動生成の基本機能が含まれます。ANDPADや蔵衛門も一部機能を無料トライアルで試せますが、フリープランは工事管理SaaSが最も機能が充実しています。",
  },
  {
    q: "公共工事の電子納品に対応したアプリはどれですか？",
    a: "工事管理SaaSはPHOTO.XML・INDEX_C.XML自動生成・電子納品ZIP出力に対応しています。蔵衛門も電子納品機能を持ちますが、別途オプション料金が必要なケースがあります。ANDPADは電子納品専用機能は限定的です。",
  },
  {
    q: "スマホだけで使える施工管理アプリはありますか？",
    a: "ほぼすべての施工管理アプリがスマートフォン（iOS・Android）に対応しています。工事管理SaaSはPWA対応でアプリインストール不要、オフラインでも写真撮影ができます。",
  },
  {
    q: "アプリの導入費用はどのくらいかかりますか？",
    a: "初期費用は0〜50万円程度（研修・設定費用含む）、月額費用は1ユーザーあたり3,000〜10,000円程度が相場です。工事管理SaaSはスタンダードプランが月29,800円（ユーザー30名まで）で、中小建設会社に最も手頃です。",
  },
  {
    q: "既存のExcelデータを移行できますか？",
    a: "多くのアプリがCSVインポート機能を持っています。工事管理SaaS・ANDPADともにCSV取込に対応しています。ただし書類フォーマットはアプリごとに異なるため、完全な移行には調整が必要な場合があります。",
  },
];

export default function ConstructionManagementAppPage() {
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
          { label: "施工管理アプリ比較" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約12分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        【2026年最新】施工管理アプリ比較
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          ｜中小建設会社におすすめの無料アプリ
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        施工管理アプリの導入を検討しているが、種類が多すぎてどれを選べばよいか分からないという方に向けて、
        主要4アプリを公平・客観的に比較します。
        特に公共工事・電子納品・書類自動生成を重視する中小建設会社・職人の方に参考になる内容です。
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700 mb-8">
        <strong>本記事の公平性について：</strong>
        本記事は各アプリの公式情報・利用者レビュー・各社の公開仕様に基づき執筆しています。
        筆者は工事管理SaaSを運営していますが、他社アプリについても客観的な情報を提供するよう努めています。
      </div>

      <TableOfContents items={TOC} />

      {/* 1. 市場概況 */}
      <section id="market-overview" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. 施工管理アプリ市場の現状
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          建設業の2024年問題（時間外労働規制）を背景に、施工管理のデジタル化が急速に進んでいます。
          国土交通省の「建設業DX推進」施策もあり、中小建設会社でもアプリ導入が一般化しつつあります。
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          現在の主要アプリは大きく3つのカテゴリに分かれます。
        </p>
        <div className="grid gap-3 mb-4">
          {[
            {
              cat: "総合施工管理型",
              desc: "工程・原価・書類・安全など施工管理全体を網羅。大手〜中堅企業向け。",
              ex: "ANDPAD、Photoruction",
            },
            {
              cat: "写真管理特化型",
              desc: "工事写真の撮影・分類・台帳作成・電子納品に特化。現場作業員が使いやすい。",
              ex: "蔵衛門、PhotoManager",
            },
            {
              cat: "公共工事対応型",
              desc: "公共工事の書類自動生成・電子納品・CALS/EC対応を強化。",
              ex: "工事管理SaaS",
            },
          ].map((item) => (
            <div
              key={item.cat}
              className="border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-gray-900 text-sm">{item.cat}</p>
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  例：{item.ex}
                </span>
              </div>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 選び方 */}
      <section id="selection-criteria" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. アプリ選びの重要ポイント
        </h2>
        <div className="space-y-3">
          {[
            {
              point: "公共工事・電子納品への対応",
              desc: "PHOTO.XML・INDEX_C.XML自動生成、CALS/EC対応フォルダ出力の有無を確認。民間工事しかやらない場合は不要。",
              importance: "高",
            },
            {
              point: "書類自動生成機能",
              desc: "工事打合簿・施工体制台帳・品質管理表などが自動生成できるか。Excelエクスポート対応かどうかも確認。",
              importance: "高",
            },
            {
              point: "モバイル対応・使いやすさ",
              desc: "現場作業員がスマホで写真を撮れるか、直感的に操作できるかが定着率に直結。",
              importance: "高",
            },
            {
              point: "料金体系",
              desc: "ユーザー数課金かプロジェクト数課金か。中小企業は総ユーザー数が少ないのでユーザー数課金が割安なことが多い。",
              importance: "中",
            },
            {
              point: "サポート体制",
              desc: "電話・チャットサポートの有無。公共工事の書類に関する質問に答えられるか。",
              importance: "中",
            },
          ].map((item) => (
            <div
              key={item.point}
              className="flex gap-4 bg-gray-50 rounded-xl p-4"
            >
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full h-fit flex-shrink-0 ${
                  item.importance === "高"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                重要度：{item.importance}
              </span>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">
                  {item.point}
                </p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 比較表 */}
      <section id="comparison" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. 主要アプリの機能比較
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-blue-500 px-2 py-2 text-left">機能</th>
                <th className="border border-blue-500 px-2 py-2 text-center">工事管理SaaS</th>
                <th className="border border-blue-500 px-2 py-2 text-center">ANDPAD</th>
                <th className="border border-blue-500 px-2 py-2 text-center">蔵衛門</th>
                <th className="border border-blue-500 px-2 py-2 text-center">Photoruction</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["写真管理・電子黒板", "◎", "◎", "◎", "◎"],
                ["書類自動生成（30種以上）", "◎", "○", "△", "○"],
                ["電子納品（PHOTO.XML）", "◎", "△", "○", "△"],
                ["工程管理（ガントチャート）", "◎", "◎", "△", "○"],
                ["品質・出来形管理", "◎", "○", "△", "○"],
                ["安全管理（KY・ヒヤリハット）", "◎", "◎", "△", "○"],
                ["原価管理", "◎", "◎", "×", "○"],
                ["無料プランあり", "◎", "×", "×", "×"],
                ["月額料金（目安）", "¥0〜", "要問合", "要問合", "要問合"],
                ["公共工事特化", "◎", "△", "△", "△"],
                ["モバイルPWA（インストール不要）", "◎", "×", "×", "×"],
              ].map(([feature, ...vals]) => (
                <tr key={feature} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-2 font-medium text-gray-800">
                    {feature}
                  </td>
                  {vals.map((v, i) => (
                    <td
                      key={i}
                      className={`border border-gray-200 px-2 py-2 text-center font-bold ${
                        v === "◎"
                          ? "text-green-600"
                          : v === "○"
                          ? "text-blue-600"
                          : v === "△"
                          ? "text-yellow-600"
                          : "text-red-400"
                      }`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          ※ ◎：フル対応 ○：対応 △：一部対応 ×：非対応。2026年4月時点の情報に基づく。各社の最新情報は公式サイトを確認ください。
        </p>
      </section>

      {/* 4. 工事管理SaaS */}
      <section id="kouji-saas" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. 工事管理SaaSの特徴
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
          <h3 className="font-bold text-blue-800 mb-3">こんな方に特におすすめ</h3>
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li>✓ 公共工事（国・都道府県・市区町村）を主に受注している</li>
            <li>✓ 電子納品（CALS/EC）の書類作成・XML生成を自動化したい</li>
            <li>✓ まず無料で試してから判断したい</li>
            <li>✓ 従業員5〜50名規模の中小建設会社</li>
            <li>✓ 書類作成（工事打合簿・施工体制台帳など）の手間を減らしたい</li>
          </ul>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {[
            { pro: "フリープランが充実（案件3件・5ユーザー無料）" },
            { pro: "30種類以上の公共工事書類を自動生成" },
            { pro: "PHOTO.XML・電子納品ZIP自動生成" },
            { pro: "PWA対応でインストール不要" },
            { pro: "公共工事標準仕様書（令和7年版）準拠" },
            { pro: "スマホで工事写真・電子黒板・日報が完結" },
          ].map((item) => (
            <div
              key={item.pro}
              className="flex items-start gap-2 text-sm text-gray-700 bg-white rounded-lg border border-blue-100 px-3 py-2"
            >
              <span className="text-blue-500 font-bold">✓</span>
              {item.pro}
            </div>
          ))}
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="font-bold text-gray-800 mb-2 text-sm">料金プラン</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { name: "フリー", price: "¥0/月", limit: "案件3件・5ユーザー" },
              { name: "スタンダード", price: "¥29,800/月", limit: "案件20件・30ユーザー" },
              { name: "エンタープライズ", price: "¥98,000/月", limit: "無制限" },
            ].map((plan) => (
              <div key={plan.name} className="bg-gray-50 rounded-lg p-3">
                <p className="font-bold text-gray-800">{plan.name}</p>
                <p className="text-blue-700 font-bold text-sm">{plan.price}</p>
                <p className="text-gray-500 text-xs mt-1">{plan.limit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ANDPAD */}
      <section id="andpad" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. ANDPADの特徴
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          ANDPADは国内最大手の施工管理クラウドサービスです。
          累計導入社数は業界トップクラスで、特に住宅・リフォーム・中堅ゼネコンでの導入実績が豊富です。
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div>
            <p className="font-bold text-green-700 text-sm mb-2">強み</p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li>・ 業界最多の導入実績・ブランド力</li>
              <li>・ 施工管理・原価管理・人材管理が統合</li>
              <li>・ 充実した導入支援・カスタマーサポート</li>
              <li>・ 大手ゼネコン〜元請けとのデータ連携</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-red-700 text-sm mb-2">弱み</p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li>・ 無料プランなし（要問合せ）</li>
              <li>・ 電子納品（CALS/EC）機能が限定的</li>
              <li>・ 公共工事書類の自動生成が弱い</li>
              <li>・ 中小企業には費用対効果が見えにくい</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          ※ 料金は非公開（要問合せ）。一般的な相場はユーザーあたり5,000〜10,000円/月程度とされています。
        </p>
      </section>

      {/* 6. 蔵衛門 */}
      <section id="kurae-mon" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. 蔵衛門の特徴
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          蔵衛門（くらえもん）は工事写真管理に特化したクラウドサービスです。
          「蔵衛門Pad」というタブレット専用の電子黒板デバイスが有名で、
          写真を現場で整理・分類することに長けています。
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="font-bold text-green-700 text-sm mb-2">強み</p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li>・ 写真管理・電子黒板に特化した使いやすさ</li>
              <li>・ 電子納品の写真フォルダ整理機能</li>
              <li>・ ベテラン現場監督でも使いこなせるシンプルUI</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-red-700 text-sm mb-2">弱み</p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li>・ 書類自動生成・工程管理などは対応外</li>
              <li>・ 専用デバイス（Pad）を購入する必要あり</li>
              <li>・ 公共工事の書類総合管理には他ツールが必要</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. Photoruction */}
      <section id="photoruction" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. Photorectionの特徴
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Photorection（フォトラクション）は写真管理と施工管理を組み合わせたクラウドサービスです。
          スーパーゼネコンでの導入実績が多く、大規模工事向けの機能が充実しています。
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="font-bold text-green-700 text-sm mb-2">強み</p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li>・ 写真AIタグ付け・自動分類</li>
              <li>・ 図面上での写真位置管理</li>
              <li>・ 大規模工事・複数現場の管理</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-red-700 text-sm mb-2">弱み</p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li>・ 料金が高め（大手向け設定）</li>
              <li>・ 公共工事書類の自動生成が弱い</li>
              <li>・ 中小企業・職人には機能が複雑</li>
            </ul>
          </div>
        </div>
      </section>

      <CtaBanner text="まず工事管理SaaSの無料プランを試してみる" />

      {/* 8. 規模別おすすめ */}
      <section id="how-to-choose" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          8. 会社規模・工事種別別おすすめ
        </h2>
        <div className="space-y-4">
          {[
            {
              type: "一人親方・小規模（5名以下）",
              badge: "bg-green-100 text-green-800",
              recommend: "工事管理SaaS（フリープラン）",
              reason: "無料で写真管理・日報・書類自動生成が使える。コストゼロで始められる。",
            },
            {
              type: "中小建設会社（5〜50名）・公共工事中心",
              badge: "bg-blue-100 text-blue-800",
              recommend: "工事管理SaaS（スタンダード）",
              reason: "公共工事書類の自動生成・電子納品対応が充実。月29,800円でコスパ最高。",
            },
            {
              type: "中堅建設会社（50〜300名）・民間工事中心",
              badge: "bg-purple-100 text-purple-800",
              recommend: "ANDPAD",
              reason: "工程管理・原価管理・人材管理を統合したい場合に強い。サポートも充実。",
            },
            {
              type: "写真管理だけを改善したい",
              badge: "bg-orange-100 text-orange-800",
              recommend: "蔵衛門 または 工事管理SaaS",
              reason: "蔵衛門は写真特化で使いやすい。工事管理SaaSは写真＋書類まで一元管理できる。",
            },
            {
              type: "大手・スーパーゼネコン",
              badge: "bg-gray-100 text-gray-800",
              recommend: "Photoruction + ANDPAD 組合せ",
              reason: "大規模工事の写真管理はPhotoruction、工程・原価はANDPADが強い。",
            },
          ].map((item) => (
            <div key={item.type} className="border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.badge}`}>
                  {item.type}
                </span>
              </div>
              <p className="font-bold text-blue-700 text-sm mb-1">
                おすすめ：{item.recommend}
              </p>
              <p className="text-xs text-gray-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

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
            title: "電子納品とは？やり方を初心者向けに解説",
            description: "アプリで電子納品を自動化する方法",
          },
          {
            href: "/guide/construction-photo-management",
            title: "工事写真の撮り方・管理方法を完全解説",
            description: "電子黒板・写真台帳の作り方",
          },
          {
            href: "/guide/public-works-bidding",
            title: "公共工事の入札方法を完全解説",
            description: "入札から受注後の書類管理まで",
          },
          {
            href: "/guide/daily-report-template",
            title: "工事日報の書き方ガイド",
            description: "アプリで日報を3分で完成させる方法",
          },
        ]}
      />
    </GuideLayout>
  );
}
