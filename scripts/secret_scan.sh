#!/usr/bin/env bash
# Secret scanner — fail fast if API keys / passwords leak into staged files.
# Hook into .git/hooks/pre-commit:
#     #!/usr/bin/env bash
#     ./scripts/secret_scan.sh

set -e

# 検出パターン (POSIX ERE)
PATTERNS=(
  'sk_(live|test)_[A-Za-z0-9]{20,}'   # Stripe secret keys
  'pk_(live|test)_[A-Za-z0-9]{20,}'   # Stripe publishable
  're_[A-Za-z0-9_-]{20,}'             # Resend API keys
  'AKIA[A-Z0-9]{16}'                  # AWS access key ID
  'aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{30,}'
  'ghp_[A-Za-z0-9]{30,}'              # GitHub PAT
  'gho_[A-Za-z0-9]{30,}'
  'glpat-[A-Za-z0-9_-]{20,}'          # GitLab PAT
  'AIza[A-Za-z0-9_-]{30,}'            # Google API
  'xox[abprs]-[A-Za-z0-9-]{10,}'      # Slack tokens
  'BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY'
)

# Files to check: staged unless arg given
if [ -n "$1" ]; then
  FILES="$@"
else
  FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null)
fi

if [ -z "$FILES" ]; then
  echo "[secret-scan] no staged files; nothing to scan"
  exit 0
fi

FAIL=0
for f in $FILES; do
  if [ ! -f "$f" ]; then continue; fi
  # binary files をスキップ
  if file "$f" 2>/dev/null | grep -qE "binary|image|audio|video"; then continue; fi
  for pat in "${PATTERNS[@]}"; do
    matches=$(grep -nE "$pat" "$f" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      echo "[secret-scan] LEAKED secret in $f:"
      echo "$matches" | head -5
      FAIL=1
    fi
  done
done

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "[secret-scan] commit blocked — remove the secrets and try again"
  echo "             use environment variables instead of hardcoding."
  exit 1
fi

echo "[secret-scan] OK — no secrets detected"
exit 0
