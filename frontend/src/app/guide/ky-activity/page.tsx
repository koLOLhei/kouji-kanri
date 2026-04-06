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
    "KY活動（危険予知活動）のやり方を完全解説｜記録シートの書き方・例文",
  description:
    "建設現場のKY活動（危険予知活動）のやり方を完全解説。KYTの4ラウンド法、TBM-KYの進め方、KYシート記録の書き方、ヒヤリハット報告方法まで。安全管理に役立つ例文付き。",
  keywords: [
    "KY活動 やり方",
    "KYT",
    "危険予知活動",
    "TBM-KY",
    "KYシート 書き方",
    "ヒヤリハット",
    "建設現場 安全管理",
    "安全管理 公共工事",
  ],
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/ky-activity",
  },
};

const TOC = [
  { id: "what-is-ky", label: "KY活動とは" },
  { id: "kyt-4round", label: "KYTの4ラウンド法" },
  { id: "tbm-ky", label: "TBM-KY（ツールボックスミーティング）の進め方" },
  { id: "ky-sheet", label: "KYシートの書き方・例文" },
  { id: "hiyari-hatto", label: "ヒヤリハット報告の書き方" },
  { id: "construction-ky", label: "建設現場で多い危険ポイント" },
  { id: "record-management", label: "安全管理記録の保管・提出" },
  { id: "faq", label: "よくある質問" },
];

const FAQ = [
  {
    q: "KY活動は毎日やらないといけませんか？",
    a: "公共工事では安全管理計画書にKY活動の実施を定め、作業日ごとに実施が求められます。TBM-KY（ツールボックスミーティング）は朝の作業開始前に実施するのが標準です。KY記録（KYシート）は日報と合わせて保管します。",
  },
  {
    q: "KYシートは何人くらいで実施すればよいですか？",
    a: "作業班全員（5〜10名程度）で行うのが効果的です。大人数だと参加意識が薄れるため、班ごとに分けて実施するのが推奨されます。リーダーが進行し、全員が発言する機会を持つことが重要です。",
  },
  {
    q: "KYTと通常のKY活動の違いは何ですか？",
    a: "KYT（KY訓練）は危険予知能力を高めるための訓練手法で、4ラウンド法に沿ってグループで話し合います。現場でのKY活動（TBM-KY）はKYTの訓練成果を実際の作業に活かす実践活動です。KYTは主に社内訓練で使い、現場では簡略化したTBM-KYが一般的です。",
  },
  {
    q: "ヒヤリハット報告は強制ですか？",
    a: "多くの公共工事発注機関では、安全管理計画書にヒヤリハット収集・対策の実施を求めています。ヒヤリハットは労災事故の前兆（ハインリッヒの法則：重大事故1件の背後に軽微な事故29件、ヒヤリハット300件がある）であり、報告文化を作ることが事故防止に直結します。",
  },
  {
    q: "安全管理記録はどのくらい保管しておく必要がありますか？",
    a: "公共工事の完成図書の一部として5〜10年間の保管が求められることが多いです。KY記録・ヒヤリハット報告・安全巡回記録を含む安全管理記録は、完成後も保管し、発注機関からの問い合わせに対応できるようにしておきましょう。",
  },
];

