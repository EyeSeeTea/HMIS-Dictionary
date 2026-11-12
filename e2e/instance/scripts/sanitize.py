#!/usr/bin/env python3
"""
Turn the output of extract.py into the e2e seed, with neutral names and texts.

    python3 -I e2e/instance/scripts/sanitize.py /some/folder/raw.json e2e/instance/seed

Writes metadata.json.gz, defaults.json and datastore.json. It keeps the ids and the structure, and replaces:

- Words that are not in a common dictionary (place names, people, project codes) with neutral
  words. Known organisation names are always replaced. Short all-caps acronyms (HIV, ICU) stay.
- Descriptions and other free texts with a short text built from the name.
- Translations with the translated name or a tagged copy of the English one.

The same word always gets the same replacement, so codes, names and the expressions that use them
stay consistent.
"""

import argparse
import gzip
import hashlib
import json
import os
import re
import sys

DICTIONARIES = [
    "/usr/share/dict/american-english",
    "/usr/share/dict/british-english", "/usr/share/dict/spanish", "/usr/share/dict/french"]

DENIED = {
    "msf", "ocba", "ocb", "ocg", "ocp", "oca", "msfe", "msfocb", "msfocba", "epicentre", "medecins",
    "médecins", "frontieres", "frontières", "fronteras", "medicos", "médicos", "doctors", "borders",
    "dhis", "pentaho", "eyeseetea",
    # Countries, which next to option and org unit names would locate projects
    "sudan", "yemen", "ye", "niger", "nigeria", "chad", "tchad", "mali", "burkina", "faso", "congo",
    "drc", "rdc", "cameroon", "cameroun", "somalia", "ethiopia", "kenya", "uganda", "afghanistan",
    "iraq", "syria", "lebanon", "rca", "centrafrique", "mozambique", "bangladesh", "myanmar",
    "haiti", "ukraine", "palestine", "gaza", "libya", "sierra", "leone", "liberia",
    "malawi", "zimbabwe", "angola", "venezuela", "colombia", "mexico", "honduras", "greece", "italy",
    "spain", "belgium", "senegal", "ivory", "benin", "togo", "ghana", "tanzania", "burundi", "rwanda",
    "zambia", "madagascar", "pakistan", "india", "philippines", "indonesia", "jordan",
}

# Medical and health words missing from the dictionaries
MEDICAL = set("""
hiv sv mh covid muac arv icu pcr ipc rdt rotavirus neonatology paediatric diarrhoea hepb mpox
counsellor counselling ptsd leishmaniasis haemorrhagic extrapulmonary morbidities readmissions
cytotoxic foodborne oedema meningitidis pentavalent haemorrhage ultrasonography anaemia anaesthesia
polysaccharide meningococcal behavioural dyspnea hypoperfusion hypoxia partum fasciotomy ptosis
gynaecological intubation puerperium chemoprevention behaviour fluoroscopy ebola creatinine
encopresis sequelae telemedicine hypovolemic neurotoxic gastro genexpert anosmia ecmo hematotoxic
agueusia theatre travelled organisational neighbour watsan mhgap psy paed ncds prev dia gyn
neonatal neonats antivenom antivenon hib pneumo penta multiservice obstetric obs ipd opd anc pnc
sipca nut vac malaria measles cholera mening meningitis dengue tuberculosis tb mdr xdr
""".split())

CONSONANTS = "bdfgklmnprstvz"
VOWELS = "aeiou"

# Free texts: replaced with a text built from the name
FREE_TEXTS = {"description", "instruction", "comment"}
# Templates with variables
TEMPLATES = {"messageTemplate", "subjectTemplate"}
# Texts made of words: names, codes and labels
WORD_TEXTS = {
    "name", "shortName", "formName", "code", "displayName", "displayShortName", "displayFormName",
    "displayDescription", "executionDateLabel", "dueDateLabel", "incidentDateLabel", "enrollmentDateLabel",
    "programStageLabel", "eventLabel", "enrollmentLabel", "followUpLabel", "orgUnitLabel",
    "relationshipLabel", "noteLabel", "trackedEntityAttributeLabel", "programRuleVariableName",
    "numeratorDescription", "denominatorDescription", "content", "title", "subtitle",
    "rangeAxisLabel", "domainAxisLabel", "targetLineLabel", "baseLineLabel",
}
# Expressions: quoted literals and {} names are sanitized, the rest is kept
EXPRESSIONS = {"condition", "data", "expression", "filter", "numerator", "denominator", "valueFilter"}

