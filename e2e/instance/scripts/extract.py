#!/usr/bin/env python3
"""
Extract a subset of the metadata of a DHIS2 instance, with its dependencies, for the e2e seed.

The result is raw: it still has the names and texts of the source instance. Keep it out of the
repository and run sanitize.py on it, which writes the seed.

    python3 -I e2e/instance/scripts/extract.py --url http://localhost:8098 --auth admin:district \
        --out /some/folder/raw.json
"""

import argparse
import base64
import json
import re
import sys
import urllib.parse
import urllib.request

# Services whose data sets and indicator groups are extracted. The other services of the group
# set are kept, with no content.
SERVICE_CODES = [
    "MSL", "SIPCA", "MH", "MHIND", "SV", "SVIND", "NUT", "HIV", "EC", "COVID", "TB", "MPOX",
]
SERVICES_GROUP_SET = "g7k6NQmqJY2"
SERVICE_CODE_ATTRIBUTE = "pG4YeQyynJh"
RESOURCES_ATTRIBUTE = "Q5alUdMbT9g"
EXCLUDED_PROGRAMS = {"lAINeF3S4Lz"}  # 3,000 program indicators, for no extra scenario
EXTRA_DATA_SETS = ["jn8nB25hA8v", "rFIy2mYoFiu"]
EXTRA_INDICATORS = ["rPAOXzG3811"]
EXTRA_USER_GROUPS = ["epFY01iJN0Z"]
ORG_UNITS_PER_GROUP = 2
ORG_UNITS_PER_DATA_SET = 2
LARGE_TREE = 150  # one data set keeps this many, for the tests of large trees
EVENT_VISUALIZATIONS_PER_PROGRAM = 40
NAMESPACE = "HMIS_Dictionary"

# Fields with a reference, and the collection they point to.
REFERENCES = {
    "categoryCombo": "categoryCombos",
    "categories": "categories",
    "categoryOptions": "categoryOptions",
    "categoryOptionCombos": "categoryOptionCombos",
    "optionSet": "optionSets",
    "commentOptionSet": "optionSets",
    "options": "options",
    "dataElement": "dataElements",
    "trackedEntityAttribute": "trackedEntityAttributes",
    "trackedEntityType": "trackedEntityTypes",
    "indicatorType": "indicatorTypes",
    "attribute": "attributes",
}

# Collections copied in full: they are small and the app lists them.
FULL = ["attributes", "constants", "indicatorTypes", "organisationUnitGroupSets", "organisationUnitGroups"]

# Groups whose members are trimmed to the objects extracted.
GROUPS = {
    "dataElementGroups": "dataElements",
    "indicatorGroups": "indicators",
    "programIndicatorGroups": "programIndicators",
    "optionGroups": "options",
}

UID = r"[A-Za-z][A-Za-z0-9]{10}"


class Client:
    def __init__(self, url, auth):
        self.url = url.rstrip("/")
        self.headers = {"Authorization": "Basic " + base64.b64encode(auth.encode()).decode()}

    def get(self, path, params=None):
        query = "?" + urllib.parse.urlencode(params or {}, safe=":[],!*~") if params else ""
        request = urllib.request.Request(f"{self.url}/api/{path}{query}", headers=self.headers)
        with urllib.request.urlopen(request, timeout=600) as response:
            return json.load(response)

    def by_ids(self, collection, ids, fields=":owner"):
        ids = sorted(ids)
        result = []
        for i in range(0, len(ids), 100):
            chunk = ids[i : i + 100]
            data = self.get(
                collection,
                {"paging": "false", "fields": fields, "filter": f"id:in:[{','.join(chunk)}]"},
            )
            result.extend(data[collection])
        return result

    def all(self, collection, fields=":owner", **filters):
        params = {"paging": "false", "fields": fields}
        if filters:
            params["filter"] = filters["filter"]
        return self.get(collection, params)[collection]


class Store:
    def __init__(self):
        self.data = {}

    def add(self, collection, objects):
        target = self.data.setdefault(collection, {})
        for obj in objects:
            target.setdefault(obj["id"], obj)

    def ids(self, collection):
        return set(self.data.get(collection, {}))

    def merge(self, metadata):
        for collection, objects in metadata.items():
            if isinstance(objects, list) and objects and isinstance(objects[0], dict):
                self.add(collection, [o for o in objects if "id" in o])


