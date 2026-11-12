#!/usr/bin/env python3
"""
Prints the metadata of the e2e test user: a superuser role and a user in the groups the app and
the tests read, with access to the root org units, and a group without the user.

    test-user.py SEED_DIR USERNAME PASSWORD ROOTS_JSON
"""

import gzip
import json
import os
import sys

ROLE_ID = "E2eSuperusr"
USER_ID = "E2eTestUser"

seed_dir, username, password, roots_json = sys.argv[1:5]
with gzip.open(os.path.join(seed_dir, "metadata.json.gz"), "rt", encoding="utf-8") as f:
    metadata = json.load(f)
roots = [{"id": o["id"]} for o in json.loads(roots_json)["organisationUnits"]]
# Groups own their members, so the user joins them through the groups
user_groups = [
    {"id": g["id"], "name": g["name"], "code": g.get("code"), "users": [{"id": USER_ID}]}
    for g in metadata.get("userGroups", [])
]
# A group the user is not in, for the Admin tests
user_groups.append({"id": "E2eOtherGrp", "name": "E2E Other group", "users": []})

print(
    json.dumps(
        {
            "userRoles": [{"id": ROLE_ID, "name": "E2E Superuser", "authorities": ["ALL"]}],
            "userGroups": user_groups,
            "users": [
                {
                    "id": USER_ID,
                    "username": username,
                    "password": password,
                    "firstName": "E2E",
                    "surname": "Tests",
                    "userRoles": [{"id": ROLE_ID}],
                    "organisationUnits": roots,
                    "dataViewOrganisationUnits": roots,
                    "teiSearchOrganisationUnits": roots,
                    "settings": {"keyUiLocale": "en", "keyDbLocale": "en"},
                }
            ],
        }
    )
)
