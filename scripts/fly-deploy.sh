#!/usr/bin/env bash
# Exact Fly.io deploy path for Death Metal Fetch.
# Usage:
#   ./scripts/fly-deploy.sh                  # print commands + run if authed
#   ./scripts/fly-deploy.sh --print-only     # print only
#   ./scripts/fly-deploy.sh --secrets-file /path/to/callmebot.env
#
# Never commit CallMeBot credentials. Pass them via --secrets-file or env.

set -euo pipefail

APP_NAME="${FLY_APP_NAME:-death-metal-fetch}"
REGION="${FLY_REGION:-iad}"
VOLUME_NAME="${FLY_VOLUME_NAME:-dmf_data}"
SECRETS_FILE=""
PRINT_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --print-only) PRINT_ONLY=1; shift ;;
    --secrets-file)
      SECRETS_FILE="${2:-}"
      shift 2
      ;;
    --app)
      APP_NAME="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

export FLYCTL_INSTALL="${FLYCTL_INSTALL:-$HOME/.fly}"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

if ! command -v flyctl >/dev/null 2>&1 && ! command -v fly >/dev/null 2>&1; then
  echo "BLOCKER: flyctl not installed."
  echo "Install: curl -L https://fly.io/install.sh | sh"
  echo "Then:    export FLYCTL_INSTALL=\"\$HOME/.fly\"; export PATH=\"\$FLYCTL_INSTALL/bin:\$PATH\""
  exit 1
fi

FLY=(flyctl)
command -v flyctl >/dev/null 2>&1 || FLY=(fly)

cat <<EOF
=== Death Metal Fetch — Fly.io deploy ===
App:     ${APP_NAME}
Region:  ${REGION}
Volume:  ${VOLUME_NAME} → /data (SQLite)
Port:    3847 (HTTPS terminated by Fly)

Exact commands (run from repo root after fly auth login):

  # 0) Auth (browser / token) — required once per machine
  flyctl auth login

  # 1) Create app (skip if fly.toml already matches an existing app)
  flyctl apps create ${APP_NAME} --org personal
  # If name taken: edit fly.toml \`app =\` and re-run with --app <new-name>

  # 2) SQLite volume (1 GB free-tier friendly; one volume per machine)
  flyctl volumes create ${VOLUME_NAME} --size 1 --region ${REGION} --app ${APP_NAME} --yes

  # 3) Secrets (never commit these)
  flyctl secrets set \\
    CALLMEBOT_PHONE='YOUR_PHONE_DIGITS' \\
    CALLMEBOT_APIKEY='YOUR_CALLMEBOT_KEY' \\
    POLL_SECRET="\$(openssl rand -hex 24)" \\
    --app ${APP_NAME}

  # 4) Deploy
  flyctl deploy --app ${APP_NAME}

  # 5) Verify
  flyctl status --app ${APP_NAME}
  flyctl logs --app ${APP_NAME}
  # Public URL only after success: https://${APP_NAME}.fly.dev

EOF

if [[ "$PRINT_ONLY" -eq 1 ]]; then
  exit 0
fi

if ! "${FLY[@]}" auth whoami >/dev/null 2>&1; then
  echo "BLOCKER: flyctl is installed but NOT authenticated on this machine."
  echo "You must run:  flyctl auth login"
  echo "Then re-run:   ./scripts/fly-deploy.sh --secrets-file /path/to/callmebot-credentials.env"
  echo "Deploy will not invent a public URL until this succeeds."
  exit 2
fi

echo "Authenticated as: $("${FLY[@]}" auth whoami)"
echo "Proceeding with create / volume / secrets / deploy…"

# Create app if missing
if ! "${FLY[@]}" apps list 2>/dev/null | grep -qw "$APP_NAME"; then
  "${FLY[@]}" apps create "$APP_NAME" --org personal || true
fi

# Volume if missing
if ! "${FLY[@]}" volumes list --app "$APP_NAME" 2>/dev/null | grep -qw "$VOLUME_NAME"; then
  "${FLY[@]}" volumes create "$VOLUME_NAME" --size 1 --region "$REGION" --app "$APP_NAME" --yes
fi

# Secrets
POLL_SECRET_VALUE="${POLL_SECRET:-$(openssl rand -hex 24)}"
PHONE="${CALLMEBOT_PHONE:-}"
APIKEY="${CALLMEBOT_APIKEY:-}"

if [[ -n "$SECRETS_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # Only load KEY=VALUE lines; file must not be committed
  source "$SECRETS_FILE"
  set +a
  PHONE="${CALLMEBOT_PHONE:-$PHONE}"
  APIKEY="${CALLMEBOT_APIKEY:-$APIKEY}"
fi

if [[ -z "$PHONE" || -z "$APIKEY" ]]; then
  echo "WARN: CALLMEBOT_PHONE / CALLMEBOT_APIKEY not set — deploying with POLL_SECRET only (WhatsApp dry-run)."
  "${FLY[@]}" secrets set "POLL_SECRET=${POLL_SECRET_VALUE}" --app "$APP_NAME"
else
  "${FLY[@]}" secrets set \
    "CALLMEBOT_PHONE=${PHONE}" \
    "CALLMEBOT_APIKEY=${APIKEY}" \
    "POLL_SECRET=${POLL_SECRET_VALUE}" \
    --app "$APP_NAME"
fi

"${FLY[@]}" deploy --app "$APP_NAME"
"${FLY[@]}" status --app "$APP_NAME"

echo ""
echo "Deploy finished. Public URL (only after success): https://${APP_NAME}.fly.dev"
