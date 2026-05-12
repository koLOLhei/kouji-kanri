# SECURITY INCIDENT — Resend API Key Leak in Git History

## 概要

Resend API キー `re_REDACTED_LEAKED_KEY` が、GitHub の **public** リポジトリ
`koLOLhei/kouji-kanri` の Git 履歴に残存しています。

## 該当コミット

- `eee9bf7` (2026-04-12) — `render.yaml` に API キーをハードコード追加
- `c6ed9f2` (2026-04-12) — GitGuardian 検知後、最新コミットからは削除

ファイルから削除されただけで、Git 履歴の `eee9bf7` 内には今もキーが残ります。

## リスク

- リポジトリが public のため、誰でも `git log -p` で取得可能
- 第三者が `noreply@soara-mu.com` から任意のメールを送信可能 (フィッシング、なりすまし)
- 自動スキャンボット (GitGuardian, Truffle 等) は既にスキャン済みの可能性
- 漏洩したキーが他のサービスでも流用されている場合、影響範囲が拡大

## 必須対応 (ユーザー側)

### 1. Resend ダッシュボードでキーを revoke
   - https://resend.com/api-keys
   - 該当キーを削除し、新しいキーを発行
   - 新しいキーは Render の環境変数（`backend/.env` ではない）に設定

### 2. Git 履歴からキーを完全除去
   ```bash
   # 推奨: git-filter-repo (BFG Repo-Cleaner より新しい)
   pip install git-filter-repo
   cd /Users/koheiogawa/kouji-kanri
   git filter-repo --replace-text <(echo "re_REDACTED_LEAKED_KEY==>***REMOVED***")
   git push origin --force --all
   git push origin --force --tags
   ```
   ⚠️ force push は協業者全員にローカルクローンの再取得を要求します。

### 3. 影響範囲の調査
   - Resend ダッシュボードでキー作成日 〜 revoke 日の送信ログを確認
   - 不審な送信先・件数があれば外部に通知

## 私（コード側）が実施した対策

1. **本来の `.env` は `.gitignore` で守られている** — 新規漏洩は無い
2. **pre-commit hook を追加** — 同種パターンの漏洩を未然に防ぐ (下記参照)
3. **CI スキャンスクリプト追加** — Git 履歴を常時 scan

## pre-commit secret scan

`scripts/secret_scan.sh` を追加。`git diff --cached` を走査し、API キー類が含まれていれば commit をブロックします。

```bash
# 手動チェック
./scripts/secret_scan.sh
```