def references(value, found):
    """Collects {collection: ids} from the reference fields of an object."""
    if isinstance(value, dict):
        for key, child in value.items():
            collection = REFERENCES.get(key)
            if collection and isinstance(child, dict) and "id" in child:
                found.setdefault(collection, set()).add(child["id"])
            elif collection and isinstance(child, list):
                for item in child:
                    if isinstance(item, dict) and "id" in item:
                        found.setdefault(collection, set()).add(item["id"])
            references(child, found)
    elif isinstance(value, list):
        for item in value:
            references(item, found)
    return found


def formula_references(text, found):
    """Collects the objects that an indicator formula uses."""
    for de, coc, aoc in re.findall(rf"#\{{({UID})(?:\.({UID}|\*))?(?:\.({UID}|\*))?\}}", text or ""):
        found.setdefault("dataElements", set()).add(de)
        for combo in (coc, aoc):
            if combo and combo != "*":
                found.setdefault("categoryOptionCombos", set()).add(combo)
    for pi in re.findall(rf"I\{{({UID})\}}", text or ""):
        found.setdefault("programIndicators", set()).add(pi)
    for ind in re.findall(rf"N\{{({UID})\}}", text or ""):
        found.setdefault("indicators", set()).add(ind)
    for ds in re.findall(rf"R\{{({UID})\.", text or ""):
        found.setdefault("dataSets", set()).add(ds)
    for program, de in re.findall(rf"D\{{({UID})\.({UID})\}}", text or ""):
        found.setdefault("programs", set()).add(program)
        found.setdefault("dataElements", set()).add(de)
    for program, tea in re.findall(rf"A\{{({UID})\.({UID})\}}", text or ""):
        found.setdefault("programs", set()).add(program)
        found.setdefault("trackedEntityAttributes", set()).add(tea)
    for constant in re.findall(rf"C\{{({UID})\}}", text or ""):
        found.setdefault("constants", set()).add(constant)
    return found


def has_service_code(obj, codes):
    for value in obj.get("attributeValues", []):
        if value["attribute"]["id"] != SERVICE_CODE_ATTRIBUTE:
            continue
        parts = value["value"].split("_")[1:]
        if any(code in parts for code in codes):
            return True
    return False