export default function KyActivityPage() {
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
          { label: "KY活動のやり方" },
        ]}
      />

      <p className="text-xs text-gray-400 mb-4">
        最終更新：2026年4月6日 | 読了時間：約8分
      </p>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
        KY活動（危険予知活動）のやり方を完全解説
        <br />
        <span className="text-xl sm:text-2xl font-bold text-blue-600">
          ｜記録シートの書き方・例文付き
        </span>
      </h1>

      <p className="text-gray-600 leading-relaxed mb-8 text-base border-l-4 border-blue-200 pl-4">
        「KY活動の正しいやり方が分からない」「KYシートに何を書けばいいか分からない」
        「毎日のKY記録が形式的になっている」という現場担当者に向けて、
        KYT4ラウンド法からTBM-KYの進め方、KYシートの記入例まで解説します。
      </p>

      <TableOfContents items={TOC} />

      {/* 1. KY活動とは */}
      <section id="what-is-ky" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          1. KY活動とは
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          KY活動（危険予知活動）とは、作業開始前に「この作業にはどんな危険が潜んでいるか」を
          チームで話し合い、事故を未然に防ぐ安全管理活動です。
          <strong>KY</strong>は「危険（K）予知（Y）」の略で、KYT（危険予知訓練）を現場に適用したものです。
        </p>
        <div className="bg-red-50 rounded-xl p-5 mb-4">
          <h3 className="font-bold text-red-800 mb-2">ハインリッヒの法則</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            重大労働災害1件の背後には、軽微な事故29件、ヒヤリハット（危うく事故になりかけた）300件が存在するという法則。
            KY活動は、この300件のヒヤリハットを事前に洗い出すことで重大事故を防ぐ考え方に基づいています。
          </p>
        </div>
        <p className="text-gray-700 leading-relaxed">
          公共工事では安全管理計画書に「KY活動の実施」を明記し、実施記録（KYシート）を日報と合わせて保管することが求められます。
        </p>
      </section>

      {/* 2. 4ラウンド法 */}
      <section id="kyt-4round" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          2. KYTの4ラウンド法
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          KYTの基本手法である「4ラウンド法」は、作業のイラスト・写真を見ながら
          グループで話し合うトレーニング手法です。
        </p>
        <div className="space-y-4">
          {[
            {
              round: "1R",
              name: "どんな危険が潜んでいるか（現状把握）",
              desc: "作業シートのイラストを見て「〜して、〜になる」の形式で危険を列挙する。",
              ex: "例：「高所で材料を受け取る際に足を踏み外して転落する」",
              color: "border-blue-400 bg-blue-50",
            },
            {
              round: "2R",
              name: "これが重要な危険ポイントだ（本質追究）",
              desc: "1Rで出た危険の中から、最も重要な危険項目に絞り込む（◎印をつける）。",
              ex: "例：最重要：「転落による重大災害」に絞り込む",
              color: "border-orange-400 bg-orange-50",
            },
            {
              round: "3R",
              name: "あなたならどうする（対策樹立）",
              desc: "2Rで選んだ危険に対して、具体的な対策を複数提案する。",
              ex: "例：「親綱を設置する」「安全帯を腰骨上に装着する」「作業開始前に足場を確認する」",
              color: "border-green-400 bg-green-50",
            },
            {
              round: "4R",
              name: "私たちはこうする（目標設定）",
              desc: "3Rの対策から実行する重点対策を決め、指差し呼称で確認する。",
              ex: "例：「安全帯ヨシ！」と全員で指差し呼称して作業開始",
              color: "border-purple-400 bg-purple-50",
            },
          ].map((item) => (
            <div
              key={item.round}
              className={`border-l-4 rounded-xl p-4 ${item.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-extrabold text-lg">{item.round}</span>
                <span className="font-bold text-gray-900 text-sm">
                  {item.name}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-1">{item.desc}</p>
              <p className="text-xs text-gray-500 italic">{item.ex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. TBM-KY */}
      <section id="tbm-ky" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          3. TBM-KYの進め方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          TBM（ツールボックスミーティング）-KYは、現場で毎朝5〜10分で行う実践的なKY活動です。
          4ラウンド法を簡略化した形で実施します。
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="font-bold text-gray-800 mb-3 text-sm">TBM-KYの標準的な進め方（所要時間：5〜10分）</p>
          <ol className="space-y-2">
            {[
              "全員集合・点呼（体調確認・欠席者確認）",
              "本日の作業内容説明（リーダーから今日の作業・段取りを説明）",
              "本日の危険ポイント討議（「今日の作業でどんな危険があるか？」自由発言）",
              "重点危険ポイントの決定（最も重要な危険1〜2個に絞る）",
              "対策の確認（具体的な対策を全員で確認）",
              "指差し呼称（「〜ヨシ！」と全員で声に出して確認）",
              "KYシートに記録・全員サイン",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. KYシート書き方 */}
      <section id="ky-sheet" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          4. KYシートの書き方・例文
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          KYシート（KY記録票）の各欄の書き方を記入例付きで説明します。
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="bg-gray-100 px-4 py-2">
            <p className="font-bold text-gray-800 text-sm">KYシート記入例（高所作業の場合）</p>
          </div>
          <div className="p-4 space-y-3 text-sm">
            {[
              { label: "工事名", val: "○○橋補修工事" },
              { label: "作業場所", val: "A1橋台 上部工" },
              { label: "作業内容", val: "高さ4mでの型枠組立作業" },
              { label: "作業人員", val: "5名（班長：山田、鈴木・田中・佐藤・木村）" },
              {
                label: "危険ポイント（1R）",
                val: "①足場端部で転落する ②材料落下で下方の作業者に当たる ③工具の落下",
              },
              {
                label: "重点危険ポイント（2R）",
                val: "◎ 足場端部での転落による重大災害",
              },
              {
                label: "対策（3R）",
                val: "・安全帯（フルハーネス型）を装着し親綱に掛ける ・足場端部に安全帯フック掛け位置を明示する ・作業前に足場の点検を実施する",
              },
              {
                label: "本日の行動目標（4R）",
                val: "「安全帯OK・ヨシ！」全員指差し呼称",
              },
            ].map((item) => (
              <div key={item.label} className="flex gap-3">
                <span className="text-blue-700 font-bold w-36 flex-shrink-0 text-xs">
                  {item.label}：
                </span>
                <span className="text-gray-700 text-xs">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700">
          <strong>記入のコツ：</strong>
          危険ポイントは「〜して、〜になる」の形式（主体＋行動＋結果）で書くと具体的になります。
          「高所で作業する」ではなく「足場の端で資材を持ちながら移動して、足を滑らせて転落する」と書くことで
          具体的な対策が立てやすくなります。
        </div>
      </section>

      <CtaBanner text="安全管理記録をアプリで一元管理する" />

      {/* 5. ヒヤリハット */}
      <section id="hiyari-hatto" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          5. ヒヤリハット報告の書き方
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          ヒヤリハットとは「ヒヤっとした、ハっとした」経験のことで、
          事故にはならなかったものの危険だった出来事を指します。
          積極的に報告・共有する文化を作ることが事故防止につながります。
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="bg-orange-100 px-4 py-2">
            <p className="font-bold text-orange-800 text-sm">ヒヤリハット報告書の記入例</p>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {[
              { label: "発生日時", val: "2026年4月6日 10:30" },
              { label: "発生場所", val: "A1橋台 足場上（高さ3.5m）" },
              { label: "関係者", val: "山田太郎（鉄筋工）" },
              {
                label: "状況",
                val: "鉄筋を運搬中、足場板の端部で足を滑らせてよろめいた。親綱に掴まって転落を免れた。",
              },
              {
                label: "原因",
                val: "足場板に泥がついており滑りやすかった。また鉄筋を抱えていたため視界が悪かった。",
              },
              {
                label: "対策",
                val: "①朝の点検時に足場板の汚れを清掃する ②重量物運搬時は2人1組で行う ③足場板に滑り止めテープを貼る",
              },
              { label: "対策実施日", val: "即日実施" },
            ].map((item) => (
              <div key={item.label} className="flex gap-3">
                <span className="text-orange-700 font-bold w-28 flex-shrink-0 text-xs">
                  {item.label}：
                </span>
                <span className="text-gray-700 text-xs">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 建設現場の危険ポイント */}
      <section id="construction-ky" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          6. 建設現場で多い危険ポイント
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          建設現場の労働災害で多い危険は次のとおりです。KYシートのネタとして活用してください。
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              category: "墜落・転落（最多）",
              risks: ["足場からの転落", "脚立からの転落", "開口部への落下", "はしごの踏み外し"],
              color: "bg-red-50 border-red-200",
            },
            {
              category: "飛来・落下",
              risks: ["工具の落下", "材料の落下", "吊り荷の落下", "機械からの飛来物"],
              color: "bg-orange-50 border-orange-200",
            },
            {
              category: "はさまれ・巻き込まれ",
              risks: ["重機への巻き込まれ", "型枠解体時のはさまれ", "電動工具への接触"],
              color: "bg-yellow-50 border-yellow-200",
            },
            {
              category: "崩壊・倒壊",
              risks: ["土砂崩壊", "足場の倒壊", "資材山積みの倒壊", "掘削部分の崩壊"],
              color: "bg-green-50 border-green-200",
            },
          ].map((item) => (
            <div key={item.category} className={`border rounded-xl p-4 ${item.color}`}>
              <p className="font-bold text-gray-800 text-sm mb-2">{item.category}</p>
              <ul className="space-y-1">
                {item.risks.map((r) => (
                  <li key={r} className="text-xs text-gray-700 flex items-center gap-1.5">
                    <span className="text-red-500">▷</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 7. 記録の保管 */}
      <section id="record-management" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
          7. 安全管理記録の保管・提出
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          公共工事では安全管理に関する記録を整備し、監督員の要求があれば提示できる状態にしておく必要があります。
        </p>
        <div className="space-y-2 mb-4">
          {[
            {
              doc: "KYシート（KY記録票）",
              timing: "毎作業日",
              storage: "日報と合わせて綴じ保管",
            },
            {
              doc: "ヒヤリハット報告書",
              timing: "発生時",
              storage: "安全管理台帳に綴じ保管",
            },
            {
              doc: "安全巡回記録",
              timing: "巡回実施ごと",
              storage: "安全管理台帳",
            },
            {
              doc: "安全教育・送り出し教育記録",
              timing: "新規入場者ごと",
              storage: "作業員名簿・施工体制台帳と共に保管",
            },
            {
              doc: "安全衛生協議会議事録",
              timing: "月1回以上",
              storage: "安全管理台帳",
            },
          ].map((item) => (
            <div
              key={item.doc}
              className="grid grid-cols-3 gap-2 text-xs border-b border-gray-100 pb-2"
            >
              <span className="font-medium text-gray-800">{item.doc}</span>
              <span className="text-gray-600">{item.timing}</span>
              <span className="text-gray-500">{item.storage}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-700 text-sm">
          施工管理アプリを使うと、KYシート・ヒヤリハット報告・巡回記録がクラウドに自動保存され、
          いつでも検索・提出できます。
        </p>
      </section>

      <CtaBanner text="KY記録・ヒヤリハット報告をアプリで3タップで完了" />

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
            href: "/guide/daily-report-template",
            title: "工事日報の書き方ガイド",
            description: "KY記録を日報に正しく記録する方法",
          },
          {
            href: "/guide/quality-management",
            title: "出来形管理・品質管理とは？",
            description: "安全管理と品質管理を一体化する方法",
          },
          {
            href: "/guide/construction-management-app",
            title: "施工管理アプリ比較【2026年最新】",
            description: "安全管理機能が充実したアプリの選び方",
          },
          {
            href: "/guide/public-works-bidding",
            title: "公共工事の入札方法を完全解説",
            description: "安全管理計画書の作成ポイント",
          },
        ]}
      />
    </GuideLayout>
  );
}
