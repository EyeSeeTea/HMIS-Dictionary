# E2E tests

Playwright tests for HMIS Dictionary. The same specs run against the AngularJS app and the React app, and only `E2E_BASE_URL` changes. See `docs/specs/e2e.md` for the checklist and the rules.

## Setup

1. Install the app on the instance, with `e2e/scripts/install-app.sh path/to/app.zip`.
2. Set `E2E_USERNAME` and `E2E_PASSWORD` for a user with full access. Credentials are never committed.
3. Run `npx playwright install chromium` once.

Optional settings:

- `E2E_DHIS2_URL`: the instance (default `http://localhost:8098`)
- `E2E_BASE_URL`: the app outside the Global Shell
- `E2E_SHELL_URL`: the app inside the Global Shell
- `E2E_APP_KEY`: the app key used to build both URLs (default `HMIS-Dictionary`)

## Running

- `yarn test:e2e`: everything. Read-only tests run in parallel, then write tests one at a time
- `yarn test:e2e:read`: read-only tests
- `yarn test:e2e:smoke`: one read-only test per module

Reports are written to `e2e/playwright-report`, and screenshots of each screen to `e2e/test-results/screens`.

## Write tests

Write tests restore what they change. If a run is interrupted, some changes may remain, so save the state first and restore it afterwards:

```sh
python3 e2e/scripts/instance-state.py save /some/folder
python3 e2e/scripts/instance-state.py check /some/folder
python3 e2e/scripts/instance-state.py restore /some/folder
```

## Moving to React

Only `e2e/support/widgets.ts` should change, because it wraps the Search table and the rich text editor. Everything else relies on roles, visible text and the DOM contract in `docs/specs/e2e.md`.