def extract(client):
    store = Store()
    namespace = {key: client.get(f"dataStore/{NAMESPACE}/{key}") for key in client.get(f"dataStore/{NAMESPACE}")}
    lists = {k: v for k, v in namespace.items() if isinstance(v, list)}

    for collection in FULL:
        store.add(collection, client.all(collection))

    # Programs, with their stages, rules, program indicators and dependencies
    programs = [p["id"] for p in client.all("programs", "id") if p["id"] not in EXCLUDED_PROGRAMS]
    for program in programs:
        print(f"program {program}", file=sys.stderr)
        store.merge(client.get(f"programs/{program}/metadata.json"))
    store.add("programNotificationTemplates", client.all("programNotificationTemplates"))

    # Data sets of the chosen services, the blacklisted ones and the fixtures
    data_sets = client.all("dataSets", "id,attributeValues[attribute[id],value]")
    chosen = {d["id"] for d in data_sets if has_service_code(d, SERVICE_CODES)}
    chosen |= set(lists.get("blacklist_dataSets", [])) | set(EXTRA_DATA_SETS)
    existing = {d["id"] for d in data_sets}
    for data_set in sorted(chosen & existing):
        print(f"data set {data_set}", file=sys.stderr)
        store.merge(client.get(f"dataSets/{data_set}/metadata.json"))

    # Indicator groups of the chosen services and of the configuration, with their indicators
    groups = client.all("indicatorGroups", "id,attributeValues[attribute[id],value]")
    configured = set()
    for key in ("blacklist_indicatorGroups", "notInUse_indicatorGroups"):
        configured |= set(lists.get(key, []))
    chosen_groups = {g["id"] for g in groups if has_service_code(g, SERVICE_CODES)} | configured
    # All indicators: the tests look for many kinds of formula. sanitize.py drops those whose
    # formula uses an object left out.
    indicator_ids = set(EXTRA_INDICATORS) | {i["id"] for i in client.all("indicators", "id")}
    for group in client.by_ids("indicatorGroups", chosen_groups, "id,indicators[id]"):
        indicator_ids |= {i["id"] for i in group["indicators"]}
    for data_set in store.data.get("dataSets", {}).values():
        indicator_ids |= {i["id"] for i in data_set.get("indicators", [])}

    # Closure: formulas and references, until nothing new appears
    pending = {"indicators": indicator_ids}
    attempted = {}
    while pending:
        found = {}
        for collection, ids in pending.items():
            missing = ids - store.ids(collection) - attempted.get(collection, set())
            attempted.setdefault(collection, set()).update(missing)
            if not missing:
                continue
            if collection == "programIndicators":
                objects = [
                    o for o in client.by_ids(collection, missing)
                    if o.get("program", {}).get("id") not in EXCLUDED_PROGRAMS
                ]
                store.add(collection, objects)
                for obj in objects:
                    references(obj, found)
                    for field in ("expression", "filter"):
                        formula_references(obj.get(field), found)
                continue
            if collection == "programs":
                for program in missing - EXCLUDED_PROGRAMS:
                    store.merge(client.get(f"programs/{program}/metadata.json"))
                continue
            objects = client.by_ids(collection, missing)
            store.add(collection, objects)
            print(f"{collection}: +{len(objects)}", file=sys.stderr)
            for obj in objects:
                references(obj, found)
                for field in ("numerator", "denominator", "expression", "filter"):
                    formula_references(obj.get(field), found)
        for collection, objects in store.data.items():
            if collection in ("indicators", "programIndicators"):
                for obj in objects.values():
                    for field in ("numerator", "denominator", "expression", "filter"):
                        formula_references(obj.get(field), found)
            if collection in ("dataElements", "categoryCombos", "categories", "optionSets", "trackedEntityAttributes"):
                for obj in objects.values():
                    references(obj, found)
        pending = {}
        for c, ids in found.items():
            new = ids - store.ids(c) - attempted.get(c, set())
            if new:
                pending[c] = new
        pending.pop("attributes", None)

    # Groups, trimmed later to the objects extracted
    store.add("indicatorGroups", client.all("indicatorGroups"))
    store.add("dataElementGroups", client.all("dataElementGroups"))
    store.add("programIndicatorGroups", client.all("programIndicatorGroups"))
    legacy_option_groups = set(lists.get("legacy_optionGroups", []))
    store.add("optionGroups", client.all("optionGroups"))

    # Event reports and charts of each program, up to a limit
    for program in programs:
        data = client.get(
            "eventVisualizations",
            {"fields": ":owner", "filter": f"program.id:eq:{program}", "pageSize": EVENT_VISUALIZATIONS_PER_PROGRAM},
        )
        store.add("eventVisualizations", data["eventVisualizations"])

    # Org units: a few per service, data set and program, with their ancestors. Other data sets
    # and programs keep none, so the tests have both cases.
    ou_ids = set()
    for group in client.by_ids("organisationUnitGroups", store.ids("organisationUnitGroups"), "id,organisationUnits[id,path]"):
        for unit in group["organisationUnits"][:ORG_UNITS_PER_GROUP]:
            ou_ids |= set(unit["path"].strip("/").split("/"))
    large_done = False
    for collection in ("dataSets", "programs"):
        for index, obj in enumerate(sorted(store.data.get(collection, {}).values(), key=lambda o: o["id"])):
            if index % 2 and obj["id"] not in EXTRA_DATA_SETS:
                obj["organisationUnits"] = []
                continue
            assigned = obj.get("organisationUnits", [])
            large = collection == "dataSets" and len(assigned) > LARGE_TREE and not large_done
            large_done = large_done or large
            units = [u["id"] for u in assigned[: LARGE_TREE if large else ORG_UNITS_PER_DATA_SET]]
            for unit in client.by_ids("organisationUnits", units, "id,path"):
                ou_ids |= set(unit["path"].strip("/").split("/"))
    store.add("organisationUnits", client.by_ids("organisationUnits", ou_ids, "id,name,shortName,code,openingDate,parent[id],path"))

    # User groups the app or the tests read
    user_groups = set(EXTRA_USER_GROUPS)
    setup = namespace.get("setup_userGroup")
    if isinstance(setup, dict) and setup.get("object", {}).get("id"):
        user_groups.add(setup["object"]["id"])
    store.add("userGroups", client.by_ids("userGroups", user_groups, "id,name,code"))

    return {
        "source": client.url,
        "namespace": namespace,
        "legacyOptionGroups": sorted(legacy_option_groups),
        "metadata": {c: list(objects.values()) for c, objects in store.data.items()},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", required=True)
    parser.add_argument("--auth", required=True, help="user:password")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    result = extract(Client(args.url, args.auth))
    with open(args.out, "w") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
    for collection, objects in sorted(result["metadata"].items()):
        print(f"{collection:32} {len(objects):6}", file=sys.stderr)


if __name__ == "__main__":
    main()
