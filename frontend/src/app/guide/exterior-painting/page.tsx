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
  title: "戸建て外壁塗装の業者選びガイド｜失敗しない7つのポイント",
  description:
    "戸建て外壁塗装で失敗しないための業者選び7つのポイントを解説。塗料の種類・見積書の見方・工事中の確認事項まで。施工管理DXで実現する安心の塗装工事も紹介。",
  alternates: {
    canonical: "https://kouji.soara-mu.jp/guide/exterior-painting",
  },
};

const TOC = [
  { id: "why", label: "外壁塗装はなぜ必要か" },
  { id: "paint-types", label: "塗料の種類と選び方" },
  { id: "seven-points", label: "業者選びの7つのポイント" },
  { id: "estimate", label: "見積書の見方" },
  { id: "during-work", label: "施工中に確認すべきこと" },
  { id: "dx", label: "KAMOの「見える化」で安心の塗装工事" },
  { id: "faq", label: "よくある質問（FAQ）" },
];

export default function ExteriorPaintingPage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "戸建て外壁塗装の業者選びガイド｜失敗しない7つのポイント",
    author: { "@type": "Organization", name: "工事管理SaaS 編集部" },
    publisher: { "@type": "Organization", name: "工事管理SaaS" },
    datePublished: "2026-04-12",
    dateModified: "2026-04-12",
    url: "https://kouji.soara-mu.jp/guide/exterior-painting",
    description:
      "戸建て外壁塗装で失敗しないための業者選び7つのポイントを解説。塗料の種類・見積書の見方・工事中の確認事項まで。",
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
          { label: "外壁塗装の業者選びガイド" },
        ]}
      />

      {/* Hero */}
      <div className="mb-8">
        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
          外壁塗装
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4">
          戸建て外壁塗装の業者選びガイド｜失敗しない7つのポイント
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          公開日：2026年4月12日 ／ 読了時間：約10分
        </p>
      </div>

      <TableOfContents items={TOC} />

      {/* Section 1 */}
      <section id="why" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          外壁塗装はなぜ必要か
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          外壁は常に紫外線・雨・風にさらされており、塗膜が劣化すると防水性が低下し、
          建物内部への雨水浸入・カビ・腐食などの深刻なダメージにつながります。
          定期的な塗装メンテナンスで建物を守ることが、長期的な修繕コストの削減にもなります。
        </p>

        <div className="bg-gray-50 rounded-xl p-5 mb-4">
          <p className="font-bold text-gray-900 text-sm mb-3">劣化のサイン（こんな症状が出たら要注意）</p>
          <ul className="space-y-2">
            {[
              "チョーキング（外壁を触ると白い粉が付く）",
              "ひび割れ（ヘアークラック・構造クラック）",
              "塗膜の剥がれ・膨れ",
              "コケ・藻・カビの発生",
              "シーリング（コーキング）のひび割れ・肉やせ",
              "築10年以上が経過している",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">
          外壁塗装の一般的な目安は<strong>築10〜15年</strong>、または前回の塗装から<strong>8〜12年</strong>です。
          ただし劣化のサインが早期に現れた場合は、時期を待たずに専門家に診断してもらいましょう。
        </p>
      </section>

      {/* Section 2 */}
      <section id="paint-types" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          塗料の種類と選び方
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          外壁塗装で使用する塗料は大きく3種類に分類できます。
          耐用年数・費用・建物の状態を考慮して選びましょう。
        </p>

        <div className="space-y-4">
          {[
            {
              type: "シリコン塗料",
              years: "耐用年数：10〜15年",
              cost: "コスト：標準",
              desc: "最もポピュラーな塗料。コストパフォーマンスが高く、汚れにくさと耐久性のバランスが優秀。多くの戸建てに適しています。",
              color: "bg-blue-50 border-blue-200",
            },
            {
              type: "フッ素塗料",
              years: "耐用年数：15〜20年",
              cost: "コスト：やや高め",
              desc: "シリコンより耐久性が高く、塗り替えの手間とコストを長期的に抑えられます。高耐久を求める方に最適。",
              color: "bg-purple-50 border-purple-200",
            },
            {
              type: "無機塗料",
              years: "耐用年数：20〜25年",
              cost: "コスト：高め",
              desc: "ガラスやセラミックの成分を含む最高品質の塗料。汚れ付着を極限まで抑え、長期的なランニングコストを大幅削減。",
              color: "bg-emerald-50 border-emerald-200",
            },
          ].map((item) => (
            <div key={item.type} className={`border rounded-xl p-4 ${item.color}`}>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <p className="font-bold text-gray-900 text-sm">{item.type}</p>
                <span className="text-xs text-gray-500">{item.years}</span>
                <span className="text-xs text-gray-500">{item.cost}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner text="見積書の比較・品質管理を徹底した塗装工事のご相談はKAMOへ" />

      {/* Section 3 */}
      <section id="seven-points" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          業者選びの7つのポイント
        </h2>
        <div className="space-y-4">
          {[
            {
              no: "01",
              title: "地元の施工実績があるか",
              body: "地元密着型の業者はアフターフォローがしやすく、施工後の対応も迅速です。実際の施工事例や近隣での実績を確認しましょう。",
            },
            {
              no: "02",
              title: "相見積もりを3社以上取っているか",
              body: "1社だけの見積もりでは相場感がわかりません。最低3社から見積もりを取り、内容を比較しましょう。安すぎる業者には注意が必要です。",
            },
            {
              no: "03",
              title: "下地処理を丁寧に行うか",
              body: "塗装の品質は下地処理で9割が決まります。高圧洗浄・ケレン・シーリング打ち替えの内容が見積書に明記されているか確認します。",
            },
            {
              no: "04",
              title: "使用する塗料が明記されているか",
              body: "見積書に塗料のメーカー・品番・塗布量が明記されているか確認します。「一流メーカーの高品質塗料」などの曖昧な表現には注意。",
            },
            {
              no: "05",
              title: "工事中の写真報告があるか",
              body: "施工中の写真（下地処理・中塗り・上塗り各工程）を報告してもらえるか確認します。見えない部分の品質を確認する唯一の手段です。",
            },
            {
              no: "06",
              title: "保証内容が明確か",
              body: "塗装工事の保証期間（最低8〜10年）と保証の範囲（施工不良のみか、塗料の自然劣化も含むか）を確認します。",
            },
            {
              no: "07",
              title: "強引な訪問営業や割引提案に注意",
              body: "「今日だけの特別価格」「飛び込みで特典」などは要注意。信頼できる業者は時間をかけて丁寧に説明します。",
            },
          ].map((item) => (
            <div key={item.no} className="flex gap-4">
              <div className="text-2xl font-extrabold text-blue-200 w-10 flex-shrink-0 text-right">
                {item.no}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 */}
      <section id="estimate" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          見積書の見方
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          見積書は「合計金額」だけでなく、各工程の内訳を確認することが重要です。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border border-gray-200 font-bold text-gray-900">確認項目</th>
                <th className="text-left p-3 border border-gray-200 font-bold text-gray-900">チェックポイント</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["仮設工事（足場）", "足場の種類・面積・単価が明記されているか"],
                ["下地処理", "高圧洗浄・ケレン・シーリング打ち替えの内容"],
                ["塗料", "メーカー名・品番・使用量（㎡あたりの塗布量）"],
                ["塗装工程", "下塗り・中塗り・上塗りの回数が明記されているか"],
                ["付帯工事", "軒天・雨樋・鉄部等の塗装が含まれているか"],
                ["諸経費", "内容が不明瞭な「一式」表記に注意"],
              ].map(([item, check]) => (
                <tr key={item} className="hover:bg-gray-50">
                  <td className="p-3 border border-gray-200 font-medium text-gray-900">{item}</td>
                  <td className="p-3 border border-gray-200 text-gray-600">{check}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5 */}
      <section id="during-work" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          施工中に確認すべきこと
        </h2>
        <div className="space-y-3">
          {[
            {
              title: "高圧洗浄の確認",
              body: "汚れ・コケ・旧塗膜をしっかり洗い流しているか。不十分だと塗膜が早期剥離します。",
            },
            {
              title: "シーリング打ち替えの確認",
              body: "シーリングが増し打ちではなく、旧シーリングを除去した上で打ち替えされているか。",
            },
            {
              title: "各工程の乾燥時間確保",
              body: "下塗り・中塗り・上塗り間に適切な乾燥時間が確保されているか（塗料仕様書に基づく）。",
            },
            {
              title: "施工写真の共有",
              body: "各工程の施工写真をその日のうちに共有してもらえるか確認します。",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-4">
              <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6 */}
      <section id="dx" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          KAMOの「見える化」で安心の塗装工事
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          株式会社KAMOでは、施工管理システムを活用して工事の「見える化」を実現しています。
          施主様はスマホやPCからリアルタイムで工事の進捗を確認できます。
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          {[
            { title: "GPS・日時付き写真共有", desc: "現場で撮影した写真が即座にクラウドに保存。位置情報と日時が自動付与されます。" },
            { title: "工程進捗のリアルタイム確認", desc: "今日どの工程が進んでいるかをオンラインポータルから確認できます。" },
            { title: "品質管理データの自動記録", desc: "塗布量・希釈率・乾燥時間などのデータが自動記録され、品質を担保します。" },
            { title: "デジタル施工記録の永久保存", desc: "施工中の全写真・記録が電子データとして保管され、将来の修繕時に活用できます。" },
          ].map((item) => (
            <div key={item.title} className="border border-gray-200 rounded-xl p-4">
              <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-900 mb-2">
            KAMO construction について詳しくはこちら
          </p>
          <p className="text-sm text-blue-700 mb-3">
            神奈川県川崎市を拠点に、東京・横浜エリアの外壁塗装・大規模修繕を手がけています。
            見える化された工事管理で、施主様に安心をお届けします。
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

      {/* Section 7 - FAQ */}
      <section id="faq" className="mb-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          よくある質問（FAQ）
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "外壁塗装の費用はどれくらいかかりますか？",
              a: "30坪の戸建てで約80〜150万円が目安です。塗料の種類（シリコン・フッ素・無機）や建物の状態によって変わります。足場代だけで20〜30万円かかります。",
            },
            {
              q: "工事期間はどのくらいですか？",
              a: "30坪程度の一般的な戸建てで10〜14日間が目安です。足場設置・高圧洗浄・下地処理・塗装3工程・乾燥・足場解体の順で進みます。",
            },
            {
              q: "雨の日は工事が中断しますか？",
              a: "塗装工事は雨天・低温時は施工できません。そのため実際の工期は天候により前後することがあります。",
            },
            {
              q: "クリアコート塗装（透明塗装）とは何ですか？",
              a: "タイル調やレンガ調などの模様を活かしながら塗装する方法です。意匠性を維持したい外壁に適しており、KAMOの得意とする塗装工法です。",
            },
            {
              q: "施工中は在宅していないといけませんか？",
              a: "基本的には在宅の必要はありません。ただし足場設置・解体の日や、ご不在時の養生剥がしについては事前にご相談ください。",
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
            href: "/guide/transparent-construction",
            title: "工事の見える化とは？施工管理DXの全貌",
            description:
              "DXで変わる工事管理。写真共有・自動報告・品質管理がどう変わるかを解説。",
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
