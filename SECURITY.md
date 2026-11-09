# Security

## Dependency gate

Every pull request runs the shared EyeSeeTea workflow. Its Dependency-Track job builds a CycloneDX SBOM from the whole `yarn.lock`, dev dependencies included, and uploads the findings to GitHub code scanning. The job fails if the branch has open critical or high alerts that the base branch does not have.

Two things to know when checking locally:

- **Severity:** Dependency-Track scores by CVSS. `yarn npm audit` and the GitHub advisory page can rate the same advisory lower: GHSA-w5hq-g745-h8pq (`uuid`) is "moderate" on GitHub but CVSS 7.5, so the gate counts it as high.
- **Scope:** build and test tooling counts as much as the app bundle.

How each pin is set, and when to drop it, is in `RESOLUTIONS.md`.

## Decisions

Newest first. Each entry says what was decided, why, and who decided.

### 2026-11-09: `braces` removed with the tools that brought it

- **Finding:** GHSA-vfj7-8cjw-p6xm, high, in `braces@3.0.3`. No release fixes it, and GitHub has since withdrawn the advisory as not practically exploitable, but the gate still counted it.
- **Options:** dismiss the alert in GitHub code scanning, or remove what brings `braces` in. It only came through two dev-only lint tools: `depcheck` (no script used it) and `ts-prune` (archived, used by the manual `lint-unused` script), both through `micromatch`.
- **Decision:** replace both with `knip`, which does both jobs and does not depend on `micromatch`. `yarn lint-unused` now runs `knip`, configured in `knip.json`. No alert was dismissed.
- **Decided by:** Arnau Sanchez, in PR #70.

### 2026-11-06 to 2026-11-09: clearing the gate for PR #70

- **Finding:** 4 critical and 28 high, all in dependencies.
- **Decision:** `yarn up -R` for the stale lockfile entries, and two scoped pins where the parent asks for an unpatched major: `vitest/tinypool` and `exceljs/uuid` (`RESOLUTIONS.md`).
- **Result:** 0 critical and 0 high. The moderate and low findings left are accepted for now; `RESOLUTIONS.md` lists those with no fix.
