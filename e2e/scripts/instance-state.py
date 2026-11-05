#!/usr/bin/env python3
"""Saves, checks or restores what the write tests may change on the instance.

Usage: instance-state.py save|check|restore DIR
Reads E2E_USERNAME and E2E_PASSWORD, and optionally E2E_DHIS2_URL.
"""
import base64, json, os, sys, urllib.error, urllib.request

BASE = os.environ.get("E2E_DHIS2_URL", "http://localhost:8098")
AUTH = base64.b64encode(f"{os.environ['E2E_USERNAME']}:{os.environ['E2E_PASSWORD']}".encode()).decode()
NS = "dataStore/HMIS_Dictionary"
SERVICE = "organisationUnitGroups/xIz3n0VWiDl"
E2E_TYPES = ["indicators", "dataSets", "dataElements", "sections", "programRules", "programIndicators",
             "organisationUnitGroups", "organisationUnitGroupSets", "optionGroups", "programNotificationTemplates", "visualizations"]


def call(method, path, data=None):
    req = urllib.request.Request(f"{BASE}/api/{path}", method=method)
    req.add_header("Authorization", f"Basic {AUTH}")
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, body, timeout=120) as res:
            raw = res.read()
            return res.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        return e.code, None


def state():
    _, keys = call("GET", NS)
    data = {k: call("GET", f"{NS}/{k}")[1] for k in sorted(keys or [])}
    _, svc = call("GET", f"{SERVICE}?fields=translations")
    _, settings = call("GET", "me?fields=settings[keyUiLocale,keyDbLocale]")
    return {"keys": data, "translations": svc["translations"], "settings": settings["settings"]}


def leftovers():
    found = {}
    for t in E2E_TYPES:
        _, res = call("GET", f"{t}?paging=false&fields=id,name&filter=name:like:E2E_")
        if res and res.get(t):
            found[t] = res[t]
    return found


cmd, folder = sys.argv[1], sys.argv[2]
path = os.path.join(folder, "instance-state.json")
if cmd == "save":
    json.dump(state(), open(path, "w"), indent=1, sort_keys=True)
    print("saved", len(state()["keys"]), "keys")
    sys.exit(0)

saved = json.load(open(path))
now = state()
sort = lambda l: sorted(l, key=lambda x: (x["locale"], x["property"]))
diff = [k for k in set(saved["keys"]) | set(now["keys"]) if saved["keys"].get(k) != now["keys"].get(k)]
translations_differ = sort(saved["translations"]) != sort(now["translations"])
left = leftovers()
print("keys differing:", sorted(diff))
print("translations differ:", translations_differ)
print("settings:", now["settings"], "saved:", saved["settings"])
print("leftover metadata:", {k: [x["id"] for x in v] for k, v in left.items()})
if cmd == "restore":
    for k in diff:
        if k not in saved["keys"]:
            call("DELETE", f"{NS}/{k}")
        elif k in now["keys"]:
            print("PUT", k, call("PUT", f"{NS}/{k}", saved["keys"][k])[0])
        else:
            print("POST", k, call("POST", f"{NS}/{k}", saved["keys"][k])[0])
    if translations_differ:
        print("translations", call("PUT", f"{SERVICE}/translations", {"translations": saved["translations"]})[0])
    for t, items in left.items():
        for item in items:
            print("DELETE", t, item["id"], call("DELETE", f"{t}/{item['id']}")[0])
