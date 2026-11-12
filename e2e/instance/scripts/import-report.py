#!/usr/bin/env python3
"""Prints the counts and errors of a DHIS2 metadata import report, and fails if it has errors."""

import json
import sys

with open(sys.argv[1]) as f:
    report = json.load(f)
report = report.get("response", report)
stats = report.get("stats", {})
print(f"  status {report.get('status')}: " + ", ".join(f"{k} {v}" for k, v in stats.items()))

errors = []
for type_report in report.get("typeReports", []):
    for object_report in type_report.get("objectReports", []):
        for error in object_report.get("errorReports", []):
            errors.append(f"{type_report['klass'].split('.')[-1]} {object_report.get('uid')}: {error.get('message')}")
for error in errors[:50]:
    print(f"  {error}", file=sys.stderr)
if len(errors) > 50:
    print(f"  ... and {len(errors) - 50} more", file=sys.stderr)
sys.exit(1 if errors or report.get("status") == "ERROR" else 0)
