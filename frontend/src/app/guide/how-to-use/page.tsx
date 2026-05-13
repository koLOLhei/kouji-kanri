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
  /** タイムライン上の時間ラベル */
  time: string;
  /** 業務シーンの見出し */
  title: string;
  /** 該当業務の概要 */
  situation: string;
  /** 操作概要 */
  action: string;
  /** 具体的な操作手順 */
  steps: string[];
  /** 補足説明 */
  tip?: string;
  /** 関連ページ URL */
  url?: string;
};

const ADMIN_STORY: Scene[] = [
  {
    time: "Day 1 — 09:00",
    title: "新規案件の登録",
    situation:
      "公共建築工事(契約金額 1.2 億円・工期 6 ヶ月)を受注した直後の業務です。案件情報をシステムへ登録します。",
    action: "サイドメニュー「案件管理」から「新規作成」を選択します。",
    steps: [
      "案件名・現場住所・契約金額・契約日・着工日・完工予定日を入力します",
      "「仕様書ベース」で「公共建築工事標準仕様書 令和7年版」を選択します",
      "「作成」をクリックすると、案件詳細画面が表示されます",
    ],
    tip: "「仕様書ベース」を選択しておくことで、後続の工程自動生成機能が利用可能となります。地域仕様(東京都版等)の指定もできます。",
    url: "/projects",
  },
  {
    time: "Day 1 — 09:15",
    title: "工程表の自動生成",
    situation:
      "案件登録後、仕様書に準拠した工程表を作成します。手動作成では多大な工数を要するため、自動生成機能を利用します。",
    action: "案件詳細画面の「工程」タブから自動生成を実行します。",
    steps: [
      "「工程」タブを開き、「仕様書から工程を初期化」を選択します",
      "工種チェックリストから、案件で実施する工種を選択します",
      "「生成」をクリックすると、工種ごとの工程・必要書類・チェックリストが展開されます",
    ],
    tip: "標準仕様書の章番号と工程が紐付くため、検査時に「どの工程が仕様書のどの章に対応するか」を即座に提示できます。",
  },
  {
    time: "Day 2 — 10:30",
    title: "協力業者の登録",
    situation:
      "下請契約を締結する協力業者および、その職長・現場担当者のアカウントを発行します。",
    action: "サイドメニュー「協力業者」より新規登録を行います。",
    steps: [
      "「協力業者」ページで「新規登録」を選択します",
      "業者名・代表者・連絡先・業種を入力します",
      "「ユーザー管理」から職長および現場担当者のアカウントを発行します(メール招待)",
      "招待リンクを各担当者へ送付します",
    ],
    tip: "発行したアカウントは「作業員ロール」となり、写真撮影および日報入力に権限が限定されます。原価管理等の機密情報は閲覧不可です。",
    url: "/subcontractors",
  },
  {
    time: "Day 3 — 14:00",
    title: "提出書類の一括生成",
    situation:
      "着工前に発注者へ提出する各種書類(施工計画書・グリーンファイル・緊急連絡網・KY実施計画書・品質管理計画書ほか)を準備します。",
    action: "案件詳細「書類」タブから一括生成を実行します。",
    steps: [
      "「書類」タブを開き、「不足書類一覧」で必要書類を確認します",
      "「一括生成」をクリックし、対象テンプレートを選択します",
      "案件情報および工種情報をもとに、PDF が一括で生成されます",
      "出力された PDF を発注者へ提出します",
    ],
    tip: "41 工種に対応する書類テンプレートを搭載しており、工種を選択するだけで「使用材料」「施工フロー」「検査項目」が自動入力されます。",
  },
  {
    time: "Week 2 — 月曜朝",
    title: "現場提出物の承認",
    situation:
      "現場担当者が提出した日報・写真・KY 活動記録を確認のうえ承認する業務です。朝礼前に処理します。",
    action: "サイドメニュー「承認キュー」より処理します。",
    steps: [
      "「承認キュー」を開きます(未承認件数がバッジ表示されます)",
      "案件・種別(日報・写真・KY・原価)で絞り込みます",
      "内容を確認のうえ「承認」または「差戻し」を選択します",
      "差戻し時はコメントを付与します。現場担当者へプッシュ通知が送られます",
    ],
    tip: "「一括承認」により複数件を同時処理できます。差戻し件数が多い項目については、テンプレートの見直しを推奨します。",
    url: "/approval",
  },
  {
    time: "Week 4",
    title: "原価管理と利益見通しの把握",
    situation:
      "着工から 1 ヶ月経過時点の原価状況を確認し、完工時の利益見通しを把握します。",
    action: "案件詳細「原価」タブで状況を確認します。",
    steps: [
      "「原価」タブで「予算」「実績」「予測」の各指標を確認します",
      "材料費・労務費・経費別の進捗率と消化率が可視化されます",
      "予測グラフで、出来高ベースの完工時利益率が自動算出されます",
      "予算超過リスクがある場合は警告色で表示されます",
    ],
    tip: "週次で実績値を入力することにより、EVM(出来高管理)に基づくコスト乖離が自動計算され、予算リスクを早期に検知できます。",
  },
  {
    time: "Month 3",
    title: "中間検査用書類の準備",
    situation:
      "発注者による中間検査に向け、対象工程の関連書類を取り纏めます。",
    action: "案件詳細「検査管理」より書類セットを出力します。",
    steps: [
      "「検査管理」タブで「新規検査」を作成し、種別「中間検査」を選択します",
      "検査対象の工程を指定します",
      "「検査書類セット出力」を実行すると、該当工程の日報・写真台帳・KY 記録・出来形管理表が PDF で一括出力されます",
      "出力データを検査官へ提出します(電子納品にも対応)",
    ],
    tip: "写真台帳は工種・日付別にグループ化され、電子黒板情報・GPS 座標・チェックサムを含めて出力されるため、改ざん不可の証跡として活用できます。",
  },
  {
    time: "Month 6",
    title: "完成・引き渡し",
    situation:
      "工事完了に伴い、発注者への完成図書一式を作成します。",
    action: "「完成図書」タブより電子納品セットを生成します。",
    steps: [
      "案件詳細「完成図書」タブを開きます",
      "「電子納品セットを生成」を実行します",
      "CALS/EC 規格に準拠したフォルダ構成・XML ファイル・写真台帳・図面が ZIP で出力されます",
      "出力データを発注者へ納品します(DVD-R 形式での提出にも対応)",
    ],
    tip: "工期中に蓄積された全写真の検収・転記が自動化されるため、納品準備工数を大幅に削減できます。",
  },
];

