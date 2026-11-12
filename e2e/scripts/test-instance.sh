#!/bin/sh
# Runs the e2e tests on an existing DHIS2 instance. See --help.
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)

usage() {
    cat <<EOF
Usage: yarn test:e2e:instance --url URL --auth USER:PASSWORD [OPTIONS] [-- PLAYWRIGHT_ARGS...]

Runs the e2e tests on an existing instance, as it is: it installs nothing unless --app is given.
For a seeded local instance, use yarn test:e2e:docker instead.

The write tests change the instance (and restore it). On a shared instance, run only the
read-only ones: -- --project=read

Options:
  --url URL             Instance, for example http://localhost:8098
  --auth USER:PASSWORD  User with full access, with English as its language
  --app ZIP             Install this app zip first
  --app-key KEY         Key of the app on the instance (default: HMIS-Dictionary)
  -h, --help            Show this help

Examples:
  yarn test:e2e:instance --url http://localhost:8098 --auth pentaho:secret -- -g Search
  yarn test:e2e:instance --url https://example.org --auth user:secret -- --project=read
EOF
}

url=""
auth=""
app_zip=""
app_key=""

while [ $# -gt 0 ]; do
    case "$1" in
        --url) url=${2%/}; shift 2 ;;
        --auth) auth=$2; shift 2 ;;
        --app) app_zip=$2; shift 2 ;;
        --app-key) app_key=$2; shift 2 ;;
        -h | --help) usage; exit 0 ;;
        --) shift; break ;;
        *) echo "Unknown option: $1 (see --help)" >&2; exit 2 ;;
    esac
done

[ -n "$url" ] && [ -n "$auth" ] || { usage >&2; exit 2; }

log() { echo "[e2e] $*" >&2; }

status=$(curl -s -o /dev/null -w "%{http_code}" -u "$auth" "$url/api/system/ping" || true)
[ "$status" = "200" ] || { log "$url does not answer with these credentials ($status)"; exit 1; }

if [ -n "$app_zip" ]; then
    log "Installing $app_zip"
    status=$(curl -sS -o /dev/null -w "%{http_code}" -u "$auth" -F "file=@$app_zip" "$url/api/apps" || true)
    case "$status" in 2*) ;; *) log "App install failed: $status"; exit 1 ;; esac
fi

log "Running the tests on $url"
export E2E_DHIS2_URL=$url E2E_USERNAME=${auth%%:*} E2E_PASSWORD=${auth#*:}
[ -z "$app_key" ] || export E2E_APP_KEY=$app_key
exec npx playwright test -c "$root/e2e/playwright.config.ts" "$@"
