#!/bin/sh
# Fills an empty DHIS2 with the e2e seed: metadata, the HMIS_Dictionary configuration, the test
# user and, optionally, the app. It can run again on a seeded instance: it updates what exists.
#
#   E2E_DHIS2_URL=http://localhost:8099 E2E_USERNAME=e2e E2E_PASSWORD=... \
#       e2e/instance/seed.sh [--user-only] [path/to/app.zip]
#
# --user-only only creates or updates the test user. E2E_ADMIN_AUTH is the superuser that seeds
# (default admin:district).
set -eu

here=$(cd "$(dirname "$0")" && pwd)
url="${E2E_DHIS2_URL:-http://localhost:8099}"
admin="${E2E_ADMIN_AUTH:-admin:district}"
username="${E2E_USERNAME:?Set E2E_USERNAME}"
password="${E2E_PASSWORD:?Set E2E_PASSWORD}"
user_only=false
if [ "${1:-}" = "--user-only" ]; then
    user_only=true
    shift
fi
app_zip="${1:-}"

api() {
    method=$1
    path=$2
    shift 2
    curl -sS -u "$admin" -X "$method" -H "Content-Type: application/json" "$url/api/$path" "$@"
}

echo "Waiting for $url"
tries=0
until [ "$(curl -s -o /dev/null -w "%{http_code}" -u "$admin" "$url/api/system/ping")" = "200" ]; do
    tries=$((tries + 1))
    [ "$tries" -lt 120 ] || { echo "DHIS2 did not start" >&2; exit 1; }
    sleep 5
done

if [ "$user_only" = false ]; then
    echo "Importing metadata"
    defaults="{"
    for collection in categoryOptions categories categoryCombos categoryOptionCombos; do
        id=$(api GET "$collection?filter=name:eq:default&fields=id&paging=false" |
            python3 -I -c "import json, sys; print(json.load(sys.stdin)['$collection'][0]['id'])")
        defaults="$defaults\"$collection\": \"$id\","
    done
    defaults="${defaults%,}}"
    for part in 1 2; do
        python3 -I "$here/scripts/prepare-import.py" "$here/seed" "$defaults" "$part" |
            api POST "metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=NONE" --data-binary @- \
                >"$here/.import-report.json"
        python3 -I "$here/scripts/import-report.py" "$here/.import-report.json"
    done

    echo "Writing the HMIS_Dictionary configuration"
    python3 -I -c '
import json, sys
for namespace, keys in json.load(open(sys.argv[1])).items():
    for key, value in keys.items():
        print(namespace, key, json.dumps(value))
' "$here/seed/datastore.json" | while read -r namespace key value; do
        status=$(api PUT "dataStore/$namespace/$key" -o /dev/null -w "%{http_code}" --data-raw "$value")
        if [ "$status" = "404" ]; then
            status=$(api POST "dataStore/$namespace/$key" -o /dev/null -w "%{http_code}" --data-raw "$value")
        fi
        case "$status" in 2*) ;; *) echo "dataStore $key: $status" >&2; exit 1 ;; esac
    done
fi

echo "Creating the test user $username"
user_json=$(python3 -I "$here/scripts/test-user.py" "$here/seed" "$username" "$password" \
    "$(api GET 'organisationUnits?filter=level:eq:1&fields=id&paging=false')")
echo "$user_json" | api POST "metadata?importStrategy=CREATE_AND_UPDATE" --data-binary @- >"$here/.user-report.json"
python3 -I "$here/scripts/import-report.py" "$here/.user-report.json"

if [ -n "$app_zip" ]; then
    echo "Installing $app_zip"
    status=$(curl -sS -o /dev/null -w "%{http_code}" -u "$admin" -F "file=@$app_zip" "$url/api/apps")
    case "$status" in 2*) ;; *) echo "App install: $status" >&2; exit 1 ;; esac
fi

echo "Seeded $url"
