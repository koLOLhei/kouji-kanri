"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  HardHat,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { GuideNavbar } from "../guide-components";

type Role = "admin" | "worker";

const PRODUCTION_URL = "https://kouji.soara-mu.jp";

type Scene = {
  /** タイムライン上の時間ラベル (例: "Day 1 - 09:00", "1週目") */
  time: string;
  /** シーンタイトル */
  title: string;
  /** 状況の物語的説明 */
  situation: string;
  /** どの画面で何をするか */
  action: string;
  /** 実際の操作手順 */
  steps: string[];
  /** ポイント・ハマりどころ */
  tip?: string;
  /** 関連ページ URL (本番システム) */
  url?: string;
};

const ADMIN_STORY: Scene[] = [
  {
    time: "Day 1 — 09:00",
    title: "案件を登録する",
    situation:
      "新しく公共建築工事を受注しました。発注者は東京都、案件は「都営住宅大島団地 外壁改修工事」、契約金額 1.2 億円、工期 6 ヶ月。",
    action:
      "ログイン後、左のメニューから「案件管理」→「新規作成」をクリック。",
    steps: [
      "案件名「都営住宅大島団地 外壁改修工事」を入力",
      "現場住所「東京都江東区大島6-1-1」を入力",
      "契約金額「120,000,000」、契約日・着工日・完工予定日を入力",
      "「仕様書ベース」で「公共建築工事標準仕様書 令和7年版」を選択",
      "「作成」をクリック → 案件詳細画面が開く",
    ],
    tip: "「仕様書ベース」を選んでおくと、次のステップで工程が自動生成されます。地域仕様（東京都版など）も指定可能。",
    url: "/projects",
  },
  {
    time: "Day 1 — 09:15",
    title: "工程を自動生成する",
    situation:
      "案件は登録できました。次は工程表が必要。仕様書に基づいた標準工程を手作業で作るのは大変。",
    action:
      "案件詳細画面の「工程」タブ → 「仕様書から自動生成」ボタンを押す。",
    steps: [
      "案件詳細画面下部の「工程」タブを開く",
      "「仕様書から工程を初期化」ボタンをクリック",
      "工種チェックリストから対象工種を選択（外壁改修なら「タイル工事」「塗装工事」など）",
      "「生成」を押すと、工種ごとの工程・必要書類・チェックリストが自動展開される",
    ],
    tip: "標準仕様書の章番号と工程が紐づいているため、検査時に「どの工程が仕様書のどの章に対応するか」が一目で分かります。",
  },
  {
    time: "Day 2 — 10:30",
    title: "協力業者を登録する",
    situation:
      "塗装工事は協力業者の田中塗装に発注予定。職長の田中さんと作業員2名にもアプリを使ってもらう必要がある。",
    action: "左メニュー「組織管理」→「協力業者」から新規登録。",
    steps: [
      "「協力業者」ページで「新規登録」",
      "業者名「田中塗装」、代表者「田中太郎」、電話番号、業種「塗装工事」を入力",
      "「ユーザー管理」から職長・作業員のアカウントを発行（メール招待）",
      "招待リンクをLINEや SMS で送信",
    ],
    tip: "発行したアカウントは「作業員ロール」になり、写真撮影や日報入力のみ可能。原価管理など機密情報は見えません。",
    url: "/subcontractors",
  },
  {
    time: "Day 3 — 14:00",
    title: "書類を一括生成する",
    situation:
      "着工前に発注者に提出する書類が大量にある：施工計画書、グリーンファイル、緊急連絡網、KY実施計画書、品質管理計画書…手書きしてると 1 週間かかる。",
    action: "案件詳細「書類ダッシュボード」→「一括生成」。",
    steps: [
      "案件詳細「書類」タブを開く",
      "「不足書類一覧」で必要書類が赤色で表示される",
      "「一括生成」をクリックし、生成したいテンプレートを全選択",
      "案件情報・工種から自動的に内容が埋まり、PDFで一括出力",
      "PDFをダウンロードして発注者に提出（メール添付 or 印刷）",
    ],
    tip: "工種を選ぶだけで内訳が自動入力される 41 工種対応のテンプレートが入っています。「材料」「施工フロー」「検査項目」が自動入力されるので、白紙から書く必要がありません。",
  },
  {
    time: "Week 2 — 月曜朝",
    title: "作業員の報告を承認する",
    situation:
      "先週金曜日に作業員が上げた日報・写真・KY活動が承認待ち。今朝の朝礼前に確認したい。",
    action: "左メニュー「承認」キューを開く。",
    steps: [
      "/approval ページに未承認件数のバッジが付いている",
      "リストから案件・種別（日報/写真/KY/原価）で絞り込み",
      "1件ずつ内容を確認 → 「承認」または「差戻し」",
      "差戻し時はコメントを付ける（作業員にプッシュ通知が飛ぶ）",
    ],
    tip: "10 件まとめてチェックして「一括承認」も可能。差戻しが多い項目はテンプレートが古い可能性 → 設定見直し。",
    url: "/approval",
  },
  {
    time: "Week 4",
    title: "原価管理で利益を見通す",
    situation:
      "工事開始から 1 ヶ月。資材費が予算オーバー気味。このまま行けば利益はどうなる？",
    action: "案件詳細「原価」タブで予算・実績・予測を確認。",
    steps: [
      "「原価」タブの「予算」「実績」「予測」を確認",
      "材料費・労務費・経費の進捗率と消化率を可視化",
      "予測グラフで完工時の利益率を自動計算（出来高ベース）",
      "予算超過リスクがあれば赤色で警告",
    ],
    tip: "週次で実績を入力するだけで、AI が EVM (進捗率と予算消化のズレ) を計算して赤信号を出します。",
  },
  {
    time: "Month 3",
    title: "中間検査の書類を準備",
    situation: "発注者の中間検査が来週。検査で見られる書類を一発で揃えたい。",
    action: "案件詳細「検査管理」から検査予定を作成。",
    steps: [
      "「検査管理」タブで「新規検査」を作成（種別: 中間検査）",
      "対象工程をチェック",
      "「検査書類セット出力」をクリック → 該当工程の日報・写真台帳・KY記録・出来形管理表が PDF で一括出力",
      "USBに入れて検査官に提出（電子納品にも対応）",
    ],
    tip: "写真台帳は工種・日付別にグループ化され、電子黒板情報・GPS座標・チェックサム入りで出力されます。改ざん不可の証跡として使えます。",
  },
  {
    time: "Month 6",
    title: "完成・引き渡し",
    situation: "工事完了。発注者への完成図書一式が必要。",
    action: "「完成図書ダウンロード」で電子納品セットを作成。",
    steps: [
      "案件詳細「完成図書」タブ",
      "「電子納品セットを生成」をクリック",
      "CALS/EC 規格のフォルダ構成・XMLファイル・写真台帳・図面が ZIP で出力",
      "ZIP を発注者に納品（DVD-R 焼きにも対応）",
    ],
    tip: "完成までに撮影された全写真の検収・引き継ぎ・転記が自動。手動で並べ替える作業がゼロになります。",
  },
];

