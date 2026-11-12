#!/bin/sh
# Runs the e2e tests on a seeded DHIS2 started with d2-docker. See --help.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)

# The instance belongs to this script, so its users are fixed
username=e2e
password=E2e-tests-1
admin_auth=admin:district

usage() {
    cat <<EOF
Usage: yarn test:e2e:docker [OPTIONS] [-- PLAYWRIGHT_ARGS...]

Starts a seeded DHIS2 with d2-docker, installs the app, runs the e2e tests and stops the
instance. If the same image is already running (for example after --keep), it uses it.

The first run of a version builds its images, which takes a few minutes. Later runs start in
about a minute, each with a clean database.

Options:
  --version VERSION   DHIS2 version: 42 (42.5.1), 40 (40.9.0) or a full one (default: 42)
  --port PORT         Port of the instance (default: 8099 for v42, 8100 for v40)
  --app ZIP           App to install (default: hmis-dictionary.zip, built if missing or older
                      than src/)
  --no-app            Do not build or install the app. The instance has none, so this is for
                      an app served elsewhere, with E2E_BASE_URL (for example yarn start)
  --keep              Leave the instance running at the end
  --rebuild           Build the data image again, even if it exists
  -h, --help          Show this help

Images (local only):
  hmis-e2e/dhis2-core:VERSION        built from the DHIS2 release WAR
  hmis-e2e/dhis2-data:VERSION-HASH   the seed, where HASH changes when the seed changes

Users: $username / $password (superuser, for the tests), admin / district.

Examples:
  yarn test:e2e:docker
  yarn test:e2e:docker --version 40 --keep -- --project=read -g Search
EOF
}

version=42
port=""
app_zip="$root/hmis-dictionary.zip"
app_given=false
install_app=true
keep=false
rebuild=false

while [ $# -gt 0 ]; do
    case "$1" in
        --version) version=$2; shift 2 ;;
        --port) port=$2; shift 2 ;;
        --app) app_zip=$2; app_given=true; shift 2 ;;
        --no-app) install_app=false; shift ;;
        --keep) keep=true; shift ;;
        --rebuild) rebuild=true; shift ;;
        -h | --help) usage; exit 0 ;;
        --) shift; break ;;
        *) echo "Unknown option: $1 (see --help)" >&2; exit 2 ;;
    esac
done

case "$version" in
    42) version=42.5.1 ;;
    40) version=40.9.0 ;;
esac
if [ -z "$port" ]; then
    case "${version%%.*}" in 40) port=8100 ;; *) port=8099 ;; esac
fi
url=http://localhost:$port

log() { echo "[e2e] $*" >&2; }

command -v d2-docker >/dev/null || { log "d2-docker is not installed"; exit 1; }

seed_hash() {
    cat "$here"/seed/* "$here/seed.sh" "$here/scripts/prepare-import.py" "$here/scripts/test-user.py" |
        sha256sum | cut -c1-8
}

data_image="hmis-e2e/dhis2-data:$version-$(seed_hash)"
core_image="hmis-e2e/dhis2-core:$version"
started=false

image_exists() { docker image inspect "$1" >/dev/null 2>&1; }

is_running() {
    [ -n "$(docker ps -q --filter "label=com.eyeseetea.image-name=$data_image")" ]
}

answers() {
    [ "$(curl -s -o /dev/null -w "%{http_code}" "$url/api/system/ping")" != "000" ]
}

wait_up() {
    tries=0
    until [ "$(curl -s -o /dev/null -w "%{http_code}" -u "$admin_auth" "$url/api/system/ping")" = "200" ]; do
        tries=$((tries + 1))
        [ "$tries" -lt 120 ] || { log "DHIS2 did not start at $url"; return 1; }
        sleep 5
    done
}

stop_instance() {
    if [ "$started" = true ] && [ "$keep" = false ]; then
        log "Stopping $data_image"
        d2-docker stop "$data_image" >/dev/null 2>&1 || true
    fi
}
trap stop_instance EXIT
trap 'exit 130' INT TERM

seed() {
    E2E_DHIS2_URL=$url E2E_USERNAME=$username E2E_PASSWORD=$password E2E_ADMIN_AUTH=$admin_auth \
        "$here/seed.sh" "$@"
}

start() {
    # d2-docker's default heap (7.5 GB) thrashes with parallel workers
    d2-docker start "$data_image" --port "$port" --detach --java-opts=-Xmx15g
    started=true
}

build_data_image() {
    if ! image_exists "$core_image"; then
        log "Building $core_image from the DHIS2 $version release"
        d2-docker create core "$core_image" --version "$version"
    fi
    log "Building $data_image: empty database, seed, commit"
    empty=$(mktemp -d)
    : >"$empty/empty.sql"
    d2-docker create data "$data_image" --sql "$empty/empty.sql"
    rm -rf "$empty"
    start
    if ! { wait_up && seed && d2-docker commit --folders apps -- "$data_image"; }; then
        log "Seeding failed: removing $data_image"
        d2-docker stop "$data_image" >/dev/null 2>&1 || true
        d2-docker rm "$data_image" >/dev/null 2>&1 || true
        started=false
        exit 1
    fi
}

if is_running && [ "$rebuild" = false ]; then
    log "Using the running $data_image at $url"
else
    if answers; then
        log "Port $port is in use by something else: stop it, or use --port"
        exit 1
    fi
    if [ "$rebuild" = true ] && image_exists "$data_image"; then
        d2-docker rm "$data_image" >/dev/null 2>&1 || true
    fi
    if image_exists "$data_image"; then
        log "Starting $data_image on port $port"
        start
        wait_up
    else
        build_data_image
    fi
fi

if [ "$install_app" = true ]; then
    if [ "$app_given" = false ] && { [ ! -f "$app_zip" ] || [ -n "$(find "$root/src" -newer "$app_zip" -print -quit)" ]; }; then
        log "Building the app"
        (cd "$root" && yarn build)
    fi
    log "Installing $app_zip"
    status=$(curl -sS -o /dev/null -w "%{http_code}" -u "$admin_auth" -F "file=@$app_zip" "$url/api/apps" || true)
    case "$status" in 2*) ;; *) log "App install failed: $status"; exit 1 ;; esac
fi

log "Running the tests on $url"
status=0
E2E_DHIS2_URL=$url E2E_USERNAME=$username E2E_PASSWORD=$password \
    npx playwright test -c "$root/e2e/playwright.config.ts" "$@" || status=$?

if [ "$started" = true ] && [ "$keep" = true ]; then
    log "Left running: $url (user $username, password $password). Stop it with: d2-docker stop $data_image"
fi
exit $status
