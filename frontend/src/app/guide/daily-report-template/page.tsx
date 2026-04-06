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
    "【無料テンプレート】工事日報の書き方ガイド｜記入例・項目一覧付き",
  description:
    "公共工事の工事日報に記入すべき項目、天候・出来高・作業員数の書き方、よくある記入ミスを記入例付きで解説。工事日報テンプレートの無料ダウンロード情報も紹介。",
  keywords: [
    "工事日報 テンプレート 無料",
    "工事日報 書き方",
    "工事日報 項目",
    "施工管理 日報",
    "現場日報 書き方",
    "工事日報 記入例",
  ],
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/daily-report-template",
  },
};

const TOC = [
  { id: "what-is", label: "工事日報とは" },
  { id: "required-items", label: "工事日報の必須記入項目" },
  { id: "weather", label: "天候・気温の記入方法" },
  { id: "workers", label: "作業員・職種の記録方法" },
  { id: "progress", label: "工事進捗・出来高の記録" },
  { id: "safety", label: "安全管理・KY活動の記録" },
  { id: "examples", label: "記入例・よくある間違い" },
  { id: "digitize", label: "デジタル化で効率アップ" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "工事日報は毎日提出しなければなりませんか？",
    a: "公共工事では、請負者は工事施工中の毎日（作業日）に現場日誌（工事日報）を記録し、監督員の求めに応じて提示することが求められます。提出頻度は週次・月次が多いですが、工事打合簿として節目ごとに提出するケースもあります。特記仕様書を確認してください。",
  },
  {
    q: "雨天で作業休止の日も日報は書きますか？",
    a: "はい、作業休止日（雨天休工など）も「休工」として日報に記録します。天候、休工理由、翌日の作業予定などを記入してください。休工日の記録は工期延長の根拠資料にもなります。",
  },
  {
    q: "出来高はどのように計算しますか？",
    a: "出来高とは、その日までに完了した工事の金額換算の累計です。「当日出来高 = 施工数量 × 単価」で計算します。月次出来高報告書は、工事全体の出来形進捗を発注者に報告する書類として重要です。",
  },
  {
    q: "現場に入った作業員全員を記録しないといけませんか？",
    a: "原則として施工体制台帳・作業員名簿に登録された全員を記録します。特に一次・二次下請けの作業員も含めて職種別に人数を記入します。外国人労働者・新入社員の入場教育実施も記録が必要です。",
  },
  {
    q: "工事日報と施工管理記録帳はどう違いますか？",
    a: "工事日報は毎日の作業内容・人員・天候などを記録した日次の記録書です。施工管理記録帳（工事記録帳）はより詳細な施工管理データ（品質管理測定値・段階確認記録など）を含む記録帳です。発注機関によって呼び方や様式が異なります。",
  },
];

