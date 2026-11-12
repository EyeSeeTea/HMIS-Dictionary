# React views

Status: all eight steps are built (see Progress). What is left is verification against the Angular baseline: the e2e suite on the React app, and the translations. See "Not done yet".

Sources: `migration.md`, `code-architecture.md`, the Angular templates (`app/**/*.html` in `../HMIS-Dictionary-legacy`), and the checklist in `e2e.md`.

## Principles

- **Typical React app, not a clone:** same screens, same data and same behaviour, but standard React structure and look. No need to match the Angular pixels.
- **Kept from the Angular app:** the left vertical side menu, one page per module, the selector + table of contents pattern, the same hash routes (the e2e deep links depend on them).
- **Presentation only:** components call use cases through `compositionRoot` and render the domain results. Formula parsing, permissions and visibility rules live in the domain, never in a component.
- **One piece, one load:** each use case is a separate piece (see "Use cases" in `code-architecture.md`), so each section loads, shows its own spinner and fails on its own.
- **"A selection is loading":** true while any section of the selected item is still loading. `useSectionLoading` collects the state of all sections of a page and exposes `isLoading`. It drives the print button (disabled) and the loading message, which is a non-blocking banner, not an overlay.
- **Latest selection wins:** switching item quickly must only show the last one (the Future cancel handles it). Same in every module.
- **Location:** `src/webapp/pages/<module>/` for pages and their private components, `src/webapp/components/` only for what two or more modules use. A component used by one page lives in that page's folder, even if it looks generic.

## Routes

| Route                | Page                    | Visible when                               |
| -------------------- | ----------------------- | ------------------------------------------ |
| `/` and unknown      | redirect to `/search`   | always                                     |
| `/search`            | `SearchPage`            | always                                     |
| `/dossiers`          | `DossiersPage` (reader) | `showsDossiersTab()`                       |
| `/dossiers/editor`   | `DossiersPage` (editor) | `showsDossiersTab()` and `canManage(user)` |
| `/dossierPrograms`   | `ProgramsPage`          | always                                     |
| `/datasets`          | `DataSetsPage`          | always                                     |
| `/dossierIndicators` | `IndicatorsPage`        | always                                     |
| `/admin`             | `AdminPage`             | `canManage(user)`                          |

Cross-module links (Indicators to Data Sets and Programs) pass the object name as a query param, as today. Both `DataSetsPage` and `ProgramsPage` read it.

Permissions: `canManage` (admin, or no admin group configured) guards the Admin page, the Edit button and the editor route. `isAdmin` (strictly in the admin group) only guards the layout settings gear, as in `code-architecture.md`.

## App layout