DROPPED = {
    "created", "lastUpdated", "createdBy", "lastUpdatedBy", "user", "href", "access", "favorites",
    "userAccesses", "userGroupAccesses", "externalAccess", "publicAccess", "legendSets", "legendSet",
    "url", "favorite", "notificationRecipients", "workflow", "users", "managedGroups", "userRoles",
    "recipientUserGroup", "geometry", "image", "dataInputPeriods", "greyedFields", "dataEntryForm",
    "categoryMappings", "subscribers", "interpretations",
}

DROPPED_COLLECTIONS = {"dataEntryForms"}

# The default category objects. Their ids differ between instances, so the seed keeps the ids of
# the source, and prepare-import.py swaps them for the ones of the target instance.
DEFAULT_COLLECTIONS = ("categoryOptions", "categories", "categoryCombos", "categoryOptionCombos")
DEFAULTS = set()

LOCALE_TAGS = {"es": "ES", "fr": "FR", "pt": "PT", "ar": "AR"}


class Words:
    def __init__(self, dictionaries):
        self.known = set()
        for path in dictionaries:
            if not os.path.exists(path):
                print(f"Dictionary not found: {path}", file=sys.stderr)
                continue
            with open(path, encoding="utf-8", errors="ignore") as f:
                for line in f:
                    word = line.strip().split("/")[0]
                    if word and word[0].islower() and "'" not in word:
                        self.known.add(word.lower())
        self.replaced = {}
        self.used = set()
        self.count = 0

    def keep(self, word):
        lower = word.lower()
        if lower in DENIED:
            return False
        if len(word) <= 3 or lower in MEDICAL:
            return True
        if word.isupper() and len(word) <= 5:
            return True
        return lower in self.known

    def replace(self, word):
        if self.keep(word):
            return word
        self.count += 1
        neutral = self.neutral(word.lower())
        if word.isupper():
            return neutral.upper()
        if word[0].isupper():
            return neutral.capitalize()
        return neutral

    def neutral(self, lower):
        """One replacement per word, and never the same for two words: a made-up word of two or
        three syllables, about as long as a place name."""
        if lower in self.replaced:
            return self.replaced[lower]
        digest = int(hashlib.sha1(lower.encode()).hexdigest(), 16)
        while True:
            syllables = 2 + digest % 2
            n = digest // 2
            candidate = ""
            for _ in range(syllables):
                candidate += CONSONANTS[n % len(CONSONANTS)] + VOWELS[(n // len(CONSONANTS)) % len(VOWELS)]
                n //= len(CONSONANTS) * len(VOWELS)
            if candidate not in self.used and candidate not in self.known:
                break
            digest = int(hashlib.sha1(f"{digest}".encode()).hexdigest(), 16)
        self.used.add(candidate)
        self.replaced[lower] = candidate
        return candidate

    def text(self, value):
        if not isinstance(value, str):
            return value
        value = re.sub(r"(?i)doctors without borders|m[ée]decins sans fronti[èe]res", "Health Org", value)
        # Words, with camelCase split: serviceCode is "service" and "Code"
        return re.sub(r"[^\W\d_]+", lambda m: self.camel(m.group(0)), value)

    def camel(self, token):
        parts = re.findall(r"[A-Z]{2,}(?![^\W\d_A-Z])|[^\W\d_][^\W\d_A-Z]*", token)
        if "".join(parts) != token or len(parts) == 1:
            return self.replace(token)
        if self.keep(token):
            return token
        return "".join(self.replace(part) for part in parts)

    def expression(self, value):
        if not isinstance(value, str):
            return value
        value = re.sub(r"'([^']*)'", lambda m: "'" + self.text(m.group(1)) + "'", value)
        value = re.sub(r'"([^"]*)"', lambda m: '"' + self.text(m.group(1)) + '"', value)
        return re.sub(r"([#AV]\{)([^}]*)\}", lambda m: m.group(1) + self.names_in_braces(m.group(2)) + "}", value)

    def names_in_braces(self, inner):
        # #{stageId.dataElementId} and A{attributeId} are ids, #{Variable name} is a name
        if re.fullmatch(r"[A-Za-z][A-Za-z0-9]{10}(\.[A-Za-z][A-Za-z0-9]{10}|\.\*)*", inner):
            return inner
        if inner in BUILT_IN_VARIABLES:
            return inner
        return self.text(inner)


BUILT_IN_VARIABLES = {
    "current_date", "event_date", "due_date", "event_count", "enrollment_date", "incident_date",
    "enrollment_id", "event_id", "event_status", "enrollment_count", "tei_count", "program_stage_name",
    "program_stage_id", "org_unit_count", "program_name", "completed_date", "creation_date",
    "analytics_period_start", "analytics_period_end", "enrollment_status", "value_count",
    "zero_pos_value_count", "environment", "orgunit_code", "org_unit", "sync_date", "event_status",
    "scheduled_date", "reporting_period_start", "reporting_period_end",
}


def short_text(name):
    return f"About {name}." if name else "About this object."


class Sanitizer:
    def __init__(self, words, known_ids):
        self.words = words
        self.known_ids = known_ids
        self.dropped_refs = {}

    def is_ref(self, value):
        return isinstance(value, dict) and set(value) == {"id"}

    def ref_ok(self, value, path):
        if value["id"] in self.known_ids or value["id"] in DEFAULTS:
            return True
        self.dropped_refs[path] = self.dropped_refs.get(path, 0) + 1
        return False

    def object(self, obj, path):
        name = obj.get("name") if isinstance(obj.get("name"), str) else None
        result = {}
        for key, value in obj.items():
            here = f"{path}.{key}"
            if key in DROPPED:
                continue
            if key == "translations":
                result[key] = self.translations(value, obj)
            elif key == "attributeValues":
                result[key] = [self.attribute_value(v) for v in value if self.ref_ok(v["attribute"], here)]
            elif key == "sharing":
                result[key] = {"public": "rw------", "external": False, "users": {}, "userGroups": {}}
            elif key in FREE_TEXTS and isinstance(value, str):
                result[key] = short_text(self.words.text(name))
            elif key in TEMPLATES:
                result[key] = self.words.expression(value)
            elif key in WORD_TEXTS:
                result[key] = self.words.text(value)
            elif key in EXPRESSIONS:
                result[key] = self.words.expression(value)
            elif self.is_ref(value):
                if self.ref_ok(value, here):
                    result[key] = value
            elif isinstance(value, dict):
                result[key] = self.object(value, here)
            elif isinstance(value, list):
                items = []
                for item in value:
                    if self.is_ref(item):
                        if self.ref_ok(item, here):
                            items.append(item)
                    elif isinstance(item, dict):
                        items.append(self.object(item, here))
                    else:
                        items.append(item)
                result[key] = items
            else:
                result[key] = value
        return result

    def attribute_value(self, value):
        text = value.get("value")
        if isinstance(text, str) and not text.lstrip().startswith(("{", "[")):
            text = self.words.text(text)
        return {"attribute": value["attribute"], "value": text}

    def translations(self, translations, obj):
        result = []
        for t in translations:
            locale = t.get("locale", "")
            prop = t.get("property", "")
            base = locale.split("_")[0]
            tag = LOCALE_TAGS.get(base, base.upper())
            if prop == "DESCRIPTION":
                value = f"{short_text(self.words.text(obj.get('name')))} ({tag})"
            else:
                english = self.words.text(obj.get(prop_field(prop), "") or "")
                before = self.words.count
                original = self.words.text(t.get("value", ""))
                replaced = self.words.count != before
                value = original if original != english and not replaced else f"{english} ({tag})"
            result.append({"locale": locale, "property": prop, "value": value})
        return result


def prop_field(prop):
    return {"NAME": "name", "SHORT_NAME": "shortName", "FORM_NAME": "formName", "DESCRIPTION": "description"}.get(prop, prop.lower())


GROUP_MEMBERS = {
    "dataElementGroups": ("dataElements", "dataElements"),
    "indicatorGroups": ("indicators", "indicators"),
    "programIndicatorGroups": ("programIndicators", "programIndicators"),
    "optionGroups": ("options", "options"),
    "organisationUnitGroups": ("organisationUnits", "organisationUnits"),
}


def trim_groups(metadata, configured):
    for collection, (field, members) in GROUP_MEMBERS.items():
        ids = {o["id"] for o in metadata.get(members, [])}
        kept = []
        for group in metadata.get(collection, []):
            group[field] = [m for m in group.get(field, []) if m["id"] in ids]
            if group[field] or group["id"] in configured or collection == "organisationUnitGroups":
                kept.append(group)
        metadata[collection] = kept
    # Option groups need their option set
    option_sets = {o["id"] for o in metadata.get("optionSets", [])}
    metadata["optionGroups"] = [
        g for g in metadata.get("optionGroups", []) if g.get("optionSet", {}).get("id") in option_sets
    ]


LIMITS = {"shortName": 50, "code": 50, "name": 230, "formName": 230}


def fit_lengths(seed):
    """Replacements can make a text a little longer than DHIS2 allows."""
    for objects in seed.values():
        for obj in objects:
            for field, limit in LIMITS.items():
                if isinstance(obj.get(field), str) and len(obj[field]) > limit:
                    obj[field] = obj[field][:limit].rstrip()


def fix_invalid(metadata):
    """Values that the source accepts and a new import does not."""
    true_only = {a["id"] for a in metadata.get("attributes", []) if a.get("valueType") == "TRUE_ONLY"}
    for objects in metadata.values():
        for obj in objects:
            if "attributeValues" in obj:
                obj["attributeValues"] = [
                    v for v in obj["attributeValues"] if v["attribute"]["id"] not in true_only or v["value"] == "true"
                ]
    for action in metadata.get("programRuleActions", []):
        if action.get("programRuleActionType") == "HIDESECTION":
            for field in ("dataElement", "trackedEntityAttribute", "option", "optionGroup"):
                action.pop(field, None)


FORMULA_IDS = r"(?:#|D|A|I|N|C|R|OUG)\{([A-Za-z][A-Za-z0-9]{10})(?:\.([A-Za-z][A-Za-z0-9]{10}))?"


def drop_broken_formulas(metadata, defaults):
    """Indicators and program indicators whose formula uses an object left out of the seed."""
    known = {o["id"] for objects in metadata.values() for o in objects} | set(defaults.values())
    stages = {s["id"] for s in metadata.get("programStages", [])}
    dropped = 0
    for collection, fields in (("indicators", ("numerator", "denominator")), ("programIndicators", ("expression", "filter"))):
        kept = []
        for obj in metadata.get(collection, []):
            ids = set()
            for field in fields:
                for first, second in re.findall(FORMULA_IDS, obj.get(field) or ""):
                    ids.add(first)
                    if second:
                        ids.add(second)
            if collection == "programIndicators":
                ok = obj.get("program", {}).get("id") in known
            else:
                ok = True
            if ok and ids <= known | stages:
                kept.append(obj)
            else:
                dropped += 1
        metadata[collection] = kept
    print(f"dropped formulas with missing objects: {dropped}", file=sys.stderr)
    return dropped


def drop_orphan_options(metadata):
    """Options that their option set does not list, and repeated codes, which the source allows."""
    listed = {o["id"] for s in metadata.get("optionSets", []) for o in s.get("options", [])}
    seen = set()
    kept = []
    for option in metadata.get("options", []):
        key = (option.get("optionSet", {}).get("id"), option.get("code"))
        if option["id"] in listed and key not in seen:
            seen.add(key)
            kept.append(option)
    metadata["options"] = kept
    ids = {o["id"] for o in kept}
    for option_set in metadata.get("optionSets", []):
        option_set["options"] = [o for o in option_set.get("options", []) if o["id"] in ids]


def drop_attribute_combos(metadata, defaults):
    """Data sets and programs use the default combo, and unused combos go, with their categories,
    options and option combos. The attribute combos list projects, which the app does not show."""
    attribute = {c["id"] for c in metadata.get("categoryCombos", []) if c.get("dataDimensionType") == "ATTRIBUTE"}
    default_combo = defaults["categoryCombos"]
    for collection in ("dataSets", "programs"):
        for obj in metadata.get(collection, []):
            if obj.get("categoryCombo", {}).get("id") in attribute:
                obj["categoryCombo"] = {"id": default_combo}

    def used(collection_ids, skip):
        text = json.dumps({c: v for c, v in metadata.items() if c not in skip})
        return {i for i in collection_ids if f'"{i}"' in text}

    combos = used({c["id"] for c in metadata.get("categoryCombos", [])}, {"categoryCombos", "categoryOptionCombos"})
    metadata["categoryCombos"] = [c for c in metadata["categoryCombos"] if c["id"] in combos]
    categories = {r["id"] for c in metadata["categoryCombos"] for r in c.get("categories", [])}
    metadata["categories"] = [c for c in metadata["categories"] if c["id"] in categories]
    options = {r["id"] for c in metadata["categories"] for r in c.get("categoryOptions", [])}
    metadata["categoryOptions"] = [o for o in metadata["categoryOptions"] if o["id"] in options]
    metadata["categoryOptionCombos"] = [
        o for o in metadata.get("categoryOptionCombos", []) if o.get("categoryCombo", {}).get("id") in combos
    ]


def sanitize_namespace(namespace, words):
    result = dict(namespace)
    setup = result.get("setup_userGroup")
    if isinstance(setup, dict):
        name = words.text(setup.get("value"))
        result["setup_userGroup"] = {"value": name, "object": {"id": setup["object"]["id"], "name": name}}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("raw")
    parser.add_argument("out_dir")
    parser.add_argument("--dictionary", action="append", help="word list (default: system en, es, fr)")
    parser.add_argument("--report", help="write the replaced words here, to review them")
    args = parser.parse_args()

    with open(args.raw) as f:
        raw = json.load(f)
    words = Words(args.dictionary or DICTIONARIES)
    metadata = raw["metadata"]

    configured = set()
    for value in raw["namespace"].values():
        if isinstance(value, list):
            configured |= {v for v in value if isinstance(v, str)}

    defaults = {}
    for collection in DEFAULT_COLLECTIONS:
        for obj in metadata.get(collection, []):
            if obj.get("name") == "default":
                defaults[collection] = obj["id"]
                DEFAULTS.add(obj["id"])
    for collection in list(metadata):
        if collection in DROPPED_COLLECTIONS:
            del metadata[collection]
            continue
        metadata[collection] = [o for o in metadata[collection] if o["id"] not in DEFAULTS]
    drop_orphan_options(metadata)
    fix_invalid(metadata)
    while drop_broken_formulas(metadata, defaults):
        pass
    trim_groups(metadata, configured)
    drop_attribute_combos(metadata, defaults)

    known_ids = {o["id"] for objects in metadata.values() for o in objects}
    sanitizer = Sanitizer(words, known_ids)
    seed = {}
    for collection in sorted(metadata):
        objects = [sanitizer.object(o, collection) for o in sorted(metadata[collection], key=lambda o: o["id"])]
        if objects:
            seed[collection] = objects

    fit_lengths(seed)
    os.makedirs(args.out_dir, exist_ok=True)
    # Compressed, with no timestamp, so the same seed gives the same file
    text = json.dumps(seed, indent=1, ensure_ascii=False, sort_keys=True) + "\n"
    with open(os.path.join(args.out_dir, "metadata.json.gz"), "wb") as f:
        with gzip.GzipFile(filename="metadata.json", mode="wb", fileobj=f, mtime=0) as gz:
            gz.write(text.encode("utf-8"))
    with open(os.path.join(args.out_dir, "defaults.json"), "w") as f:
        json.dump(defaults, f, indent=1, sort_keys=True)
        f.write("\n")
    with open(os.path.join(args.out_dir, "datastore.json"), "w") as f:
        json.dump({"HMIS_Dictionary": sanitize_namespace(raw["namespace"], words)}, f, indent=1, ensure_ascii=False, sort_keys=True)
        f.write("\n")

    for collection, objects in seed.items():
        print(f"{collection:32} {len(objects):6}", file=sys.stderr)
    for path, count in sorted(sanitizer.dropped_refs.items()):
        print(f"dropped reference {path}: {count}", file=sys.stderr)
    if args.report:
        with open(args.report, "w") as f:
            for original, neutral in sorted(words.replaced.items()):
                f.write(f"{original}\t{neutral}\n")


if __name__ == "__main__":
    main()