const WORKER_STORY: Scene[] = [
  {
    time: "07:30 — 朝礼前",
    title: "現場到着、本日の作業確認",
    situation:
      "塗装工の山田さん、現場の都営住宅前に到着。今日の作業内容を確認したい。",
    action: "スマホでアプリを開く。",
    steps: [
      "ホーム画面の「アプリ」アイコン（事前にPWA追加済み）をタップ",
      "ログイン状態のまま、トップに本日の作業が表示される",
      "「本日の作業: 北棟東面 タイル目地補修」を確認",
      "担当工程をタップして詳細を開く",
    ],
    tip: "初回は Safari の「ホームに追加」でアイコン化しておく（職長から作業員へ操作レク必須）。電波弱くてもキャッシュから起動できます。",
    url: "/today",
  },
  {
    time: "07:45 — KY活動",
    title: "危険予知活動シートを作成",
    situation: "朝礼が始まる前に、本日の作業の危険予知を書く必要がある。",
    action: "「安全管理」→「KY活動を新規作成」。",
    steps: [
      "案件詳細から「安全管理」タブ → 「KY活動」",
      "「新規作成」ボタン",
      "作業内容を選ぶと、過去の類似 KY 記録から危険要因・対策が自動提案される",
      "「3 つの危険要因」「3 つの対策」を入力して保存",
      "「朝礼で読み合わせ」のチェックを付ける",
    ],
    tip: "音声入力対応。マイクボタンを押して話せばテキスト化されます（手袋着用時に便利）。",
    url: "/projects/[id]/safety",
  },
  {
    time: "08:30 — 撮影",
    title: "施工前の写真撮影",
    situation: "目地補修の前に「施工前」の状態を写真で残す必要がある。",
    action: '左メニュー「撮影」→ 工種を選んで撮影。',
    steps: [
      "「撮影」ボタン（カメラアイコン）をタップ",
      "案件・工程・工種（「タイル目地補修」）を選択",
      "「電子黒板」を ON にして、工種名・位置・撮影日が画像に自動合成される",
      "シャッターを切る → 撮影日時・GPS座標が自動記録",
      "「アップロード」を押すと R2 ストレージに保存される",
    ],
    tip: "電波が弱くてもアップロードボタンを押せば OK。アプリが自動でキューに保存し、電波復帰時に自動送信します。",
    url: "/capture",
  },
  {
    time: "10:15 — ヒヤリハット",
    title: "緊急事態の報告",
    situation:
      "足場で重機の旋回ブームが頭をかすめた！軽傷だが報告は必須。事務所まで戻る時間はない。",
    action: '"クイック報告" 機能で 3 タップ送信。',
    steps: [
      "案件詳細「安全」→「クイック報告」",
      "重大度「中程度」を選択",
      "状況を音声入力で30秒喋る → テキスト化",
      "現場写真を1枚撮って添付（GPSも自動）",
      "「送信」を押すと、現場代理人・安全管理者にプッシュ通知が即時届く",
    ],
    tip: "通信できない場合もキューに保存され、復帰時に自動送信されます。「報告できなかった」が無くなります。",
    url: "/projects/[id]/safety/quick-report",
  },
  {
    time: "13:00 — 図面確認",
    title: "設計変更の確認",
    situation: "事務所から「設計変更があった」と LINE が来た。最新の図面を確認したい。",
    action: '"図面管理" で最新版を開く。',
    steps: [
      "案件詳細「図面」タブ",
      "対象図面（例「立面図 R3」）をタップ",
      "「版履歴」で最新版が R4 になっているのを確認 → R4 を開く",
      "PDF ビューアでピンチイン拡大して確認",
      "変更箇所にコメントを付けて「了解」",
    ],
    tip: "図面は版管理されており、いつ・誰が・何を変えたかが履歴で見えます。古い版で施工する事故を防げます。",
  },
  {
    time: "16:30 — 日報",
    title: "本日の作業日報を入力",
    situation: "本日の作業が完了。日報を出さないと帰れない。",
    action: '"日報" タブから簡易入力。',
    steps: [
      "案件詳細「日報」タブ → 「本日の日報」",
      "天候は気象庁 API から自動入力済み",
      "「作業内容」を音声入力（例「北棟東面 1-3 階の目地補修、5m²」）",
      "「作業員」を選択（昨日の出勤者が候補に上がる）",
      "「使用機械」「材料」を選択（過去の入力からサジェスト）",
      "「写真を添付」 → 本日撮影した写真から自動候補",
      "「送信」",
    ],
    tip: "AIが本日の写真・KY記録・出勤データから日報の下書きを自動生成。最後に確認・修正するだけで5分で完成します。",
  },
  {
    time: "17:00 — 退場",
    title: "明日の段取りを確認",
    situation: "退場前に、明日の作業・必要な資材・人員を確認したい。",
    action: '"カレンダー" と "通知" を確認。',
    steps: [
      "左メニュー「カレンダー」で明日の予定を確認",
      "明日の朝礼時刻・天気予報・予定作業がカード表示",
      "「通知」アイコンに未読バッジ → 職長からの指示や承認結果",
      "資材入荷予定 が「明日 09:00」と表示されている",
      "アプリを閉じて退場",
    ],
    tip: "ホーム画面の「明日やること」ウィジェット（PWA）を使えば、ブラウザを開かなくてもスマホロック画面から確認できます。",
  },
];