| Component         | What it does                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppLayout`       | Header bar on top, `SideMenu` on the left, routed page on the right                                                                                                     |
| `SideMenu`        | Vertical items: Search, Dossiers, Programs, Data Sets, Indicators, Admin. Dossiers only with `showsDossiersTab()`, Admin only with `canManage`. Active item highlighted |
| `Router`          | Routes above. Guards hidden pages (redirect to `/search`)                                                                                                               |
| `AppContext`      | Extend with `settings`, `locale`, loaded once at startup (`GetAppSettings`)                                                                                             |
| `useSessionCheck` | Calls `CheckSession` on navigation and selection changes, reloads if it is false                                                                                        |
| `LoadingBanner`   | Non-blocking "Loading..." message while `useSectionLoading` says a selection loads                                                                                      |

## Shared components

`src/webapp/components/`

| Component              | Used by                                   | Notes                                                                                                                    |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `PageHeader`           | all                                       | Exists. Add a slot for the layout settings gear (Data Sets, Programs, Indicators) and the print button                   |
| `PrintButton`          | Dossiers, Programs, Data Sets, Indicators | In the `PageHeader` slot. Calls `window.print`, disabled while `isLoading`. Print CSS hides chrome                       |
| `useSectionLoading`    | same four                                 | Collects section load states, exposes `isLoading`                                                                        |
| `ItemSelector`         | Dossiers, Programs, Data Sets, Indicators | Searchable dropdown + "N items" counter, sorted by name                                                                  |
| `TableOfContents`      | same four                                 | Nested links that scroll to a section anchor, "Go to index" and "Back to top" links                                      |
| `ContentSection`       | same four                                 | Anchor id, title, count, help icon, hidden when empty                                                                    |
| `DataTable`            | all tables                                | Columns, sort, optional pagination, optional per-column filter, column visibility, `canSeeColumn` filter. See decision 2 |
| `HelpIcon`             | Search, Programs, Data Sets, Indicators   | Tooltip with the help text of a header or column                                                                         |
| `HtmlContent`          | Dossiers, Programs                        | Sanitized HTML (descriptions)                                                                                            |
| `VisualizationLink`    | Search, Programs                          | Icon, calls `SaveIndicatorVisualization`, opens the Data Visualizer in a new tab                                         |
| `ExportButton`         | Search, Programs                          | Runs an Excel writer (`exceljs`) over data already on screen                                                             |
| `LayoutSettingsDialog` | Search, Data Sets, Programs, Indicators   | Sections and columns with access per row, advanced groups field, restore / apply. Only for `isAdmin`                     |
| `useLayoutPermissions` | same four                                 | `GetLayoutSettings(view)` then `getPermissions(context)`                                                                 |
| `ProgressBar`          | Search, Programs, Data Sets               | For `onProgress` / `onStep` callbacks of the describe use cases                                                          |

## Pages

### Search

| Component                   | Notes                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchPage`                | Loads `GetSearchCatalog` with step progress                                                                                                                                                 |
| `SearchPanel`               | Global search input + button, "Clear filters", show / hide column filters. `\|` is OR                                                                                                       |
| `ColumnSelectorPanel`       | Checkbox groups: objects, descriptions, groups, services (hidden unless `showsHealthServiceColumns`), show / hide advanced columns, and the layout settings gear (only Search puts it here) |
| `SearchHelpPanel`           | Formatted help text                                                                                                                                                                         |
| `SearchTable`               | 18 columns, sort, paging, per-column filters, term highlight (`SearchFilter.highlightTerms`)                                                                                                |
| `HighlightedText`           | Wraps matches in a mark                                                                                                                                                                     |
| Expression and filter cells | Raw text first, then `DescribeExpressions` for the rows of the current page, error shown with the original expression                                                                       |
| `useSearchFilter`           | Holds `SearchFilter`, applies `matches(row)`                                                                                                                                                |
| `FormulaView`               | Renders `FormulaNode[]`: operators on new lines, tooltips, blacklisted / not-in-use tags and colours                                                                                        |
| `FormulaDialog`             | Expanded nested indicators, colour legend, max depth 1 to 10, cycle message. Opened by the Expand link                                                                                      |

Reuses: `VisualizationLink` (indicator rows only), `ExportButton` (`search_export.xlsx`, all filtered rows, visible columns), `HelpIcon`, `ProgressBar`, `DataTable`, `useLayoutPermissions`, `LayoutSettingsDialog`.

### Dossiers

| Component                    | Notes                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `DossiersPage`               | Chooses reader or editor from the route, owns the selected health service                                                           |
| `HealthServiceSelector`      | `ItemSelector` over `GetHealthServices`                                                                                             |
| `DossierReader`              | Title, description, `TableOfContents`, Edit button (`canManage`)                                                                    |
| `DossierDataSetBlock`        | "Data Set: X", sections with element count, table of name / form name / description                                                 |
| `DossierIndicatorGroupBlock` | "Indicator Group: X", table of name / description, count                                                                            |
| `DossierEditor`              | Rich text editor, language selector (ar, en, es, fr, pt), Save button states (idle, dirty, saved, error), toggle back to the reader |

Reuses: `ItemSelector`, `TableOfContents`, `ContentSection`, `DataTable`, `HtmlContent`, `PrintButton`, `useSectionLoading`.