const WORKER_STORY: Scene[] = [
  {
    time: "07:30 — 朝礼前",
    title: "本日の作業内容の確認",
    situation:
      "現場到着後、当日の作業内容を確認します。",
    action: "スマートフォンでアプリを起動します。",
    steps: [
      "ホーム画面のアプリアイコン(事前に PWA としてホーム追加)を起動します",
      "ログイン状態が保持されており、本日の作業がトップ画面に表示されます",
      "担当工程を選択し、詳細を確認します",
    ],
    tip: "初回利用時に Safari の「ホームに追加」機能でアイコン化することを推奨します。電波状況が不安定な現場でもキャッシュからの起動が可能です。",
    url: "/today",
  },
  {
    time: "07:45 — KY 活動",
    title: "危険予知活動シートの作成",
    situation:
      "朝礼前に、本日の作業に対する危険予知活動シートを作成します。",
    action: "案件詳細「安全管理」より KY 活動を新規作成します。",
    steps: [
      "「安全管理」タブから「KY 活動」を選択します",
      "「新規作成」をクリックします",
      "作業内容を選択すると、過去の類似記録より危険要因・対策の候補が提示されます",
      "危険要因および対策を入力し、保存します",
      "「朝礼で読み合わせ」のチェックを付与します",
    ],
    tip: "音声入力に対応しています。手袋着用時にもマイクボタンから音声でテキスト入力が可能です。",
    url: "/projects/[id]/safety",
  },
  {
    time: "08:30 — 写真撮影",
    title: "施工前写真の撮影",
    situation:
      "作業着手前に、対象箇所の現況写真を記録します。",
    action: "サイドメニュー「写真撮影」より撮影を開始します。",
    steps: [
      "「写真撮影」を起動します",
      "案件・工程・工種を選択します",
      "「電子黒板」を有効化し、工種名・位置・撮影日を画像へ自動合成します",
      "シャッターを切ると、撮影日時および GPS 座標が自動的に記録されます",
      "「アップロード」によりクラウドストレージへ保存されます",
    ],
    tip: "電波状況が不安定な場合も、アプリ内のキュー機構により撮影内容を保持します。通信回復時に自動送信されます。",
    url: "/capture",
  },
  {
    time: "10:15 — ヒヤリハット",
    title: "緊急事象の即時報告",
    situation:
      "現場でヒヤリハット事象が発生した際の、即時報告手順です。",
    action: "「クイック報告」機能を使用します。",
    steps: [
      "案件詳細「安全管理」から「クイック報告」を選択します",
      "重大度を選択します",
      "状況説明を音声入力します(30 秒程度)",
      "現場写真を撮影し添付します(GPS 座標は自動付与)",
      "「送信」により、現場代理人および安全管理者へプッシュ通知で即時通知されます",
    ],
    tip: "通信不能時もキューに保存され、復帰時に自動送信されます。報告漏れを防止できます。",
    url: "/projects/[id]/safety/quick-report",
  },
  {
    time: "13:00 — 図面確認",
    title: "設計変更の確認",
    situation:
      "設計変更の連絡を受領した際、最新版の図面を確認します。",
    action: "案件詳細「図面管理」より最新版を参照します。",
    steps: [
      "「図面」タブを開きます",
      "対象図面を選択します",
      "「版履歴」より最新版を選択し、内容を確認します",
      "PDF ビューアで詳細を確認します(ピンチアウトによる拡大に対応)",
      "変更箇所にコメントを付与し、確認済処理を行います",
    ],
    tip: "図面は版管理されており、更新履歴(日時・更新者・変更内容)が記録されます。旧版での施工を防止できます。",
  },
  {
    time: "16:30 — 日報入力",
    title: "本日の作業日報の作成",
    situation:
      "当日の作業完了後、作業日報を作成・提出します。",
    action: "案件詳細「日報」タブより入力します。",
    steps: [
      "「日報」タブから「本日の日報」を選択します",
      "天候情報は気象庁 API から自動取得されます",
      "「作業内容」を音声入力で記録します",
      "出勤した作業員を選択します(前日の出勤者が候補に表示されます)",
      "「使用機械」「材料」を選択します(過去の入力履歴から候補が表示されます)",
      "「写真を添付」より本日撮影分から選択します",
      "「送信」により提出します",
    ],
    tip: "当日の写真・KY 記録・出勤データから日報の下書きが自動生成されるため、確認・微修正のみで提出可能です。",
  },
  {
    time: "17:00 — 退場前",
    title: "翌日の作業準備の確認",
    situation:
      "退場前に、翌日の作業内容・必要資材・人員配置を確認します。",
    action: "「カレンダー」および「通知」を確認します。",
    steps: [
      "サイドメニュー「カレンダー」で翌日の予定を確認します",
      "翌日の朝礼時刻・天気予報・予定作業がカード形式で表示されます",
      "「通知」より、職長からの指示および承認結果を確認します",
      "資材入荷予定を確認します",
    ],
    tip: "PWA のホーム画面ウィジェットにより、アプリ起動前に翌日の作業内容を確認することも可能です。",
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
            User Guide
          </p>
          <h1 className="text-3xl lg:text-5xl font-extralight tracking-wider text-[#1a1a1a]">
            利用シナリオ別 操作ガイド
          </h1>
          <div className="w-16 h-px bg-[#1a1a1a] mx-auto mt-6 mb-6" />
          <p className="text-sm text-gray-500 tracking-wide max-w-2xl mx-auto leading-relaxed">
            公共建築工事における典型的な業務フローを、管理者および現場担当者それぞれの視点で時系列に解説します。
            <br />
            実際の操作画面と入力項目を明示しているため、初回利用時から運用に組み込んでいただけます。
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
              管理者向け業務フロー
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
              現場担当者向け業務フロー
            </button>
          </div>
        </div>
      </section>

      {/* Demo account */}
      <section className="pb-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="bg-gray-50 border border-gray-100 p-6 lg:p-8">
            <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3">
              デモ環境での動作確認
            </p>
            <p className="text-sm text-[#1a1a1a] mb-4 tracking-wide leading-relaxed">
              下記の認証情報よりログイン可能です。デモ環境のデータは独立しており、他のテナントからは参照されません。
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-5 text-xs">
              <div className="bg-white border border-gray-200 px-4 py-3">
                <div className="text-gray-400 mb-1">
                  {role === "admin" ? "管理者" : "現場担当者"}メールアドレス
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
              ログイン画面を開く
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3 text-center">
            Workflow Timeline
          </p>
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] text-center mb-3">
            {role === "admin"
              ? "案件受注から完成引き渡しまで"
              : "1 日の業務スケジュール"}
          </h2>
          <p className="text-xs text-gray-500 text-center tracking-wide mb-16">
            {role === "admin"
              ? "工期 6 ヶ月の公共建築工事における管理者業務"
              : "現場担当者の標準的な業務(07:30〜17:00)"}
          </p>

          <div className="relative">
            <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-px" />

            <div className="space-y-12">
              {story.map((scene, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col ${
                    idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  } gap-6`}
                >
                  {/* 時間ラベル + 概要 */}
                  <div className="lg:w-1/2 flex lg:justify-end items-start pl-12 lg:pl-0 lg:pr-12">
                    <div
                      className={`${
                        idx % 2 === 0 ? "lg:text-right" : "lg:text-left"
                      } w-full lg:max-w-sm`}
                    >
                      <div className="flex lg:inline-flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                          {scene.time}
                        </span>
                      </div>
                      <h3 className="text-lg lg:text-xl font-medium tracking-wider text-[#1a1a1a] mb-3">
                        {scene.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed tracking-wide">
                        {scene.situation}
                      </p>
                    </div>
                  </div>

                  {/* タイムラインのドット */}
                  <div className="absolute left-4 lg:left-1/2 top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-[#1a1a1a] ring-4 ring-white" />

                  {/* 操作カード */}
                  <div className="lg:w-1/2 pl-12 lg:pl-12">
                    <div className="border border-gray-200 p-6 lg:p-7 bg-white">
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
                            className="text-xs text-gray-600 leading-relaxed tracking-wide flex gap-3"
                          >
                            <span className="flex-shrink-0 w-5 h-5 bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-medium">
                              {si + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {scene.tip && (
                        <div className="bg-gray-50 border-l-2 border-gray-300 pl-3 py-2 mt-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700 leading-relaxed tracking-wide">
                              <span className="font-medium">補足: </span>
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
                          className="text-[10px] tracking-[0.2em] text-gray-500 uppercase hover:text-[#1a1a1a] inline-flex items-center gap-1 mt-4"
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
            Try It Out
          </p>
          <h2 className="text-2xl lg:text-3xl font-extralight tracking-wider text-[#1a1a1a] mb-6">
            実際に操作して動作をご確認ください
          </h2>
          <p className="text-sm text-gray-600 tracking-wide mb-8 leading-relaxed">
            デモ環境では、本資料に記載した全機能をお試しいただけます。
            <br />
            ご不明点については、お問い合わせフォームよりご連絡ください。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${PRODUCTION_URL}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white px-8 py-3 text-sm tracking-wider transition-colors"
            >
              {role === "admin"
                ? "管理者アカウントでログイン"
                : "現場担当者アカウントでログイン"}
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => setRole(role === "admin" ? "worker" : "admin")}
              className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-white text-[#1a1a1a] px-8 py-3 text-sm tracking-wider transition-colors"
            >
              {role === "admin"
                ? "現場担当者向けフローを表示"
                : "管理者向けフローを表示"}
            </button>
          </div>
          <div className="mt-12 pt-12 border-t border-gray-200">
            <Link
              href="/guide"
              className="text-xs text-gray-500 hover:text-[#1a1a1a] tracking-wide"
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
          <p className="text-xs text-gray-500 tracking-wide">
            公共建築工事SaaS · 公共建築工事標準仕様書(令和7年版)準拠
          </p>
        </div>
      </footer>
    </div>
  );
}