export default function HowToUsePage() {
  const [role, setRole] = useState<Role>("admin");
  const story = role === "admin" ? ADMIN_STORY : WORKER_STORY;

  return (
    <div className="min-h-screen bg-white">
      <GuideNavbar />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase mb-4">
            How To Use · 事例ロードマップ
          </p>
          <h1 className="text-3xl lg:text-5xl font-extralight tracking-wider text-[#1a1a1a]">
            実際の使い方を物語で
          </h1>
          <div className="w-16 h-px bg-[#1a1a1a] mx-auto mt-6 mb-6" />
          <p className="text-sm text-gray-500 tracking-wide max-w-2xl mx-auto leading-relaxed">
            「都営住宅大島団地 外壁改修工事」を 6 ヶ月で完工する流れを、
            管理者と作業員それぞれの目線で時系列で追います。
            <br />
            実際にどの画面で・何を入力するかが分かるので、初日からそのまま真似できます。
          </p>
        </div>
      </section>

      {/* Role switcher */}
      <section className="pb-8 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 border border-gray-200">
            <button
              onClick={() => setRole("admin")}
              className={`px-6 py-5 text-sm tracking-wider transition-colors ${
                role === "admin"
                  ? "bg-[#1a1a1a] text-white"
                  : "bg-white text-[#1a1a1a] hover:bg-gray-50"
              }`}
            >
              <Shield className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              管理者の物語（田中所長の6ヶ月）
            </button>
            <button
              onClick={() => setRole("worker")}
              className={`px-6 py-5 text-sm tracking-wider transition-colors ${
                role === "worker"
                  ? "bg-[#1a1a1a] text-white"
                  : "bg-white text-[#1a1a1a] hover:bg-gray-50"
              }`}
            >
              <HardHat className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              作業員の物語（山田さんの1日）
            </button>
          </div>
        </div>
      </section>

      {/* Demo account banner */}
      <section className="pb-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="bg-gray-50 border border-gray-100 p-6 lg:p-8">
            <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3">
              実際に試す
            </p>
            <p className="text-sm text-[#1a1a1a] mb-4 tracking-wide leading-relaxed">
              下のロードマップを読みながら、別タブでログインして同じ画面を触ってみてください。
              デモデータ環境なので、何を入力しても元に戻せます。
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-5 text-xs">
              <div className="bg-white border border-gray-200 px-4 py-3">
                <div className="text-gray-400 mb-1">
                  {role === "admin" ? "管理者" : "作業員"}メールアドレス
                </div>
                <div className="font-mono text-[#1a1a1a]">
                  {role === "admin" ? "admin@demo.co.jp" : "worker@demo.co.jp"}
                </div>
              </div>
              <div className="bg-white border border-gray-200 px-4 py-3">
                <div className="text-gray-400 mb-1">パスワード</div>
                <div className="font-mono text-[#1a1a1a]">
                  {role === "admin" ? "admin123" : "worker123"}
                </div>
              </div>
            </div>
            <a
              href={`${PRODUCTION_URL}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white px-6 py-3 text-sm tracking-wider transition-colors"
            >
              別タブでログイン画面を開く
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3 text-center">
            Timeline · ロードマップ
          </p>
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] text-center mb-3">
            {role === "admin"
              ? "案件受注から引き渡しまで（6 ヶ月）"
              : "ある作業員の 1 日（07:30 〜 17:00）"}
          </h2>
          <p className="text-xs text-gray-400 text-center tracking-wide mb-16">
            {role === "admin"
              ? "東京都営住宅大島団地 外壁改修工事（契約額 1.2 億円）の物語"
              : "塗装工 山田さん（38歳・経験 12 年）の現場での 1 日"}
          </p>

          <div className="relative">
            {/* タイムラインの縦線 */}
            <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-px" />

            <div className="space-y-12">
              {story.map((scene, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col ${
                    idx % 2 === 0
                      ? "lg:flex-row"
                      : "lg:flex-row-reverse"
                  } gap-6`}
                >
                  {/* 時間バッジ */}
                  <div className="lg:w-1/2 flex lg:justify-end items-start pl-12 lg:pl-0 lg:pr-12">
                    <div
                      className={`${
                        idx % 2 === 0 ? "lg:text-right" : "lg:text-left"
                      } w-full lg:max-w-sm`}
                    >
                      <div className="flex lg:inline-flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] tracking-[0.3em] text-gray-400 uppercase">
                          {scene.time}
                        </span>
                      </div>
                      <h3 className="text-lg lg:text-xl font-medium tracking-wider text-[#1a1a1a] mb-3">
                        {scene.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed tracking-wide">
                        {scene.situation}
                      </p>
                    </div>
                  </div>

                  {/* タイムライン上のドット */}
                  <div className="absolute left-4 lg:left-1/2 top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-[#1a1a1a] ring-4 ring-white" />

                  {/* 操作内容カード */}
                  <div className="lg:w-1/2 pl-12 lg:pl-12">
                    <div className="border border-gray-100 p-6 lg:p-7 bg-white">
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                        <CheckCircle2 className="w-4 h-4 text-[#1a1a1a]" />
                        <span className="text-xs tracking-wider text-[#1a1a1a]">
                          {scene.action}
                        </span>
                      </div>
                      <ol className="space-y-2 mb-4">
                        {scene.steps.map((step, si) => (
                          <li
                            key={si}
                            className="text-xs text-gray-500 leading-relaxed tracking-wide flex gap-3"
                          >
                            <span className="flex-shrink-0 w-5 h-5 bg-gray-50 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                              {si + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {scene.tip && (
                        <div className="bg-blue-50/50 border-l-2 border-blue-200 pl-3 py-2 mt-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-900/80 leading-relaxed tracking-wide">
                              <span className="font-medium">ポイント: </span>
                              {scene.tip}
                            </p>
                          </div>
                        </div>
                      )}
                      {scene.url && (
                        <a
                          href={`${PRODUCTION_URL}${scene.url.replace("[id]", "demo")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] tracking-[0.2em] text-gray-400 uppercase hover:text-[#1a1a1a] inline-flex items-center gap-1 mt-4"
                        >
                          {scene.url}
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Summary / CTA */}
      <section className="pb-32 bg-gray-50 pt-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3">
            Get Started
          </p>
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] mb-6">
            読むより試す方が早いです
          </h2>
          <p className="text-sm text-gray-500 tracking-wide mb-8 leading-relaxed">
            上の物語の「
            {role === "admin" ? "Day 1 — 案件を登録する" : "07:30 — 本日の作業確認"}
            」を、デモアカウントで実際に触ってみてください。
            <br />
            5 分で本システムの操作感が分かります。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${PRODUCTION_URL}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white px-8 py-3 text-sm tracking-wider transition-colors"
            >
              {role === "admin" ? "管理者として試す" : "作業員として試す"}
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => setRole(role === "admin" ? "worker" : "admin")}
              className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-white text-[#1a1a1a] px-8 py-3 text-sm tracking-wider transition-colors"
            >
              {role === "admin"
                ? "作業員の物語も読む"
                : "管理者の物語も読む"}
            </button>
          </div>
          <div className="mt-12 pt-12 border-t border-gray-200">
            <Link
              href="/guide"
              className="text-xs text-gray-400 hover:text-[#1a1a1a] tracking-wide"
            >
              ← ガイド一覧に戻る
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3">
            KAMO Construction Co., Ltd.
          </p>
          <p className="text-xs text-gray-400 tracking-wide">
            公共建築工事SaaS · 公共建築工事標準仕様書(令和7年版)準拠
          </p>
        </div>
      </footer>
    </div>
  );
}