export default function DailyReportTemplatePage() {
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
          { label: "工事日報の書き方ガイド" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約7分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        【無料テンプレート】工事日報の書き方ガイド
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          ｜記入例・項目一覧付き
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        工事日報は「面倒だが毎日書かなければならない書類」の代表格です。
        何を書けば良いか分からない、いつも同じことを書いている、デジタル化したいという方に向けて、
        記入項目から記入例、デジタル化の方法まで解説します。
      </p>

      <TableOfContents items={TOC} />

      {/* 1. 工事日報とは */}
      <section id="what-is" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. 工事日報とは
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工事日報（現場日誌・工事日誌とも呼ばれる）は、建設現場で毎作業日に記録する日次報告書です。
          その日の天候・工事内容・作業員数・出来高・安全管理実施状況などを記録します。
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          公共工事では土木工事施工管理基準・建築工事監理指針などで日報の記録が求められており、
          工事完成時の完成図書の一部として保管されます。
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { title: "施工記録としての役割", desc: "工事の進捗・品質を証明する公式記録" },
            { title: "問題発生時の証拠", desc: "工期遅延・瑕疵・近隣トラブルの証拠" },
            { title: "工期管理の基礎データ", desc: "実績工程を把握し、計画と比較する" },
          ].map((item) => (
            <div key={item.title} className="bg-blue-50 rounded-xl p-4">
              <p className="font-bold text-blue-800 text-sm mb-1">{item.title}</p>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 必須項目 */}
      <section id="required-items" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. 工事日報の必須記入項目
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工事日報に記入すべき標準的な項目は次のとおりです。
          発注機関の様式がある場合はその様式に従ってください。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">区分</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">記入項目</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-bold">記入例</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["基本情報", "工事名・工事番号", "○○橋補修工事 第2号"],
                ["基本情報", "記録日・曜日", "2026年4月6日（月）"],
                ["天候", "天候・気温・降水量", "晴れ・最高22℃・最低8℃"],
                ["人員", "職種別作業員数", "鉄筋工3名・型枠工2名・雑工2名"],
                ["人員", "下請業者名・人数", "㈱○○工業 4名"],
                ["作業内容", "施工場所・施工内容", "A1橋台：型枠組立・鉄筋工"],
                ["作業内容", "施工数量・進捗率", "型枠150㎡（計画比95%）"],
                ["安全", "KY活動実施の有無", "実施（参加者7名）"],
                ["安全", "ヒヤリハット・危険事象", "なし（または内容記載）"],
                ["品質", "品質管理実施内容", "コンクリートスランプ試験実施"],
                ["機材", "使用重機・車両", "油圧ショベル0.4㎥×1台"],
                ["特記", "協議事項・指示事項", "監督員と配筋検査について協議"],
              ].map(([cat, item, ex]) => (
                <tr key={item} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 text-xs text-blue-700 font-bold">{cat}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-800">{item}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-600 text-xs">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. 天候 */}
      <section id="weather" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. 天候・気温の記入方法
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          天候は午前・午後で変化した場合は分けて記入します（例：午前晴れ、午後曇り）。
          コンクリート工事や塗装工事では気温・湿度が品質に影響するため、正確な記録が重要です。
        </p>
        <div className="bg-gray-50 rounded-xl p-5 mb-4">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">天候区分の標準記号</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { symbol: "晴", desc: "雲量2以下" },
              { symbol: "曇", desc: "雲量3〜8" },
              { symbol: "薄曇", desc: "上層雲で日差し弱い" },
              { symbol: "雨", desc: "降水あり" },
              { symbol: "霧雨", desc: "霧状の細かい雨" },
              { symbol: "雪", desc: "降雪あり" },
              { symbol: "霧", desc: "視程1km未満" },
              { symbol: "台風", desc: "暴風雨" },
            ].map((item) => (
              <div key={item.symbol} className="text-center bg-white rounded-lg p-2 border border-gray-100">
                <p className="font-bold text-blue-700 text-base">{item.symbol}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
          <strong>ヒント：</strong>気温は最高気温・最低気温の両方を記録するのが標準です。
          コンクリート打設日は打設時の気温（打設開始時・終了時）を別途品質管理記録に記載します。
          寒中コンクリート（平均気温4℃以下）・暑中コンクリート（日平均気温25℃超）では
          特別な管理が必要になります。
        </div>
      </section>

      {/* 4. 作業員記録 */}
      <section id="workers" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. 作業員・職種の記録方法
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          作業員は職種別に人数を記録します。また、下請負業者ごとに内訳を明記することが
          施工体制台帳との整合性確認のために重要です。
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="font-bold text-gray-800 mb-2 text-sm">記入例（作業員集計）</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">業者名</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center">職種</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center">人数</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["（元請）株式会社○○建設", "現場監督・施工管理", "2"],
                  ["㈱○○鉄筋工業", "鉄筋工", "4"],
                  ["○○型枠工業㈱", "型枠大工", "3"],
                  ["㈱○○建材", "運転手・重機オペレーター", "2"],
                  ["合計", "", "11"],
                ].map(([co, role, count], i) => (
                  <tr
                    key={i}
                    className={i === 4 ? "bg-blue-50 font-bold" : "odd:bg-white even:bg-gray-50"}
                  >
                    <td className="border border-gray-300 px-2 py-1.5">{co}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{role}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CtaBanner text="工事日報をスマホで3分で書き終える" />

      {/* 5. 進捗・出来高 */}
      <section id="progress" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. 工事進捗・出来高の記録
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          進捗記録では「計画対比」が重要です。単に「型枠組立中」と書くのではなく、
          計画数量・累計出来高・残量を明記します。
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="font-bold text-gray-800 mb-2 text-sm">進捗記録の記入例</p>
          <div className="text-sm text-gray-700 leading-relaxed">
            <p><strong>施工箇所：</strong>A1橋台</p>
            <p><strong>作業内容：</strong>型枠組立（外型枠）</p>
            <p><strong>当日施工量：</strong>150㎡（計画150㎡）</p>
            <p><strong>累計出来形：</strong>650㎡ / 計画700㎡（進捗率92.9%）</p>
            <p><strong>残工事：</strong>内型枠50㎡（明日施工予定）</p>
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed text-sm">
          出来高を毎日積み上げることで、工程の遅れを早期に発見し、工程対策（人員増強など）を打つことができます。
        </p>
      </section>

      {/* 6. 安全管理 */}
      <section id="safety" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. 安全管理・KY活動の記録
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工事日報には安全管理の実施状況も記録します。
          特にKY活動（危険予知活動）・TBM（ツールボックスミーティング）の実施記録は
          安全管理計画書との整合性確認のために必要です。
        </p>
        <div className="space-y-3">
          {[
            { item: "KY活動実施状況", ex: "実施（参加者11名、本日のKY：高所作業時の転落防止）" },
            { item: "安全巡回実施状況", ex: "実施（10:00 現場主任による全体巡回）" },
            { item: "ヒヤリハット報告", ex: "なし（または：資材搬入時にスリング劣化を発見）" },
            { item: "安全設備確認", ex: "安全ネット・親綱・安全帯着用確認済み" },
            { item: "送り出し教育", ex: "○○工業 新規入場者1名（山田太郎）教育実施済み" },
          ].map((item) => (
            <div key={item.item} className="border-l-4 border-orange-300 pl-4 py-1">
              <p className="font-bold text-gray-800 text-sm">{item.item}</p>
              <p className="text-xs text-gray-600 mt-0.5">{item.ex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. よくある間違い */}
      <section id="examples" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. よくある記入ミスと注意点
        </h2>
        <div className="space-y-3">
          {[
            {
              ng: "「型枠工事を実施した」",
              ok: "「A1橋台外型枠組立 150㎡を完了。使用材料：コンパネ150枚・バタ角200本」",
              point: "作業内容は数量・場所を明記する",
            },
            {
              ng: "「雨天のため休工」のみ",
              ok: "「降雨（終日）により全作業休工。翌日の作業再開に向け、仮設養生を確認済み」",
              point: "休工日も理由・翌日対応を書く",
            },
            {
              ng: "「安全管理 特になし」",
              ok: "「TBM-KY実施（8:00、参加8名）、本日KY：足場上での資材運搬時の落下防止」",
              point: "安全管理は毎日具体的に記録する",
            },
            {
              ng: "後日まとめて複数日分を書く",
              ok: "毎日その日のうちに記録する",
              point: "日報は当日に記録するのが原則（後から書いた場合、監督員に指摘される）",
            },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-orange-700 mb-2">注意ポイント：{item.point}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="bg-red-50 rounded-lg p-3 text-xs text-gray-700">
                  <span className="font-bold text-red-600 block mb-1">NG例</span>
                  {item.ng}
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-xs text-gray-700">
                  <span className="font-bold text-green-600 block mb-1">OK例</span>
                  {item.ok}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. デジタル化 */}
      <section id="digitize" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          8. デジタル化で効率アップ
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          工事日報のデジタル化には大きなメリットがあります。
        </p>
        <div className="space-y-3 mb-4">
          {[
            { merit: "現場からスマホで入力・即提出", desc: "帰社して書く手間がなくなる。残業削減効果が大きい。" },
            { merit: "テンプレートで入力時間を短縮", desc: "工事名・天候・作業内容のテンプレートを設定すれば毎日3分で完了。" },
            { merit: "集計・分析が自動化", desc: "人員集計・進捗率・出来高推移グラフが自動生成。" },
            { merit: "写真を日報に自動リンク", desc: "その日の写真が日報に自動紐付け。写真台帳と一体管理。" },
          ].map((item) => (
            <div key={item.merit} className="flex gap-3 bg-blue-50 rounded-xl p-4">
              <span className="text-blue-500 font-bold text-sm flex-shrink-0">✓</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{item.merit}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="工事日報テンプレートを無料で使ってみる" />

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
            description: "日報と写真を連携管理する方法",
          },
          {
            href: "/guide/ky-activity",
            title: "KY活動のやり方を完全解説",
            description: "日報に書くKY記録の正しい作り方",
          },
          {
            href: "/guide/construction-management-app",
            title: "施工管理アプリ比較【2026年最新】",
            description: "日報機能が充実したアプリの選び方",
          },
          {
            href: "/guide/quality-management",
            title: "出来形管理・品質管理とは？",
            description: "日報と品質管理記録の連携方法",
          },
        ]}
      />
    </GuideLayout>
  );
}
