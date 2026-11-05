#!/usr/bin/env python3
"""Ticks the items in e2e.md from Playwright JSON results, and lists what could not be ticked.

Usage: tick-checklist.py e2e.md results.json [more-results.json ...]
A test matches an item through its top-level describe (the section number) and its title.
"""
import json, re, sys

doc_path, result_paths = sys.argv[1], sys.argv[2:]


def norm(text):
    text = re.sub(r"`\[[WM]\]`", "", text)
    text = text.replace("`", "").replace("@smoke", "")
    return re.sub(r"\s+", " ", text).strip()


def section_number(text):
    m = re.match(r"(?:#+\s*)?(\d+)\.", text)
    return m.group(1) if m else None


results = {}


def walk(suite, section=None):
    section = section_number(suite.get("title", "")) or section
    for child in suite.get("suites", []):
        walk(child, section)
    for spec in suite.get("specs", []):
        for test in spec["tests"]:
            status = {"expected": "pass", "skipped": "skip", "flaky": "pass"}.get(test["status"], "fail")
            results.setdefault((section, norm(spec["title"])), []).append(status)


for path in result_paths:
    for suite in json.load(open(path))["suites"]:
        walk(suite)

lines = open(doc_path, encoding="utf8").read().split("\n")
start = next(i for i, l in enumerate(lines) if l.startswith("## Checklist"))
end = next(i for i, l in enumerate(lines) if l.startswith("## ") and i > start)
section, used, report = None, set(), {"fail": [], "skip": [], "none": []}
items = []
for i in range(start, end):
    if lines[i].startswith("### "):
        section = section_number(lines[i])
    m = re.match(r"(\s*)- \[( |x)\] (.*)", lines[i])
    if not m:
        continue
    key = (section, norm(m.group(3)))
    statuses = results.get(key)
    if statuses:
        used.add(key)
    items.append({"line": i, "indent": len(m.group(1)), "key": key, "statuses": statuses, "done": m.group(2) == "x"})

for index, item in enumerate(items):
    statuses = item["statuses"]
    children = []
    for other in items[index + 1:]:
        if other["indent"] <= item["indent"]:
            break
        children.append(other)
    item["children"] = children
    if statuses:
        item["done"] = "pass" in statuses and "fail" not in statuses
        if "fail" in statuses:
            report["fail"].append(item["key"])
        elif not item["done"]:
            report["skip"].append(item["key"])
    elif not children and not item["done"]:
        report["none"].append(item["key"])

for item in reversed(items):
    if item["children"]:
        item["done"] = all(c["done"] for c in item["children"])

for item in items:
    lines[item["line"]] = re.sub(r"- \[( |x)\]", "- [x]" if item["done"] else "- [ ]", lines[item["line"]], count=1)
open(doc_path, "w", encoding="utf8").write("\n".join(lines))

print("items", len(items), "ticked", sum(i["done"] for i in items))
for name, keys in report.items():
    print(f"== {name}: {len(keys)}")
    for key in keys:
        print("  ", key[0], key[1][:110])
unused = sorted(set(results) - used, key=str)
print("== tests matching no item:", len(unused))
for key in unused:
    print("  ", key[0], key[1][:110])
