# 本番ストレージセットアップ (写真・PDFの永続化)

現状: ローカルファイルシステム (`backend/storage/`) を使用。**Renderコンテナは再デプロイ毎に消失**するため、本番運用には外部ストレージ必須。

## 選択肢

### Option A: Cloudflare R2 (推奨・無料 10GB)

1. https://dash.cloudflare.com → R2 → Create bucket
2. バケット名: 例 `kouji-kanri-prod`
3. R2 API トークン作成 (R2 Object Read & Write 権限)
4. Render ダッシュボードで `kouji-kanri-api` サービス → Environment:
   ```
   S3_ENDPOINT     = https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY   = <token-access-key>
   S3_SECRET_KEY   = <token-secret-key>
   S3_BUCKET       = kouji-kanri-prod
   S3_REGION       = auto
   ```
5. Save → 自動再デプロイ → 写真/PDFが R2 に永続化

### Option B: Render Persistent Disk ($7/月)

`render.yaml` に追加（要 Starter プラン以上）:
```yaml
services:
  - type: web
    name: kouji-kanri-api
    plan: starter        # ← free から starter に変更
    disk:
      name: kouji-kanri-storage
      mountPath: /var/data
      sizeGB: 5
```
- 既存のローカルファイルパス `backend/storage/` は自動で `/var/data/storage` を優先使用 (storage_service.py 内 `_RENDER_PERSISTENT_PATH` 参照)

### Option C: AWS S3

R2 と同じ env vars で `S3_ENDPOINT=https://s3.amazonaws.com`, `S3_REGION=ap-northeast-1` 等を設定。

## 確認方法

設定後、`/api/health` の `storage` フィールドが `local (WARNING...)` から消えれば成功。

```bash
curl https://kouji-kanri-api.onrender.com/api/health
# {"status":"ok","service":"kouji-kanri"} ← warning消滅
```

## コード側の対応 (すでに実装済)

`backend/services/storage_service.py` は以下の優先順位で動作:
1. S3 / R2 (env vars 設定時)
2. Render persistent disk (`/var/data/storage` 存在時)
3. ローカル `backend/storage/` (フォールバック・本番非推奨)

env vars or disk が設定されれば**コード変更不要で自動切替**。
