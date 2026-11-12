#!/bin/sh
# Installs an app zip on the instance. Usage: install-app.sh path/to/app.zip
# Reads E2E_USERNAME and E2E_PASSWORD, and optionally E2E_DHIS2_URL.
set -eu
zip_file="$1"
url="${E2E_DHIS2_URL:-http://localhost:8098}"
status=$(curl -sS -o /dev/null -w "%{http_code}" -u "$E2E_USERNAME:$E2E_PASSWORD" -F "file=@$zip_file" "$url/api/apps")
echo "Install status: $status"
[ "$status" = "201" ] || [ "$status" = "204" ]
