#!/usr/bin/env python3
"""
Prints the seed metadata ready to import on an instance: the ids of the default category objects
of the source are swapped for those of the target, in references and in formulas.

    prepare-import.py SEED_DIR TARGET_DEFAULTS_JSON PART

TARGET_DEFAULTS_JSON is {"categoryCombos": id, "categories": id, ...} for the target instance.
PART is 1 (everything but the data sets) or 2 (the data sets and their sections). In a single
import, DHIS2 2.42 fails with "DataSet.periodType references a null or transient value".
"""

import gzip
import json
import os
import sys

seed_dir, target_json, part = sys.argv[1:4]
with open(os.path.join(seed_dir, "defaults.json")) as f:
    source = json.load(f)
target = json.loads(target_json)
with gzip.open(os.path.join(seed_dir, "metadata.json.gz"), "rt", encoding="utf-8") as f:
    text = f.read()
for collection, source_id in source.items():
    if collection in target and target[collection] != source_id:
        text = text.replace(source_id, target[collection])
metadata = json.loads(text)
second = {"dataSets", "sections"}
json.dump({k: v for k, v in metadata.items() if (k in second) == (part == "2")}, sys.stdout, ensure_ascii=False)
