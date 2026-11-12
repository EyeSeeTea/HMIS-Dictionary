# Security

## Dependency gate

Every pull request runs the shared EyeSeeTea workflow. Its Dependency-Track job builds a CycloneDX SBOM from the whole `yarn.lock`, dev dependencies included, and uploads the findings to GitHub code scanning. The job fails if the branch has open critical or high alerts that the base branch does not have.

Two things to know when checking locally:

- **Severity:** Dependency-Track scores by CVSS. `yarn npm audit` and the GitHub advisory page can rate the same advisory lower: GHSA-w5hq-g745-h8pq (`uuid`) is "moderate" on GitHub but CVSS 7.5, so the gate counts it as high.
- **Scope:** build and test tooling counts as much as the app bundle.

How each pin is set, and when to drop it, is in `RESOLUTIONS.md`.

## Decisions

Newest first. Each entry says what was decided, why, and who decided.

### 2026-11-09: `sprintf-js` removed with the i18n generator

- **Finding:** GHSA-hp3w-g68c-fv3c, moderate, in `sprintf-js@1.0.3`, with no fixed release. Dependency-Track reported it in CI after the entry below; OSV did not, because its record does not match version 1.0.3. Check with Dependency-Track, not only OSV.
- **Decision:** the goal is zero vulnerabilities, so remove it. It came from `@dhis2/d2-i18n-generate`, through `argparse@1` (`argparse@2` has another API, so a pin breaks the tool). Replaced by `src/scripts/dev/GenerateLocalesScript.ts`, which writes the same `src/locales` files (compared byte for byte) with `gettext-parser`. `i18next-conv`, `node-gettext` and `handlebars` left the tree with it, and the `i18next-conv/node-gettext` pin with them.
- **Decided by:** Arnau Sanchez, in PR #70.

### 2026-11-09: no known vulnerabilities left

- **Finding:** after the gate passed, 11 moderate and 2 low findings remained.
- **Decision:** fix them all, not only the critical and high ones the gate checks.
    - `elliptic` and `pbkdf2`: removed with the browser polyfills (`vite-plugin-node-polyfills`). They were only there for `md5.js`, used by `src/utils/uid.ts`, which nothing imported. All three are gone. Two bundled modules still use the Node global `Buffer` (`d2-api`'s fetch client and `btoa`), so `src/webapp/polyfills.ts` provides only that one, from the `buffer` package.
    - `qs`, `moment`, `minimatch`: pinned to patched releases (`RESOLUTIONS.md`).
    - `vitest`: upgraded from 3 to 4.1.12, which also made the `vitest/tinypool` pin unnecessary.
    - `deepmerge` (no fixed release): it came from `@dhis2/d2-i18n-extract`, through `i18next-scanner`. Replaced by `src/scripts/dev/ExtractPotScript.ts`, which finds the `i18n.t("...")` texts with the TypeScript compiler. It also extracts 16 texts the old tool dropped: those with a `:`, which it read as an i18next namespace.
- **Result:** OSV reports no finding for any package in `yarn.lock`.
- **Decided by:** Arnau Sanchez, in PR #70.

### 2026-11-09: `braces` removed with the tools that brought it

- **Finding:** GHSA-vfj7-8cjw-p6xm, high, in `braces@3.0.3`. No release fixes it, and GitHub has since withdrawn the advisory as not practically exploitable, but the gate still counted it.
- **Options:** dismiss the alert in GitHub code scanning, or remove what brings `braces` in. It only came through two dev-only lint tools: `depcheck` (no script used it) and `ts-prune` (archived, used by the manual `lint-unused` script), both through `micromatch`.
- **Decision:** replace both with `knip`, which does both jobs and does not depend on `micromatch`. `yarn lint-unused` now runs `knip`, configured in `knip.json`. No alert was dismissed.
- **Decided by:** Arnau Sanchez, in PR #70.

### 2026-11-06 to 2026-11-09: clearing the gate for PR #70

- **Finding:** 4 critical and 28 high, all in dependencies.
- **Decision:** `yarn up -R` for the stale lockfile entries, and two scoped pins where the parent asks for an unpatched major: `vitest/tinypool` and `exceljs/uuid` (`RESOLUTIONS.md`).
- **Result:** 0 critical and 0 high. The moderate and low findings left are accepted for now; `RESOLUTIONS.md` lists those with no fix.
