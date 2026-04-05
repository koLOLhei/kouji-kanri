# 工事管理SaaS - 公共建築工事 案件管理・写真管理・書類自動生成

## プロジェクト概要
公共建築工事標準仕様書（建築工事編）令和7年版に基づく包括的施工管理SaaS。
マルチテナント対応で他社へSaaS販売可能。

## アーキテクチャ
```
【モバイルPWA / PC ブラウザ】
        ↓
【Next.js 16 フロントエンド】 (localhost:3001)
        ↓
【FastAPI バックエンド】 (localhost:8001)
        ↓
【PostgreSQL】 + 【ローカルファイルストレージ (→ 本番はS3)】
```

## 技術スタック
- **バックエンド**: FastAPI + SQLAlchemy + PostgreSQL (`backend/`)
- **フロントエンド**: Next.js 16 + React + TypeScript + Tailwind CSS (`frontend/`)
- **PDF生成**: Jinja2テンプレート + WeasyPrint
- **認証**: JWT (SHA256ハッシュ)
- **ストレージ**: ローカルファイル (dev) / S3互換 (prod)

## 起動方法
```bash
cd backend && ../venv/bin/uvicorn main:app --port 8001 --reload
cd frontend && npm run dev -- -p 3001
```

## デモアカウント
- admin@demo.co.jp / admin123 (管理者)
- worker@demo.co.jp / worker123 (作業員)

## 全機能一覧

### 基本機能
| 機能 | API | フロントエンド |
|------|-----|---------------|
| 案件管理 | /api/projects | /projects |
| 工程管理 | /api/projects/{id}/phases | /projects/[id] |
| 仕様書から工程自動生成 | POST .../init-from-spec | 案件詳細ページ |
| 書類チェックリスト | .../phases/{pid}/checklist | 工程詳細ページ |
| 写真アップロード (EXIF抽出) | POST .../photos | /projects/[id]/phases/[pid] |
| モバイル写真撮影 (PWA) | POST .../photos | /capture |
| 報告書管理 | /api/projects/{id}/reports | 工程詳細ページ |
| 提出書類自動生成 | POST .../submissions/generate | 工程詳細ページ |
| 仕様書ブラウザ | /api/specs/chapters | /specs |

### 施工管理機能
| 機能 | API | フロントエンド |
|------|-----|---------------|
| 日報管理 | .../daily-reports | /projects/[id]/daily-reports |
| 安全管理 (KY/巡回/ヒヤリ/教育) | .../safety/* | /projects/[id]/safety |
| 検査管理 | .../inspections | /projects/[id]/inspections |
| 資材管理 (発注/試験) | .../materials/* | /projects/[id]/materials |
| 工事原価管理 | .../costs/* | /projects/[id]/costs |
| 図面管理 (版管理) | .../drawings | /projects/[id]/drawings |
| 下請契約管理 | .../contracts | /projects/[id]/contracts |
| 是正措置管理 (NCR) | .../corrective-actions | /projects/[id]/corrective-actions |
| カレンダー・マイルストーン | .../calendar, .../milestones | /projects/[id]/calendar |
| 天候記録 | .../weather | カレンダー連携 |
| 打合せ記録 | .../meetings | /projects/[id]/meetings |
| 出来形管理 | .../measurements | /projects/[id]/measurements |
| 廃棄物管理 (マニフェスト) | .../waste-manifests | /projects/[id]/waste |

### 管理効率化機能
| 機能 | API | フロントエンド |
|------|-----|---------------|
| 書類ダッシュボード | .../documents/dashboard | /projects/[id]/documents |
| 一括書類生成 | POST .../documents/batch-generate | 書類ダッシュボード |
| 不足書類一覧 | .../documents/missing | 書類ダッシュボード |
| 承認キュー | /api/approval-queue | /approval |
| 期限アラート | /api/alerts | /health |
| プロジェクトヘルス | /api/project-health | /health |
| 今日のワークフロー | /api/today | /today |

### 組織管理機能
| 機能 | API | フロントエンド |
|------|-----|---------------|
| 作業員管理 | /api/workers | /workers |
| 資格管理 (期限通知) | /api/workers/{id}/qualifications | /workers/[id] |
| 出勤管理 | .../attendance | 案件内 |
| 協力業者管理 | /api/subcontractors | /subcontractors |
| 車両・重機管理 | /api/equipment | /equipment |

### プラットフォーム機能
| 機能 | API | フロントエンド |
|------|-----|---------------|
| 通知 (未読バッジ) | /api/notifications | /notifications |
| コメント (汎用) | /api/comments | 各詳細画面 |
| 監査ログ | /api/audit-logs | /admin/audit-logs |
| CSVエクスポート | .../exports/* | 各画面のボタン |
| グローバル検索 | /api/search | /search |
| 一括ダウンロード | .../bulk-download | 書類ダッシュボード |

### SaaS管理
| 機能 | API | フロントエンド |
|------|-----|---------------|
| テナント管理 | /api/tenants | /admin/tenants |
| プラン管理 | /api/tenants/plans | テナント画面 |
| ユーザー管理 | /api/tenants/{id}/users | /admin/tenants/[id] |
| 収益ダッシュボード | /api/tenants/stats/overview | /admin |
| 地域仕様管理 | /api/regions | 設定 |

## SaaSプラン
| プラン | 月額 | 案件数 | ユーザー数 |
|---|---|---|---|
| フリー | ¥0 | 3 | 5 |
| スタンダード | ¥29,800 | 20 | 30 |
| エンタープライズ | ¥98,000 | 無制限 | 無制限 |

## 重要ルール
- `except Exception: pass` 禁止
- フロントエンドからバックエンドは `http://127.0.0.1:8001` に直接アクセス
- DBスキーマ変更時は Alembic マイグレーション推奨
