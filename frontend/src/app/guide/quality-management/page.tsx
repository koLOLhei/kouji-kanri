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
    "出来形管理・品質管理とは？管理図の見方と作り方を解説｜x̄-R管理図・Cp計算",
  description:
    "公共工事の出来形管理・品質管理の基本から、x̄-R管理図・ヒストグラムの作り方、工程能力指数Cp・Cpkの計算方法まで。管理図の見方・規格値との比較も実例を交えて解説します。",
  keywords: [
    "出来形管理 とは",
    "品質管理 とは",
    "管理図 見方",
    "x̄-R管理図",
    "工程能力指数",
    "Cp Cpk",
    "ヒストグラム",
    "公共工事 品質管理",
    "施工管理 品質",
  ],
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/quality-management",
  },
};

const TOC = [
  { id: "what-is-dekigata", label: "出来形管理とは" },
  { id: "what-is-quality", label: "品質管理とは" },
  { id: "management-chart", label: "管理図の種類と使い方" },
  { id: "xbar-r-chart", label: "x̄-R管理図の作り方" },
  { id: "histogram", label: "ヒストグラムの作り方" },
  { id: "cp-cpk", label: "工程能力指数Cp・Cpkの計算" },
  { id: "dekigata-chart", label: "出来形管理図の書き方" },
  { id: "inspection", label: "段階確認・検査" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "出来形管理と品質管理の違いは何ですか？",
    a: "出来形管理は工事の「寸法・形状」が設計図どおりかを管理するものです（幅・厚さ・高さ・延長など）。品質管理は工事の「材料・施工の品質」が規格値を満たしているかを管理するものです（コンクリート強度・アスファルト配合など）。両方合わせて「品質・出来形管理」として一体的に実施します。",
  },
  {
    q: "x̄-R管理図のx̄とRは何を意味しますか？",
    a: "x̄（エックスバー）はサンプルの平均値、R（アール）はサンプルの範囲（最大値−最小値）を表します。x̄管理図で工程の中心の変動を、R管理図で工程のばらつきの変動を監視します。両方が管理限界内に収まっていれば工程は安定していると判断します。",
  },
  {
    q: "Cp値はいくつ以上あれば合格ですか？",
    a: "一般的にCp≥1.33（片側規格の場合Cpk≥1.33）以上が「工程能力十分」とされます。Cp＝1.00〜1.33は「工程能力やや不足」、Cp＜1.00は「工程能力不足（不良品発生リスク高）」です。公共工事では発注機関の品質管理基準に従います。",
  },
  {
    q: "出来形管理図と品質管理図はどの書類に含めますか？",
    a: "出来形・品質管理図は「品質管理計画書」「出来形管理図表」として施工計画書の一部または別冊として作成します。工事完成時に完成図書（電子納品）の一部として提出します。",
  },
  {
    q: "段階確認と出来形管理の違いは何ですか？",
    a: "段階確認は、後から目視で確認できない部分（鉄筋・埋設物など）について、施工中に監督員が立ち会って確認する行為です。出来形管理は施工した構造物の寸法を測定して設計値と比較する管理行為です。段階確認は出来形管理の一環として実施することが多いです。",
  },
];