### Programs

| Component                  | Notes                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ProgramsPage`             | Orchestrates the load order from `code-architecture.md`. Optional `name` param preselects from the Indicators screen |
| `ProgramSelector`          | `ItemSelector` + "show legacy elements" switch (kept for the session)                                                |
| `ProgramHeader`            | Title, `ExportButton`, `TableOfContents`, description                                                                |
| `AttributesSection`        | Tracker programs only                                                                                                |
| `StagesSection`            | One `StageBlock` per stage (repeatable tag), sections with count, virtual "Data Elements" section                    |
| `OptionSetPopover`         | Option list of a data element or attribute                                                                           |
| `ProgramIndicatorsSection` | Expression, filter, stages referenced, boundaries, visualization                                                     |
| `RelatedIndicatorsSection` | Numerator, denominator, stages referenced, visualization                                                             |
| `RulesSection`             | Table + `RuleActionDetails`, one rendering per action type (16 types)                                                |
| `RuleVariablesSection`     | With associated rules                                                                                                |
| `ResourcesSection`         | Dashboards, visualizations, event charts, event reports, links to the right app                                      |
| Excel writer               | Seven sheets, follows the legacy toggle                                                                              |

Reuses: `ItemSelector`, `TableOfContents`, `ContentSection`, `DataTable`, `HtmlContent`, `HelpIcon`, `VisualizationLink`, `ExportButton`, `ProgressBar`, `PrintButton`, `useSectionLoading`, `useLayoutPermissions`, `LayoutSettingsDialog`.

### Data Sets

| Component                  | Notes                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| `DataSetsPage`             | Optional `name` param preselects from the Indicators screen                       |
| `DataSetSelector`          | `ItemSelector`                                                                    |
| `DataSetSectionsSection`   | One table per section, virtual section when none                                  |
| `CategoryCombosSection`    | Combo cell spanning its categories, anchors for the links from the sections table |
| `DataSetIndicatorsSection` | Numerator and denominator with descriptions                                       |

Reuses: `ItemSelector`, `TableOfContents`, `ContentSection`, `DataTable`, `HelpIcon`, `ProgressBar`, `PrintButton`, `useSectionLoading`, `useLayoutPermissions`, `LayoutSettingsDialog`.

### Indicators

| Component                 | Notes                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `IndicatorsPage`          | Selector, name, description, `TableOfContents`                                                                          |
| `FormulaBreakdownSection` | Numerator and denominator: formula text, description, table of components (type, name, data sets, programs, "No Value") |

Reuses: `ItemSelector`, `TableOfContents`, `ContentSection`, `DataTable`, `HelpIcon`, `PrintButton`, `useSectionLoading`, `useLayoutPermissions`, `LayoutSettingsDialog`. Own component: `ObjectLink`, a link to Data Sets or Programs with the name param.

### Admin

| Component           | Notes                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| `AdminPage`         | Runs `RefreshDossierConfigStatus` on open, reloads when it changed                 |
| `ConfigStatusPanel` | Four checks with success / error                                                   |
| `SettingSelect`     | Select + submit button, disabled until a change. Used for user group and group set |
| `GroupListSetting`  | Multi-select of groups, one per blacklist / not-in-use / legacy list               |
| `TagSetting`        | Text field for the blacklist and not-in-use tags                                   |
| `AdminInfoBox`      | Tested version, languages, repository link, static help                            |

Reuses: `ContentSection`, `HelpIcon`. Every write calls `UpdateAppSettings` and reloads the app, as today.

## Progress

- [x] Step 1, app layout: `routes.ts` (single source of paths and availability), `Router` with guards and session check, `AppLayout`, `SideMenu`, `AppContext` with settings. Every module still renders `PlaceholderPage`.
- [x] Step 2, shared: `ItemSelector`, `TableOfContents` (+ `GoToIndexLink`, `BackToTopLink`), `ContentSection`, `DataTable` (sort, paging, filter row), `HtmlContent` (DOMPurify), `HelpIcon`, `PrintButton`, `LoadingBanner`, `useFuture`, `useSectionLoading`, `useSessionCheck`, `PageHeader` actions slot.
- [x] Step 3, layout settings: `useLayoutPermissions`, `LayoutSettingsDialog`, `LayoutSettingsButton` (gear, admins only), `layoutLabels` (Angular translation keys to English labels). Applying reloads the app.
- [x] Step 4, Data Sets and Indicators: `DataSetsPage` (sections, category combos, indicators with described formulas), `IndicatorsPage` (formula, numerator, denominator with links to Data Sets and Programs). Selector preselection from the name param is not done: the list is filtered, as in Angular.
- [x] Step 5, Search: `SearchPage` with panels, column selector, filters with highlight, expression texts for the current page, formula dialog, Excel export, visualization link
- [x] Step 6, Programs: `ProgramsPage` (all sections, legacy toggle kept in the session, load order of the architecture), `programExport` (seven sheets), `ruleActionFields`
- [x] Step 7, Dossiers: `DossiersPage` (reader and editor share the page, so the selected service survives), `DossierReader`, `DossierEditor` with TinyMCE (lazy-loaded, self-hosted, same toolbar), `locale` in the app context
- [x] Step 8, Admin: `AdminPage` with the four configuration checks (refreshed on open), `SettingSelect`, `TextSetting` per setting. Lists of ids are chosen by name in a multi-select (`IdsSetting`), tags are plain text (Angular showed them quoted). Every select has a "None" option, to clear the setting. Every write reloads the app.

## Build order

1. App layout: `Router`, `AppLayout`, `SideMenu`, `AppContext` with settings.
2. Shared: `ItemSelector`, `TableOfContents`, `ContentSection`, `DataTable`, `HtmlContent`, `HelpIcon`, `PrintButton`, `useSectionLoading`.
3. Layout settings: `useLayoutPermissions`, `LayoutSettingsDialog`, gear slot in `PageHeader`.
4. Data Sets and Indicators: smallest, they prove the selector + sections pattern.
5. Search: biggest table, with `FormulaView` and `FormulaDialog`.
6. Programs.
7. Dossiers: reader first, then the editor with TinyMCE (decision 3).
8. Admin.

## Decisions

1. **Redesign scope:** typical React look, keep only the general layout. `migration.md` updated.
2. **UI library:** `@dhis2/ui` for all new components, to align with the other EST apps. No `ObjectsTable`: a small own `DataTable` over a plain table, with paging and filters driven by the domain (`SearchFilter`).
3. **Rich text editor:** TinyMCE, current version through `@tinymce/tinymce-react`, self-hosted (no cloud API key, `license_key: "gpl"`). Same plugins and toolbar as the Angular app (`link image table textcolor preview wordcount lists advlist`; undo/redo, styles, font size, bold/italic, alignment, lists, indent, link, image, table, preview), so the client sees the same editor. The Angular app uses TinyMCE 4.5, so most of the "clunky" feeling comes from that old version and its Angular wrapper. `textcolor` is built into the core in recent versions.
4. **Print:** kept. Print button (disabled while loading) and print CSS that hides header, side menu, selector, edit button and "Back to top" links.
5. **Header:** the skeleton's default `HeaderBar`. No custom header and no floating print button for the Global Shell. The print button goes in the page header instead.

## Not done yet

- **E2E on the React app:** run once. The views now keep the DOM contract of `e2e.md` (ids and classes), and `e2e/support/widgets.ts` is adapted. Results and differences are in `e2e.md`. Still to do: the translations (the five failing tests) and the intermittent Admin test.
- **Translations:** the labels come from the Angular English file. Spanish, French, Portuguese and Arabic still have to be imported into `i18n/*.po`, and RTL checked.
- **Manual comparison** with the Angular app, screen by screen, and a run on v40.
- **Known bugs** (`e2e.md`) are kept on purpose until the suite matches.
