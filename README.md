# HMIS Dictionary
(08/09/2017)

The HMIS Dictionary is made to simplify user access to terminology and details associated with the data model. The application counts 4 panels:
- DataSets
- Search (aggregate and tracker data elements, and indicators)
- Programs
- Custom 'Dossiers' (with additional configuration)

NB: HMIS refers to Health Information Management System

## Panels

- **DataSets**: displays the list of sections, data elements and associated category combos, the organisation units where the data set is assigned, and a selection of what to print
- **Search**: a search tool to access directly data elements (aggregate and tracker domains) and indicators. Several words find rows with all of them (`a b`, or `a & b`), `a | b` finds either, and the results can be exported to Excel. The data is kept in the browser, and refreshed when the metadata changes
- **Programs**: displays the list of sections, data elements with optionSets, Program indicators, Indicators, Tracked Entity Attributes, Program Rules, Program Rule Variables and Program Resources (including the event reports and charts of the program), the organisation units where the program is assigned, and a selection of what to print
- **Dossiers**: displays list of data sets and indicator groups by 'service'
- **Admin**: configuration of the Dossiers panel and 'service' concept

## Configuration

The configuration relies on the following elements that have to be defined through the Maintenance app:
- an *organisationUnitGroupSet* that gather all the elements of the typology of services,
- the typology of services itself, each one is an *organisationUnitGroup* with a unique code: "OUG_HSV_#CODE#", their description are stored in tranlsations (description is only available in translations as of dhis v2.25),
- then *dataSets* and *indicatorGroups* have one attribute, repectively "DS_#CODE1#_#CODE2#..." and "ING_#CODE2#" that permits the direct association with the typology of services (association with multiple services is allowed),
- finally the *dataElements* are associated via the *sections* to the dataSets and the *indicators* are associated directly to the indicatorGroups (*dataElements* outside of *sections* would not appear).
- in *indicators* the descriptions of numerators and denominators cannot be translated (as of dhis v2.25) so the key words "NUM:" and "DENOM:" (both compulsory) are used in *indicators* descriptions (which have a translation).
- an *attribute* for *programs* where the associated resources are referenced by ID in the following format: "(ID1;ID2;...)". This *attribute* has to have its code field set to: "HMIS-Dict_Resources".

Some elements are defined at the **Admin** panel:
- The uid of the *organisationUnitGroupSet*
- The name of the group of user with editing right in the **Dossier** panel and the **Admin** panel too
- *dataSets*, *programs* and *indicatorGroups* can be blacklisted
- The selectors of **DataSets** and **Programs** can be limited to the items assigned to the organisation units of the user (off by default)

Some elements are still hardcoded:
- The search panel will not show *dataElements* or *indicators* that are not associated to a *dataSet* or an *indicatorGroup*
- The app is available in English, French, Spanish, Portuguese and Arabic (see [i18n/](i18n/)) and uses the content of DHIS2 in the languages available per MSF OCBA configuration

Some features come from the [HIS Dictionary](https://github.com/msf-oca-his/dhis-dictionary), see [docs/specs/his-integration.md](docs/specs/his-integration.md).

## Setup and Installation

Build the app running:

```console
shell:~$ yarn install # first time only
shell:~$ yarn build
```
This will create a `hmis-dictionary.zip` file that can be manually installed in DHIS2 App Management.

## Feedback

hmis@barcelona.msf.org

## Development

The app is built with DHIS2 + TypeScript + React, on top of [dhis2-app-skeleton](https://github.com/EyeSeeTea/dhis2-app-skeleton). Specs of the migration and the HIS integration: [docs/specs](docs/specs/README.md).

### Getting started

```sh
nvm use
corepack enable
yarn install
```

Create `.env.local` from `.env` and set your DHIS2 instance URL and credentials. The defaults in `.env` point to a public play server. Then start the development server:

```sh
yarn start
```

Open `http://localhost:8081` in your browser.

#### Build

```sh
yarn build
```

Produces a distributable DHIS2 `.zip` file.

#### Tests, linting, type-checking

```sh
yarn test
yarn lint
yarn typecheck
```

### Architecture

Clean architecture with three layers:

| Directory     | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `src/domain`  | Entities, use cases, repository interfaces           |
| `src/data`    | Repository implementations (DHIS2 API, test doubles) |
| `src/webapp`  | React presentation (pages, components, contexts)     |
| `src/scripts` | CLI scripts                                          |
| `src/types`   | Shared type definitions                              |
| `src/utils`   | Misc utilities                                       |
| `i18n/`       | Translations (gettext `.po` format)                  |
| `public/`     | Static webapp resources                              |

### Check

Run all code-quality to validate changes:

```
$ yarn run check
```

This runs the TypeScript typecheck, Prettier check, lint, and tests.
Individual checks can also be run with `yarn typecheck`, `yarn prettify:check`, `yarn lint`, and `yarn test`.

### Some development tips

#### Data structures (`src/domain/entities/generic`)

| Module       | Description                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| `Future`     | Cancellable async values with type-safe errors (lazily evaluated, unlike promises) |
| `Collection` | Wrapper over JS arrays with extended methods                                       |
| `HashMap`    | Immutable map (like ES6 Map, but immutable)                                        |
| `Either`     | Represents either a success value or an error                                      |
| `Struct`     | Base class for value objects with `create` and `update`                            |
| `Rec`        | Extended methods for JS objects                                                    |
| `Pagination` | Pagination types                                                                   |

#### d2-api version

The app supports DHIS2 2.40 and 2.42 with one zip. `package.json` has the two releases as npm aliases (`d2-api-40`, `d2-api-42`). `src/types/d2-api.ts` is the only file that imports them: `getD2Api` reads `/system/info` and creates the client of that version. The rest of the code is typed against 2.42, and only uses what both versions have.

### Development Notes

#### i18n

Update `.po` files from `i18n.t(...)` calls in source code:

```sh
yarn localize
```

#### CLI scripts

App scripts live in `src/scripts`, with their entries in `package.json` under `scripts`.

#### Secrets scan

The `.husky/pre-push` hook scans committed files with [Trivy](https://trivy.dev/latest/getting-started/) before pushing. Rules are defined in `trivy-secret.yaml` — by default it checks that `VITE_DHIS2_AUTH` doesn't contain real credentials (anything other than `admin:district`). Markdown files are excluded since they may contain `.env` examples.

If Trivy is not installed, the scan can be skipped with a `(y/N)` prompt. To force-skip: `SKIP_SECRET_SCAN=1 git push`. **Make sure no secrets were added before using these skips.**

#### Proxy

Requests to DHIS2 are proxied (see `vite.config.ts` → `server.proxy`) from `http://localhost:8081/dhis2/xyz` to `${VITE_DHIS2_BASE_URL}/xyz`, avoiding CORS issues.

#### Environment variables

Use `import.meta.env.NAME` to access `.env` variables in the React app. It's recommended to read them at the app entry point and pass values down, rather than scattering `import.meta.env` calls throughout the code.

### Docs

Generate API documentation with [TypeDoc](https://typedoc.org/example/):

```sh
yarn generate-docs
```
