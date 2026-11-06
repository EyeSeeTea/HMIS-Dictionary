# HMIS Dictionary -> React-HMIS migration

**Task:** [HMIS Dictionary](https://app.clickup.com/t/4528615/869fkz6zq) | 
**Repo:** [msf-ocba/HMIS-Dictionary](https://github.com/msf-ocba/HMIS-Dictionary) | **Branch:** `feature/react-migration` (from `dhis2-app-skeleton` `master`)

Move the app from AngularJS to React, on top of `dhis2-app-skeleton`, applying Clean Architecture principles (as the skeleton does).

## Local setup

- **New app:** this checkout, on `feature/react-migration`, port 8081.
- **Old app:** worktree at `../HMIS-Dictionary-legacy`, on `e2e/baseline` (`master` plus the e2e suite), to compare both side by side.
- **DHIS2 instances (OCBA d2-docker):**
  - v42: `docker.eyeseetea.com/ocba/dhis2-data:42.5.1-msf-20261029`, port 8098. The new app uses this one (`.env.local`).
  - v40: `docker.eyeseetea.com/ocba/dhis2-data:40.9.0-msf-20251219`, port 8097. Started with `-c docker.eyeseetea.com/samaritans/dhis2-core:40.9.0`, because pulling `ocba/dhis2-core:40.9.0` is unauthorized.
  - Credentials: both have `d2-docker/bak/zsql/z-change-password.sql` applied.

## Constraints

- **Views:** same screens and behaviour, but built as a typical React app with `@dhis2/ui`, not a pixel copy of the Angular look. Kept: the left vertical side menu, the selector + table of contents pattern, the hash routes. Details in `react-views.md`.
- **DHIS2 support:** v40 and v42. We will use the `d2-api` 4x branches and import both with aliases. We will centralize the code that interacts with `d2-api`, so the rest of the `data/` code uses it transparently.

## Design notes

- **Tables:** `ObjectsTable` from `d2-ui-components` is an option, but it is a bit old and slow. Not mandatory: pick whatever fits best.
- **E2E tests:** required, with Playwright. The migration replaces the entire codebase, so they are how we make sure the new app works like the original. Write them against the current app first, then run the same suite on the React app.

## E2E baseline

301 tests in about 11 minutes, on v42 with one full-access user: 294 passed, 7 skipped, 0 failed. Checklist and details: `e2e.md`.

First React run: read 224 passed, 1 failed, 6 skipped. Write 60 passed, 6 failed, 1 skipped. The failures are the five translation tests (translations pending) and one intermittent Admin test; the header title click is a known difference. Details in `e2e.md`.

Skipped:

- **App problems on v42 (2):** an expired session goes unnoticed; event chart and report resources disappear.
- **No data on the instance (5):** read-only checks, already covered by write tests using temporary data.

Twelve app problems found are listed in `e2e.md`, to fix once the migration is done.

## TODO

- [x] Write Playwright e2e tests covering all modules and run them against the current app, as the baseline
- [x] Set up the project from `dhis2-app-skeleton`
- [x] Set up the clean architecture layers (domain / data / presentation)
- [x] Decide on the API client and the table component: `d2-api` with the 4x branches, `@dhis2/ui` and an own `DataTable`
- [x] Migrate the app layout: navigation, user settings
- [ ] Translations (en, es, fr, pt, ar)
- [ ] Migrate the modules:
  - [x] `dossiers` (`reader`, `editor`)
  - [x] `dossierPrograms`
  - [x] `datasets`
  - [x] `dossierIndicators`
  - [x] `search`
  - [x] `admin`
- [x] Category Combos fix ([PR #68](https://github.com/EyeSeeTea/HMIS-Dictionary/pull/68)): already in `est/master` and the baseline, nothing to port. `DataSetElement.categoryCombo` is per element, so it can't recur
- [ ] Run the v42 e2e suite on the React app until it matches the baseline
- [ ] Use d2-api npm package @40 and @42 (with aliases)
- [ ] Run the e2e suite on v40
- [x] Integrate the features of [msf-oca-his/dhis-dictionary](https://github.com/msf-oca-his/dhis-dictionary) that are not already in HMIS-Dictionary: see `his-integration.md`, on branch `feature/his-integration`.

- [ ] When all is done, fix the known app problems in the React app (listed in `e2e.md`)
