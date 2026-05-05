#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# push_to_github.sh
#
# Creates the GitHub repository (if it does not exist) then pushes the
# local folder contents to it.
#
# Usage:
#   chmod +x push_to_github.sh
#   ./push_to_github.sh
#
# Requirements:
#   - git
#   - curl
#   - A GitHub Personal Access Token with repo scope
#     stored in the GITHUB_TOKEN environment variable
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────────
GITHUB_USER="vomosev"
REPO_NAME="claimd-portal"
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
BRANCH="main"
GIT_NAME="Victor Omos"
GIT_EMAIL="victor@gridlockaz.com"
COMMIT_MSG="Automated Commit"

# ── Colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Check GITHUB_TOKEN ─────────────────────────────────────────────────────────
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  error "GITHUB_TOKEN environment variable is not set."
  error "Create a token at: https://github.com/settings/tokens"
  error "Then run:  export GITHUB_TOKEN=ghp_yourtoken"
  exit 1
fi

# ── Check git is available ─────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  error "git is not installed."
  exit 1
fi

if ! command -v curl &>/dev/null; then
  error "curl is not installed."
  exit 1
fi

# ── Step 1: Create the GitHub repository if it doesn't exist ──────────────────
info "Checking if repository ${GITHUB_USER}/${REPO_NAME} exists on GitHub…"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}")

if [[ "$HTTP_STATUS" == "200" ]]; then
  success "Repository already exists — skipping creation."
elif [[ "$HTTP_STATUS" == "404" ]]; then
  info "Repository not found — creating it now…"

  CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/user/repos" \
    -d "{
      \"name\":        \"${REPO_NAME}\",
      \"private\":     false,
      \"auto_init\":   false,
      \"description\": \"Claimd Portal\"
    }")

  # Last line is the HTTP status code
  CREATE_STATUS=$(echo "$CREATE_RESPONSE" | tail -1)
  CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n -1)

  if [[ "$CREATE_STATUS" == "201" ]]; then
    success "Repository created: https://github.com/${GITHUB_USER}/${REPO_NAME}"
  else
    error "Failed to create repository (HTTP ${CREATE_STATUS}):"
    echo "$CREATE_BODY" >&2
    exit 1
  fi
else
  error "Unexpected HTTP status ${HTTP_STATUS} when checking repository."
  exit 1
fi

# ── Step 2: Configure git identity ────────────────────────────────────────────
info "Configuring git identity…"
git config user.name  "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"
success "Identity set to ${GIT_NAME} <${GIT_EMAIL}>"

# ── Step 3: Initialise git if not already a repo ──────────────────────────────
if [[ ! -d ".git" ]]; then
  info "Initialising new git repository…"
  git init
  git checkout -b "${BRANCH}" 2>/dev/null || git branch -M "${BRANCH}"
  success "Initialised."
else
  info "Git repository already initialised."
  # Ensure we are on the correct branch
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    info "Switching to branch ${BRANCH}…"
    git checkout -B "${BRANCH}" 2>/dev/null || git checkout "${BRANCH}"
  fi
fi

# ── Step 4: Add / update the remote ───────────────────────────────────────────
# Use token-authenticated URL so push does not prompt for credentials
AUTH_REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

if git remote get-url origin &>/dev/null; then
  info "Remote 'origin' exists — updating URL…"
  git remote set-url origin "${AUTH_REMOTE_URL}"
else
  info "Adding remote 'origin'…"
  git remote add origin "${AUTH_REMOTE_URL}"
fi

# Also add/update the named 'github' remote from the original command
if git remote get-url github &>/dev/null; then
  git remote set-url github "${AUTH_REMOTE_URL}"
else
  git remote add github "${AUTH_REMOTE_URL}"
fi

success "Remotes configured."
git remote -v

# ── Step 5: Stage and commit all local files ───────────────────────────────────
info "Staging all files…"
git add .

# Only commit if there is something to commit
if git diff --cached --quiet; then
  warn "Nothing to commit — working tree is clean."
else
  info "Committing…"
  git commit -m "${COMMIT_MSG}"
  success "Committed: ${COMMIT_MSG}"
fi

# ── Step 6: Pull remote changes (if any) ──────────────────────────────────────
# Only attempt a pull if the remote branch exists
info "Checking for remote branch ${BRANCH}…"

REMOTE_EXISTS=$(git ls-remote --heads origin "${BRANCH}" | wc -l | tr -d ' ')

if [[ "$REMOTE_EXISTS" -gt "0" ]]; then
  info "Remote branch exists — pulling (allow unrelated histories)…"
  git pull origin "${BRANCH}" \
    --allow-unrelated-histories \
    --no-rebase \
    -X ours \
    --no-edit \
    2>/dev/null || warn "Pull had conflicts but ours strategy was applied."
  success "Pull complete."
else
  info "Remote branch does not exist yet — skipping pull."
fi

# ── Step 7: Push to origin ────────────────────────────────────────────────────
info "Pushing to origin/${BRANCH}…"
git push origin "${BRANCH}" --force
success "Pushed to origin/${BRANCH}"

# ── Step 8: Push all branches and tags ────────────────────────────────────────
info "Pushing all branches…"
git push origin --force --all
success "All branches pushed."

info "Pushing all tags…"
git push origin --tags
success "All tags pushed."

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}  ✓  Repository: https://github.com/${GITHUB_USER}/${REPO_NAME}${NC}"
echo -e "${GREEN}  ✓  Branch:     ${BRANCH}${NC}"
echo -e "${GREEN}────────────────────────────────────────────────────────────${NC}"
echo ""
