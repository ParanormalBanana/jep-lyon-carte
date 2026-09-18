#!/usr/bin/env bash
# Run this on your laptop (where `gh` is already logged in), not in the Cloud Agent VM.
set -euo pipefail

NAME="${1:-jep-lyon-carte}"

if ! command -v gh >/dev/null; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Not logged into GitHub CLI. Run: gh auth login"
  exit 1
fi

OWNER="$(gh api user -q .login)"
TARGET="$OWNER/$NAME"

if gh repo view "$TARGET" >/dev/null 2>&1; then
  echo "Repo $TARGET already exists — pushing main."
  if git remote get-url github >/dev/null 2>&1; then
    git remote set-url github "https://github.com/$TARGET.git"
  else
    git remote add github "https://github.com/$TARGET.git"
  fi
  git push -u github HEAD:main
else
  gh repo create "$NAME" --public --source=. --remote=github --push
fi

# First call creates Pages with Actions as source; ignore if it already exists.
gh api -X POST "repos/$TARGET/pages" -f build_type=workflow >/dev/null 2>&1 || true

echo
echo "Pushed to https://github.com/$TARGET"
echo "Pages URL (after the GitHub Pages workflow is green): https://$OWNER.github.io/$NAME/"
echo "If the first run waits for approval: repo → Actions → GitHub Pages → Review deployments."
echo "If 404: Settings → Pages → Source = GitHub Actions."