export default function QualityManagementPage() {
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
          { label: "出来形管理・品質管理" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約10分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        出来形管理・品質管理とは？
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          管理図の見方と作り方を解説
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        公共工事では品質・出来形管理計画書の作成と記録が義務付けられています。
        「管理図の作り方が分からない」「x̄-R管理図の見方が分からない」
        「工程能力指数Cpの計算方法を知りたい」という方に向けて実践的に解説します。
      </p>

      <TableOfContents items={TOC} />

      {/* 1. 出来形管理とは */}
      <section id="what-is-dekigata" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. 出来形管理とは
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          出来形管理とは、施工した構造物の形状・寸法が設計図書どおりであることを確認・記録する管理行為です。
          「出来形」とは「出来上がった形」の意味で、建設工事での品質保証の基本です。
        </p>
        <div className="bg-blue-50 rounded-xl p-5 mb-4">
          <h3 className="font-bold text-blue-800 mb-2">出来形管理の対象寸法（例）</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { item: "道路工事", measures: "幅員・厚さ・縦断勾配・横断勾配" },
              { item: "コンクリート工", measures: "寸法（幅・高さ・厚さ）・配筋間隔・かぶり" },
              { item: "土工事", measures: "法面勾配・天端高さ・余裕幅" },
              { item: "杭工事", measures: "杭長・杭径・杭頭高さ・芯ずれ" },
            ].map((item) => (
              <div
                key={item.item}
                className="bg-white rounded-lg p-3 border border-blue-100"
              >
                <p className="font-bold text-blue-700 text-xs mb-1">
                  {item.item}
                </p>
                <p className="text-xs text-gray-600">{item.measures}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed">
          各工種の管理基準値（許容誤差）は公共工事標準仕様書・特記仕様書に定められています。
          測定した実測値が管理基準値の範囲内に収まることを確認し、
          出来形管理図（管理図表）に記録します。
        </p>
      </section>

      {/* 2. 品質管理とは */}
      <section id="what-is-quality" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. 品質管理とは
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          品質管理とは、使用する材料・施工した構造物の品質が設計図書・仕様書の規格値を
          満たしていることを確認・記録する管理行為です。
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">工種</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">品質管理項目</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">試験方法</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["コンクリート工", "スランプ・空気量・圧縮強度", "スランプ試験・空気量試験・供試体圧縮試験"],
                ["アスファルト舗装", "アスファルト量・粒度・締固め度", "マーシャル安定度試験・RI試験"],
                ["盛土工", "締固め度・含水比", "現場密度試験・プルーフローリング"],
                ["鉄筋工", "径・間隔・かぶり・継手長", "巻き尺・ノギスによる実測"],
                ["溶接工", "溶接外観・超音波探傷", "外観検査・UT検査"],
              ].map(([work, items, test]) => (
                <tr key={work} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">{work}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">{items}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-600 text-xs">{test}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. 管理図の種類 */}
      <section id="management-chart" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. 管理図の種類と使い方
        </h2>
        <div className="space-y-3 mb-4">
          {[
            {
              name: "x̄-R管理図（平均値・範囲管理図）",
              use: "連続した測定データの工程管理。品質管理で最も多く使われる。",
              when: "コンクリート強度・アスファルト温度など連続的な測定",
            },
            {
              name: "ヒストグラム（度数分布図）",
              use: "データの分布状況・ばらつきを視覚的に確認する。工程能力評価に使う。",
              when: "まとまった測定データができた時点での評価",
            },
            {
              name: "出来形管理図（折れ線グラフ）",
              use: "出来形の実測値と管理基準値・規格値を時系列で比較する。",
              when: "コンクリート厚さ・路盤厚さなどの出来形管理",
            },
            {
              name: "散布図",
              use: "2つのデータの相関関係を見る。材料試験データの相関確認に使う。",
              when: "アスファルト量と空隙率の関係など",
            },
          ].map((item) => (
            <div key={item.name} className="border border-gray-200 rounded-xl p-4">
              <p className="font-bold text-blue-700 text-sm mb-1">{item.name}</p>
              <p className="text-sm text-gray-700 mb-1">{item.use}</p>
              <p className="text-xs text-gray-500">使用場面：{item.when}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. x̄-R管理図 */}
      <section id="xbar-r-chart" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. x̄-R管理図の作り方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          x̄-R管理図の作成手順を解説します。
        </p>
        <ol className="space-y-4 mb-6">
          {[
            {
              step: "1",
              title: "データを収集する",
              desc: "一定期間のデータをサンプルサイズn（通常n=4〜5）で組にまとめます。各組の測定値をx₁、x₂、x₃…と記録します。",
              example: "例：コンクリートスランプ値（n=4）を5回採取",
            },
            {
              step: "2",
              title: "各組の平均値x̄と範囲Rを計算する",
              desc: "x̄ = (x₁+x₂+…+xn) / n、R = 最大値 - 最小値",
              example: "例：[10, 12, 11, 9]のグループ → x̄=10.5、R=3",
            },
            {
              step: "3",
              title: "総平均x̿（グランドアベレージ）とR̄を計算する",
              desc: "x̿ = 全グループのx̄の平均、R̄ = 全グループのRの平均",
              example: "",
            },
            {
              step: "4",
              title: "管理限界線を計算する",
              desc: "UCL（上方管理限界）= x̿ + A₂R̄、LCL（下方管理限界）= x̿ - A₂R̄。A₂はサンプルサイズnによる係数（n=4：A₂=0.729、n=5：A₂=0.577）",
              example: "",
            },
            {
              step: "5",
              title: "グラフを作成する",
              desc: "x̄管理図とR管理図をセットで描きます。UCL・LCL・中心線を引き、各グループのデータをプロットします。",
              example: "管理限界を超えた点や傾向があれば工程異常の可能性あり",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-4 bg-gray-50 rounded-xl p-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1 text-sm">{item.title}</p>
                <p className="text-sm text-gray-700 mb-1">{item.desc}</p>
                {item.example && (
                  <p className="text-xs text-blue-700 italic">{item.example}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700">
          <strong>管理図の見方：</strong>
          ①点が管理限界（UCL・LCL）を超えた場合、②連続する7点以上が中心線の一方に偏った場合（連）、
          ③点が増加または減少の傾向を示す場合（傾向）は工程異常のサインです。
          原因を調査して対策を取ります。
        </div>
      </section>

      <CtaBanner text="品質管理図を自動生成するアプリを試す" />

      {/* 5. ヒストグラム */}
      <section id="histogram" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. ヒストグラムの作り方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          ヒストグラムはデータの分布を棒グラフで表したものです。
          工程能力評価・品質管理記録に必須のグラフです。
        </p>
        <ol className="space-y-2 mb-4">
          {[
            "データをすべて収集する（最低20〜25個以上推奨）",
            "最大値・最小値を求め、範囲R = 最大値 - 最小値を計算する",
            "区間数kを決める（√データ数が目安：25個なら5区間、100個なら10区間）",
            "区間幅h = R ÷ k を計算する",
            "各区間のデータ数（度数）を数える",
            "度数を棒グラフで描く",
            "規格値の上下限線を引いて分布と比較する",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700">
              <span className="bg-emerald-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-gray-700">
          <strong>ヒストグラムの形で工程を診断：</strong>
          ①山型（正規分布）：工程安定 ②二山型：2つの異なる工程が混在
          ③崖型：データの選別・除外が疑われる ④離れ孤島型：測定ミスの可能性
        </div>
      </section>

      {/* 6. Cp・Cpk */}
      <section id="cp-cpk" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. 工程能力指数Cp・Cpkの計算
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工程能力指数は、工程が規格値を満たす能力を数値化したものです。
        </p>
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">Cp（両側規格の場合）</h3>
            <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm text-center mb-2">
              Cp = （規格上限 - 規格下限）÷ 6σ
            </div>
            <p className="text-xs text-gray-600">
              σ（標準偏差）= √｛Σ(xi - x̄)² ÷ (n-1)｝。Cpは分布の幅と規格幅の比。
              管理図ではσ ≈ R̄ ÷ d₂（d₂はサンプルサイズによる係数）で推定できます。
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">Cpk（中心のずれを考慮）</h3>
            <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm text-center mb-2">
              Cpk = min｛（規格上限 - x̄）÷ 3σ、（x̄ - 規格下限）÷ 3σ｝
            </div>
            <p className="text-xs text-gray-600">
              Cpkは分布の中心が規格の中央からずれている場合の実効的な工程能力を示します。
              CpkはCp以下になります。Cpk≥1.33で工程能力十分と判定されます。
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-3 py-2 text-center">Cp（またはCpk）の値</th>
                <th className="border border-gray-200 px-3 py-2 text-left">判定</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1.67以上", "◎ 工程能力十分（余裕あり）", "text-green-700"],
                ["1.33〜1.67未満", "○ 工程能力十分", "text-blue-700"],
                ["1.00〜1.33未満", "△ 工程能力やや不足（注意が必要）", "text-yellow-700"],
                ["1.00未満", "✕ 工程能力不足（不良品発生リスク高）", "text-red-700"],
              ].map(([val, judge, cls]) => (
                <tr key={val} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono font-bold">{val}</td>
                  <td className={`border border-gray-200 px-3 py-2 font-bold ${cls}`}>{judge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. 出来形管理図 */}
      <section id="dekigata-chart" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. 出来形管理図の書き方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          出来形管理図は、測定位置ごとの実測値を折れ線グラフで表し、
          設計値・管理基準値と比較するグラフです。
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">出来形管理図に記載する線</h3>
          <div className="space-y-2">
            {[
              { line: "設計値線", color: "bg-blue-500", desc: "設計図書の寸法値（中心線）" },
              { line: "管理基準値（上限・下限）", color: "bg-orange-500", desc: "発注機関が定める許容誤差の範囲" },
              { line: "規格値（上限・下限）", color: "bg-red-500", desc: "絶対に超えてはならない上下限値" },
              { line: "実測値折れ線", color: "bg-green-500", desc: "各測定位置での実測値をプロット" },
            ].map((item) => (
              <div key={item.line} className="flex items-center gap-3">
                <div className={`w-6 h-1.5 rounded ${item.color} flex-shrink-0`} />
                <span className="font-bold text-xs text-gray-800 w-36 flex-shrink-0">
                  {item.line}
                </span>
                <span className="text-xs text-gray-600">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed">
          実測値が管理基準値を超えた場合は原因を調査し、対策を取ったうえで記録します。
          規格値を超えた場合は不合格となるため、補修・やり直しが必要です。
        </p>
      </section>

      {/* 8. 段階確認 */}
      <section id="inspection" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          8. 段階確認・検査
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          段階確認とは、施工後に確認できなくなる部分について施工中に監督員が立ち会って確認する制度です。
          コンクリート打設前の配筋確認などが代表例です。
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {[
            {
              type: "配筋検査（コンクリート工）",
              timing: "コンクリート打設前",
              check: "鉄筋径・間隔・配置・かぶり・継手・定着長さ",
            },
            {
              type: "杭基礎の段階確認",
              timing: "杭頭処理後・基礎躯体施工前",
              check: "杭頭高さ・芯ずれ・杭頭処理状況",
            },
            {
              type: "路盤出来形確認",
              timing: "アスファルト舗装前",
              check: "路盤の厚さ・幅・横断勾配・締固め度",
            },
            {
              type: "防水工事段階確認",
              timing: "保護コンクリート打設前",
              check: "防水層の施工範囲・立ち上がり高さ・ドレン周り処理",
            },
          ].map((item) => (
            <div key={item.type} className="border border-gray-200 rounded-xl p-4">
              <p className="font-bold text-blue-700 text-sm mb-1">{item.type}</p>
              <p className="text-xs text-gray-500 mb-1">確認時期：{item.timing}</p>
              <p className="text-xs text-gray-700">確認内容：{item.check}</p>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
          段階確認は事前に監督員と日程調整が必要です。
          確認後は「段階確認記録」に確認日・確認者・確認結果を記録し、写真とともに保管します。
        </div>
      </section>

      <CtaBanner text="出来形管理・品質管理をアプリで自動化する" />

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
            description: "品質管理写真・出来形確認写真の撮り方",
          },
          {
            href: "/guide/electronic-delivery",
            title: "電子納品とは？やり方を初心者向けに解説",
            description: "品質管理記録の電子納品対応方法",
          },
          {
            href: "/guide/ky-activity",
            title: "KY活動のやり方を完全解説",
            description: "安全管理と品質管理を一体化する方法",
          },
          {
            href: "/guide/daily-report-template",
            title: "工事日報の書き方ガイド",
            description: "品質管理実施記録の日報への記載方法",
          },
        ]}
      />
    </GuideLayout>
  );
}
