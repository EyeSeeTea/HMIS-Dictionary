# E2E test proposal - HMIS Dictionary migration

**Status:** implemented in `e2e/` and passing against the AngularJS app on v42. The React app does not exist yet, so the suite has not run against it. Ticks come from real results, through `e2e/scripts/tick-checklist.py`. See "Run notes and problems" for what is left.

**Baseline:** `EyeSeeTea/HMIS-Dictionary` `master` (`8652578`, v1.16.1).

**Target:** `http://localhost:8098`, DHIS2 v2.42.5.1, a local copy of the MSF OCBA instance. Credentials come from `E2E_USERNAME` and `E2E_PASSWORD`, and are never committed.

Tags used in the checklist:

- `[W]` writes to the instance, so the test restores what it changed. These tests run serially.
- `[M]` mocks a `dataStore/HMIS_Dictionary` response with a Playwright route, to force a configuration the instance does not have.

Untagged tests are read-only and can run in parallel.

## Decisions

- **Serving:** the app is built as a zip and installed on 8098, and tests run on it standalone and inside the Global Shell.
- **Users:** one user with full access (`pentaho`). Tests that need a restricted role are out of scope.
- **DHIS2 versions:** v42 only.
- **Graph:** dropped, with no tests.
- **Page structure:** React keeps the DOM contract below where it can, with no test ids added to the current app.
- **Table and rich text editor:** React is free to use a more suitable modern solution, so only their isolated helpers change.

## Framework-independent suite

The same specs run against the AngularJS app first and the React app later. The only setting that changes is `E2E_BASE_URL`, so there are no per-app adapters and no `E2E_TARGET`.

**Rules for specs and page objects**

- Specs only describe behaviour and call page objects. Selectors live only in page objects.
- Selector order: role and accessible name, then visible text, then the DOM contract.
- Nothing that exists only in AngularJS: no `ng-*` attributes, `angular.element`, scopes or digests.
- No internal state: no `sessionStorage` keys, globals or Bootstrap plugin calls.
- Waiting uses Playwright's auto-retrying assertions and the loading indicator, never fixed sleeps.
- Text checks read expected labels from `languages/*.json`, which the React app must carry over or match.

**Rules for the API**

- Assert results, not requests. React may use other endpoints, `fields` or HTTP methods, so tests read the saved state back through the API.
- The API helper in the tests calls DHIS2 directly, so it does not depend on either app.
- The `dataStore/HMIS_Dictionary` keys and value formats are a shared contract, because React reads the same configuration. They are the only responses that are mocked.
- Other missing states use real temporary metadata (prefixed `E2E_`, deleted afterwards) or real user settings, so they work whichever requests the app makes.
- Route patterns accept an optional API version (`/api/` and `/api/42/`).

**DOM contract**

- Selectors: `#drpBoxServices`, `#drpBoxUG`, `#drpBoxOUGS`, `#drpBoxLanguage`, native `<select>`
- Search: `#searchTable`, `#accordion`, `#collapseOne`, `#collapseTwo`, `#collapseThree`, `#indicatorFormulaModal`, `#maxDepthInput`, `.highlighted`, `.tooltipcontainer`, `.tooltiptext`, and `input[name="searchTerm"]`
- Editor and reader: `#editDescButton`, `#saveButton`, with `btn-warning` and `btn-success` for its state
- Admin: `#divUG`, `#divOUGS`, `#divOUG`, `#divA`, with `alert-success` and `alert-danger` for their state, and the `#submit*` buttons
- Layout settings: `#layoutSettingsModal`
- Shell: `#menu-container` with its tab ids, `.printButton`, `.loading`
- Dossier pages: `#tocContainer`, `#DossierTitleContainer`, `#dossierDescription`, `#stageContainer`, `h2.stage`, `h2.dataset`, `h2.indicatorGroup`, `h3.section`
- Scroll targets: `#headerDossierPanel`, and the section and object ids used by the tables of contents

**Expected changes when moving to React**

Three page object helpers are isolated because they wrap third-party widgets that React may replace. If so, only these helpers change:

- `SearchTable`: sorting, column filters and pagination (`ng-table` today)
- `RichTextEditor`: reading and writing content, and the toolbar (TinyMCE today)
- `AppFrame`: locating the app inside or outside the Global Shell iframe

## Test data on 8098

Tests compare the UI against API responses rather than hardcoded counts, because the instance is large and may be refreshed. Search needs generous timeouts: it loads about 4,000 data elements, 1,900 indicators and 3,800 program indicators.

- **Services:** group set `g7k6NQmqJY2` (37 services). `xIz3n0VWiDl` Outbreak Measles has descriptions in en, es, fr and pt.
- **Data sets:**
  - `jn8nB25hA8v` Meningitis: Age distribution (small, with sections)
  - `rFIy2mYoFiu` 25-08-REAC-Zamfara (OCV) (one section, no data elements, blacklisted)
  - The category combo override scenario picks the smallest suitable data set through the API
- **Programs:**
  - `LlBkgJO9WCv` Ambulances Line list (description, sections, rules, few indicators)
  - `NQF5RvfjwaX` Mental Health - Group (repeatable stage, attributes, description)
  - `vYRMQ43Zl3Y` eCare Pilot Project (stage with no sections)
  - `Rs4W7I3twdy` BOAT Medical Linelist (no rules, variables or indicators)
- **Indicators:** `rPAOXzG3811` SIPCA-IPD: Average IPC Score (the only one with nested indicators in its numerator)
- **Configuration in use:** blacklists, not-in-use groups, legacy groups and layout settings for all four views are set. The two tag keys are unset, so the default tag texts apply.

**Created by the tests, because 8098 does not have them `[W]`:**

- A data set with no sections
- Program resources (no program uses the resources attribute), one of each type
- Indicators with a cyclic reference
- Program rule actions of any type missing on 8098
- A group that is not in use without also being blacklisted (`ttzCFjzBTDS` is in both lists)

## Checklist

### 0. Infrastructure

- [x] Add Playwright in `e2e/` on `feature/react-migration`, with `E2E_BASE_URL` as the only per-app setting
- [x] Add separate read-only and write projects, so write tests run serially
- [x] Add script to build and install the app
- [x] Add login helper with a stored session
- [x] Add page objects, including the three isolated helpers
- [x] Add API helper to read expected values, with a locale option
- [x] Add `.xlsx` reader helper for export checks
- [x] Add snapshot and restore helper for `dataStore/HMIS_Dictionary`, translations, user settings and created visualizations `[W]`
- [x] Add helper to create and delete `E2E_` metadata `[W]`
- [x] Fail any test on an uncaught page error. Do not fail on API errors or console messages, which differ between apps
- [x] Add a guard that fails the suite on selectors or code that exist only in AngularJS (`ng-*`, `angular.`, `$scope`)
- [x] Save a screenshot of each screen for manual comparison, without failing the run

### 1. App shell and navigation

**Loading and session**

- [x] The app loads inside the Global Shell, at its app path
- [x] The app loads standalone, at its direct URL
- [x] The app appears in the DHIS2 app list as "HMIS Dictionary", with its icon
- [x] Without a session, opening the app leads to the login page
- [ ] If the session expires, switching module leads to the login page `[W]`

**Navigation**

- [x] Opening the app with no hash redirects to `#/search`
- [x] An unknown route redirects to `#/search`
- [x] Deep links work: `#/search`, `#/dossiers`, `#/dossiers/editor`, `#/dossierPrograms`, `#/datasets`, `#/dossierIndicators`, `#/admin`
- [x] Clicking each side tab shows its module, updates the URL and marks the tab as active
- [x] Browser back and forward move between modules
- [x] Reloading keeps the current module
- [x] Tabs appear in order: Search, Dossiers, Programs, Data Sets, Indicators, Admin

**Header**

- [x] Page title is "Metadata Dictionary"
- [x] Standalone: header shows the title, and clicking it goes to the DHIS2 home page
- [x] Inside the Global Shell: only one header is displayed, and the floating print button replaces the header one

**Tab visibility**

- [x] Dossiers tab is shown only when `setup_organisationUnitGroupSet` has a value `[M]`
- [x] Admin tab is shown to the full-access user
- [x] Admin tab is shown when `setup_userGroup` does not exist `[M]`

**Missing configuration**

- [x] App loads when each `HMIS_Dictionary` key is missing, using its default `[M]`:
  - [x] `setup_userGroup`, `setup_organisationUnitGroupSet`, `setup_dossierConfigComplete`
  - [x] `blacklist_dataElementGroups`, `blacklist_dataSets`, `blacklist_indicatorGroups`, `blacklist_tag`
  - [x] `notInUse_indicatorGroups`, `notInUse_programIndicatorGroups`, `notInUse_tag`
  - [x] `legacy_dataElementGroups`, `legacy_optionGroups`
- [x] App loads with the whole `HMIS_Dictionary` namespace missing `[M]`

**Loading indicator and print**

- [x] Loading indicator appears with its message, then disappears
- [x] Print button is disabled while a selection loads, and enabled once it has loaded, on Dossiers, Programs, Data Sets and Indicators
- [x] Print button calls `window.print` (stubbed)
- [x] Print media hides the header, side menu, selector panel and edit button, on each module
- [x] Print media hides the "Back to Top" links

**Help icons**

- [x] Help icons show their text on the headers and columns of Search, Programs, Data Sets and Indicators

### 2. Translations

Language tests set the real `keyUiLocale` user setting on a test user `[W]`, so they do not depend on how the app reads it.

- [x] For each of en, es, fr, pt, ar: side tabs and each module's labels are in that language
- [x] Regional locale (`pt_BR`, `es_419`, `ar_EG`) resolves to its base language
- [x] Unsupported locale (`ru`) falls back to English
- [x] User with no language setting uses the system default
- [x] Labels missing in a language display the English text
- [x] Metadata names and descriptions follow the user's language, checked on Dossiers
- [x] Arabic sets `dir="rtl"` on the document, and aligns the page content to the right
- [x] Other languages set `dir="ltr"`
- [x] Search help text is translated, with its formatting
- [x] Excel export headers are translated, on Search and Programs

### 3. Layout settings and access levels

**Settings dialog, for each of Search, Data Sets, Programs and Indicators**

- [x] Settings button is visible
- [x] On Search the button is inside the Select Columns panel, and on the others it is in the page header
- [x] Dialog lists sections with their columns, translated
- [x] Dialog shows the stored access for each row, with the admin column always checked and disabled
- [x] Restore is disabled with no changes, and undoes the pending changes
- [x] Close and the X button discard the pending changes
- [x] Apply saves to `layoutSettings_<view>` and reloads `[W]`
- [x] Apply with no changes reloads, with the stored value unchanged
- [x] Advanced groups: a non-JSON-array value shows the format error, with no write
- [x] Advanced groups: an unknown group shows the group error, with no write
- [x] Advanced groups: a valid group is saved `[W]`
- [x] Focusing the field clears the error
- [x] With no stored settings, the module displays with its default access `[M]`
- [x] Stored settings missing a newer column still show it, on Search and Data Sets `[M]`

**Access applied**

- [x] Stored settings on 8098 give the full-access user every Search column

### 4. Search

**Data loading**

- [x] Table loads data elements, indicators and program indicators, each with the right type
- [x] Tracker-domain data elements are excluded
- [x] Data elements in a blacklisted group are excluded
- [x] Data elements in no data set are included
- [x] Blacklisted data sets are left out of a row's group columns, and the row stays
- [x] Indicators in any blacklisted group are excluded
- [x] Indicators in no group are included
- [x] Not-in-use indicators and program indicators are visible to the full-access user `[M]`
- [x] Data element in several data sets lists all of them, comma separated
- [x] Service column is populated for a data element and an indicator, including a multi-service value
- [x] Group columns show data sets for data elements, indicator groups for indicators, and program indicator groups for program indicators
- [x] Service columns are hidden when `setup_dossierConfigComplete` is false `[M]`

**Formulas**

- [x] Indicator formulas show names instead of UIDs, for `#{de}`, `#{de.coc}`, `I{pi}` and `N{ind}`
- [x] Numerator and denominator columns both work
- [x] Operators appear on separate lines, and hovering an item shows its description
- [x] Blacklisted items in a formula show the tag, using the default text and a configured text `[M]`
- [x] Not-in-use items in a formula show the tag, using the default text and a configured text `[M]`
- [x] Program indicator expression and filter are translated for the rows on the current page
- [x] Moving to another page translates the rows on that page
- [x] A translation error displays the error with the original expression `[W]`
- [x] "Expand" appears only on formulas with nested indicators, in numerator and denominator

**Formula dialog**

- [x] Title shows the indicator and whether it is the numerator or denominator
- [x] Nested indicators are expanded, with a colour legend listing each one, its description and id
- [x] Changing the maximum depth updates the formula, within the limits of 1 and 10
- [x] Cyclic reference displays the cycle message and does not hang `[W]`
- [x] Close and the X button close the dialog

**Search and filters**

- [x] Global search matches any column, case-insensitively, updating as you type
- [x] The search button and the Enter key apply the term
- [x] Global search also matches hidden columns (for example, by UID)
- [x] `|` works as OR, with spaces trimmed
- [x] Regex characters are treated literally
- [x] The matched term is highlighted, for global search and for column filters
- [x] Search with no results shows an empty table
- [x] Column filters are visible by default, and the checkbox toggles them
- [x] Each visible column has a filter
- [x] Column filter narrows by that column only, also supports `|`, and combines with global search as AND
- [x] "Clear filters" is disabled with no filters, and clears the global term and column filters

**Table**

- [x] Each column sorts ascending and descending
- [x] Default page size, page size options and page navigation work
- [x] Filtering updates the page count, and returns to a valid page

**Panels and columns**

- [x] Search, Select Columns and Help panels expand and collapse, with Search open by default
- [x] Default visible columns: type, name, short name, description and service name
- [x] Select Columns groups: objects, descriptions, groups and services
- [x] Each column checkbox shows and hides its column, for all 18 columns
- [x] Column checkboxes show their help text
- [x] "Show / Hide advanced columns" reveals the advanced columns for an admin
- [x] Services group is hidden when `setup_dossierConfigComplete` is false `[M]`
- [x] ICD10 column shows the code for data elements that have it
- [x] Help panel shows the formatted help text

**Export**

- [x] Export downloads `search_export.xlsx`, with a "Search Data" sheet
- [x] The file has all filtered rows, not just the current page
- [x] The file has only the visible columns, with their headers, in order
- [x] Indicator formula cells contain plain text, in English
- [x] Accented text is preserved
- [x] The table returns to the same page and page size afterwards

**Visualization link**

- [x] Icon appears on indicator rows, and not on data element or program indicator rows
- [x] First click creates a visualization named `<indicator> - <id>`, with its formula items and the indicator as rows `[W]`
- [x] Second click updates the same visualization and does not create a duplicate `[W]`
- [x] Visualization is a pivot table for this year and the user's organisation unit `[W]`
- [x] Sharing includes `ALL USERS` when that group exists `[W]`
- [x] Sharing falls back to public read when that group does not exist `[W]`
- [x] Data Visualizer opens in a new tab with the visualization id, and loads without errors `[W]`
- [x] Search stays responsive after opening a visualization `[W]`

### 5. Dossiers - reader

- [x] Counter shows the number of services, sorted by name in the selector
- [x] Before selecting: counters at zero, and no title, table of contents or description
- [x] Selecting a service updates the title and the data set and indicator group counters
- [x] Only data sets and groups with that service code are listed, including multi-service values
- [x] Code matching is exact (`_AB` does not match a service `A`)
- [x] Data sets show "Data Set: X", and each section shows "Section: X" with its element count
- [x] Section tables show name, form name and description
- [x] Section named "Comments" (translated) is excluded
- [x] Data set with no data elements renders with no errors
- [x] Indicator groups show "Indicator Group: X", with name and description sorted by name, and the count
- [x] Description is rendered as HTML, in the user's language
- [x] Service with no description renders with no errors
- [x] Table of contents lists the description, data sets with their sections, and indicator groups, sorted by name
- [x] Each table of contents link scrolls to its target
- [x] "Back to Top" and "Go to index" links scroll to the top
- [x] Switching service replaces all content, with nothing left over
- [x] Switching between services that share an indicator group keeps that group in the table of contents
- [x] Edit button is visible

### 6. Dossiers - editor

- [x] Edit button opens the editor (`#/dossiers/editor`) with the current description loaded
- [x] Toggle button returns to the reader
- [x] Opening `#/dossiers/editor` directly with no service selected displays the selector, with no errors
- [x] Editor shows the expected tools: undo, styles, font size, formatting, alignment, lists, indent, link, image, table and preview
- [x] Language selector offers AR, EN, ES, FR, PT, with EN selected by default
- [x] Changing language loads that locale's description
- [x] Each locale loads its own description on v42 (regression)
- [x] Changing service in the editor loads its description
- [x] Save button is disabled while loading, and enabled afterwards
- [x] Save button turns to warning state on edit, and success state after saving `[W]`
- [x] The description is saved under the selected locale, read back through the API `[W]`
- [x] Saved text appears in the reader after a reload, for a user in that language `[W]`
- [x] Saving Arabic text works `[W]`
- [x] Saving one locale keeps the other locales and the non-description translations, such as NAME `[W]`
- [x] Saving empty content removes that locale's description only `[W]`
- [x] HTML formatting survives a save and reload, including a table and a list `[W]`
- [x] Failed save does not show the success state `[W]`

### 7. Programs

**Selector and general**

- [x] Counter shows the number of programs, sorted by name in the selector
- [x] Nothing is displayed before selecting a program
- [x] Selecting a program shows its title, export button and table of contents
- [x] HTML description is rendered, with its table of contents entry
- [x] Program with no description has no description block or entry
- [x] Table of contents order: description, attributes, stages, program indicators, indicators, rules, resources
- [x] Each table of contents link scrolls to its target
- [x] "Go to index" links scroll to the top
- [x] Switching program replaces all content, with no duplicated table of contents entries
- [x] Switching program quickly shows only the last selected program's data
- [x] Leaving the module while loading does not break the next module

**Stages**

- [x] Stages follow `sortOrder`
- [x] Table of contents shows "Stage: X", plus "(Repeatable)" for repeatable stages, with sections as children
- [x] Stage descriptions are displayed
- [x] Stage with sections shows each section, with element count
- [x] Stage with no sections falls back to a "Data Elements" table
- [x] Columns: name, form name, description, value type, calculation mode, mandatory, visibility, option set
- [x] Mandatory comes from the stage's data element, with and without sections
- [x] Calculation mode shows default, the program rules that assign the value, or other
- [x] Visibility shows the rules hiding the field or section
- [x] Option set selector lists the options, and is absent when there is none

**Legacy elements toggle and blacklist**

- [x] Data elements in a blacklisted group are never displayed
- [x] Data elements in a legacy group are hidden by default, and shown with the toggle
- [x] Options in a legacy group are hidden by default, and shown with the toggle
- [x] Turning on the toggle with a program selected applies it
- [x] The toggle stays on after a reload in the same session
- [x] The toggle is off in a new session

**Tracked entity attributes**

- [x] Table is displayed for tracker programs, with its count, and absent for event programs
- [x] Columns: name, form name, description, value type, aggregation type, mandatory, visibility, option set
- [x] Legacy options are hidden unless the toggle is on

**Program indicators**

- [x] Table lists the program's indicators, sorted by name, with its count
- [x] Calculation shows a readable description
- [x] Columns: name, description, filter, calculation, aggregation type, type, stages referenced, boundaries, visualization
- [x] Stages referenced lists the right stages, for the expression and for the filter
- [x] Analytics period boundaries are listed
- [x] Not-in-use program indicators are visible to the full-access user `[M]`
- [x] Program with no program indicators has no block or entry
- [x] Visualization link creates or updates a visualization and opens it `[W]`

**Indicators**

- [x] Table lists indicators referencing this program through `D{}`, `A{}` or `I{}`, sorted by name
- [x] Indicators table: blacklisted indicators are excluded, and not-in-use ones are visible `[M]`
- [x] Columns: name, description, type, numerator, denominator, stages referenced, visualization
- [x] Numerator and denominator show readable descriptions
- [x] Program with no indicators has no block or entry
- [x] Visualization link includes the formula items `[W]`

**Program rules**

- [x] Rules table: name, description, stage, condition and actions, with its count
- [x] Each action type shows its own fields:
  - [x] `ASSIGN`, `DISPLAYKEYVALUEPAIR`, `DISPLAYTEXT`
  - [x] `ERRORONCOMPLETE`, `WARNINGONCOMPLETE`, `SHOWERROR`, `SHOWWARNING`
  - [x] `HIDEFIELD`, `HIDEOPTION`, `HIDEOPTIONGROUP`, `HIDEPROGRAMSTAGE`, `HIDESECTION`
  - [x] `SCHEDULEMESSAGE`, `SENDMESSAGE`, `SETMANDATORYFIELD`, `SHOWOPTIONGROUP`
- [x] Message actions show the notification template name
- [x] Program with no rules has no block or entry

**Program rule variables**

- [x] Variables table: name, source type, stage, data element, attribute, associated rules, with its count
- [x] Associated rules lists the rules using each variable
- [x] Program with none has no block

**Resources**

- [x] Table lists the resources from the `HMIS-Dict_Resources` attribute, with its count `[W]`
- [x] Dashboard and visualization resources show their label and link to the right app and id `[W]`
- [ ] Event chart and event report resources are listed, with their label and a link to the right app and id `[W]`
- [x] Program with no attribute value has no block or entry

**Export**

- [x] Export downloads `<program>-<date>.xlsx`, with unsafe filename characters replaced
- [x] Sheets: Data Elements, Tracked Entity Attributes, Indicators, Program Indicators, Program Rules, Program Rules Actions, Program Rules Variables
- [x] Data Elements sheet includes stage, section, option set name and options
- [x] Program Rules Actions sheet lists the actions
- [x] Sheet row counts match the tables on screen
- [x] Export follows the legacy elements toggle
- [x] Export works on a program with no rules, variables or indicators (`Rs4W7I3twdy`)
- [x] Export works on an event program, with no attributes sheet
- [x] Export can be repeated, and after switching program it has the new program's data

### 8. Data Sets

**Selector and general**

- [x] Counter shows the number of data sets, sorted by name in the selector
- [x] Blacklisted data sets are excluded from the selector
- [x] Empty blacklist shows all data sets `[M]`
- [x] Selecting a data set shows its title and table of contents
- [x] Table of contents order: sections, category combinations, indicators
- [x] Each table of contents link scrolls to its target
- [x] "Go to index" links scroll to the top
- [x] Switching data set replaces all content, with nothing left over
- [x] Switching data set quickly shows only the last selected one's data

**Sections**

- [x] Data set with sections shows each section, with element count
- [x] Data set with no sections shows one "Data Elements" table, and its table of contents is adjusted `[W]`
- [x] Section with no data elements renders with no errors
- [x] Columns: name, form name, short name, description, value type, options, category combination
- [x] Options are listed for data elements with an option set

**Category combinations**

- [x] Category combo is right per element, with sections (PR #68)
- [x] Category combo is right per element, without sections (PR #68) `[W]`
- [x] Data set override of the category combo takes precedence over the element's own
- [x] Category combinations table lists every combo in use, with its categories and items, with and without sections
- [x] Combo with several categories is displayed across rows, with the combo cell spanning them
- [x] Clicking a category combo in a row scrolls to its definition

**Indicators**

- [x] Table lists indicators using this data set's elements through `#{de.coc}`, sorted by name
- [x] Data set indicators: blacklisted indicators are excluded, and not-in-use ones are visible `[M]`
- [x] Columns: name, short name, type, numerator, numerator description, denominator, denominator description
- [x] Numerator and denominator show readable descriptions
- [x] Indicators block and entry are absent when there are none

### 9. Indicators

- [x] Counter shows the number of indicators, sorted by name in the selector
- [x] Selector: blacklisted indicators are excluded, and not-in-use ones are visible `[M]`
- [x] Nothing is displayed before selecting an indicator
- [x] Selecting an indicator shows its name, description and table of contents
- [x] Formula section shows the numerator and denominator with names and operators
- [x] Formula handles `#{de}`, `#{de.coc}`, `I{pi}`, `D{program.de}`, `G{group}` and plain numbers
- [x] Numerator table lists each item with its type, name, data sets and program, sorted by name
- [x] Denominator table does the same
- [x] Types: aggregate data element, tracker data element, program indicator, number, organisation unit group
- [x] Data element in no data set shows "No Value"
- [x] Numerator and denominator descriptions are displayed
- [x] Sections with no items are hidden
- [x] Each table of contents link scrolls to its target
- [x] "Go to index" links scroll to the top
- [x] Clicking a data set opens Data Sets with that data set available in the selector
- [x] Clicking a program opens Programs with that program available in the selector
- [x] Switching indicator replaces all content, with nothing left over
- [x] Switching indicator quickly shows only the last selected indicator's data

### 10. Admin

**Page**

- [x] The full-access user can open the page
- [x] Information box shows the tested version, languages and a link to the repository
- [x] Static help and information text is displayed

**Configuration checks**

- [x] User group: success when set, with the selector showing the saved group; error when missing `[M]`
- [x] Group set: success when set, with the selector showing the saved set; error when missing `[M]`
- [x] Services: success when all have a code `[M]`
- [x] Services: error when any has no code, or when the set is empty `[W]`
- [x] Attribute: success with `serviceCode` on data sets and indicator groups `[M]`
- [x] Attribute: error if missing or only on one `[W]`

**User group and group set**

- [x] Both selectors list their options sorted by name
- [x] Submit buttons are disabled until something is selected
- [x] Setting the user group works when the key is missing and when it is present, read back through the API `[W]`
- [x] Changing to a group the user is not in hides the Admin tab `[W]`
- [x] Setting the group set works when the key is missing and when it is present `[W]`
- [x] Changing the group set changes the services in Dossiers `[W]`

**Lists and tags**

- [x] Each field below loads the current value, saves when the key is missing and when it is present, and is read back through the API `[W]`:
  - [x] Blacklist: data element groups
  - [x] Blacklist: data sets, takes effect in Data Sets
  - [x] Blacklist: indicator groups
  - [x] Blacklist tag text
  - [x] Not in use: indicator groups
  - [x] Not in use: program indicator groups
  - [x] Not in use tag text
  - [x] Legacy: data element groups
  - [x] Legacy: option groups

**Configuration complete flag**

- [x] `setup_dossierConfigComplete` becomes true when all checks pass `[W]`
- [x] Once true, Search shows the service columns `[W]`

### 11. Full runs

- [x] Full suite passes against the AngularJS app on v42, as the baseline
- [ ] Full suite passes against the React app on v42, changing only `E2E_BASE_URL` and the isolated helpers (after the migration)
- [ ] Differences between the two apps are documented, each with an accepted reason (after the migration)

**First run on the React app (v42, instance 8098, app served same-origin with a session)**

| Project | Passed | Failed | Skipped | Notes                                        |
| ------- | ------ | ------ | ------- | -------------------------------------------- |
| read    | 224    | 1      | 6       | 4 pass on retry (Search takes ~15 s to load) |
| write   | 60     | 6      | 1       | instance state checked afterwards: unchanged |

Differences, with their reason:

- **Translations (5 write tests):** the React app is English only until the translations are imported (step 2 of the pending list). Not an app difference.
- **Header title click (1 read test):** the default skeleton header, chosen on purpose, has a title that is not a link. Only its logo goes home.
- **Setting the user group or group set (1 write test, intermittent):** passes alone and in most runs. Playwright sometimes reports the option as not enabled. Not understood yet.
- **Spec changes:** two route mocks now also match the URL without `.json` (indicators and attributes), because React does not add it. `e2e/support/widgets.ts` was adapted for the table, its pagination and TinyMCE 8 (toolbar names).
- **Behaviour kept from the contract, done differently:** the print button is disabled until something is selected. Empty values sort last in both directions. Tags in Admin are typed as JSON text (`"Tag"`), as in Angular.
- [x] Smoke subset (one test per module, read-only) can run on its own, for use after deployments
- [x] Search load time on 8098 is measured and recorded, for comparison with the React app

## Run notes and problems

**Last full run:** 294 passed, 7 skipped, 0 failed, 0 flaky, in 10.8 minutes, on the AngularJS app at `http://localhost:8098`. Of the 7 skipped, 2 are P1 and P3, and 5 are read-only versions of scenarios that 8098 has no data for, which the write tests cover with temporary metadata.

### Not ticked

- **Session expiry (P1)** and **event resources (P3):** the tests exist, but are marked `fixme` because the baseline does not behave that way.
- **React run and differences between apps:** these wait for the migration.

### Problems found in the current app

These are additions to "Known bugs", for the next iteration. The suite does not pin them, and comments in the specs refer to these numbers.

- [ ] **P1. Session expiry goes unnoticed on v42.** With the session gone, `system/ping` returns 401 to XHR requests, and the app only reloads on a successful response that is not `pong`. The user stays on the page, with requests failing. Confirmed with `curl` and in the browser. Skipped test: section 1.
- [ ] **P2. Selecting a service too early loses its data sets.** The Dossiers selector is usable before the data sets request finishes. Selecting then shows 0 data sets, with no message. Seen in the browser; the cause comes from reading the code. Tests wait for the network to be idle before selecting.
- [ ] **P3. Event chart and event report resources disappear on v42.** The `metadata` endpoint returns them under `eventVisualizations`, but the app only reads `eventCharts` and `eventReports`. Confirmed through the API. Skipped test: section 7.
- [ ] **P4. Saving right after typing loses the text, and reports success.** The editor syncs its content after a short delay (a debounce in `angular-ui-tinymce`). Clicking Save inside that window saves the old text and turns the button green. Seen in the browser. The test helper waits 700ms; React should not need this.
- [ ] **P5. Search never loads if the service set key is missing while `setup_dossierConfigComplete` is true.** `TypeError` at `search.controllers.js:122`, and the loading indicator stays on. Confirmed in the browser. Not carried over to the React app (`code-architecture.md`, decision 7).
- [ ] **P6. Some rule action labels never appear.** "Option to Hide" only shows when the action has `content`, which no `HIDEOPTION` action on 8098 has. "Option Group to Hide" did not show either on a `HIDEOPTIONGROUP` action that has an option group. The tests only check the action type for these two.
- [ ] **P7. Browser Back can leave the previous module on screen.** The URL changes to `#/datasets`, but the page stays on Admin. It happened in roughly 1 of 8 to 2 of 6 runs when going back right after switching modules. The cause is unknown. The test waits for the network to be idle first, so this is not covered when navigating quickly.
- [ ] **P8. Program export does nothing when a sheet has no rows.** With every data element of a program hidden, no file is downloaded and no message is shown. Seen once in the browser; the likely cause is `Object.keys(data[0])` in the export code. No test covers this case.
- [ ] **P9. Duplicate id on Programs.** Program indicators and indicators both use `id="indicators"`, so a link to the second can scroll to the first. Seen in the page, and the scroll itself is not tested.
- [ ] **P10. The Visibility column for tracked entity attributes is always empty.** Its query asks for a `trackedEntityAttribute` field on the rule, and rules do not have one (0 of 151 with `ASSIGN` actions on v42). It also looks at `ASSIGN`, not at hiding actions. Fixing the query is not enough: the cell also reads `dataElement.visibility`, the wrong variable (`dossierPrograms.view.html:135`).
- [ ] **P11. Program indicator filters keep `Program stage id == 'x'` instead of the stage name.** The regex in `dossierPrograms.controllers.js:760` cannot match it. The option regex next to it only matches one-character codes.
- [ ] **P12. "Display Widget" never shows on rule actions.** The view and the export read `location`, but the rules query does not fetch it (`dossierPrograms.services.js`).

### Behaviour worth knowing

Tests accept both options for these, so React can choose.

- The first click on a Search column sorts descending, and the second ascending.
- In Arabic the content moves to the right, but the side menu stays on the left.
- `staticContent/logo_banner` returns 404 on 8098, so the header logo is broken there. This comes from the instance.
- DHIS2 reads the metadata language at login, so changing it needs a new session.

### Limits of the current suite

- **Global Shell:** only 2 tests run inside it. All others run standalone (`?redirect=false`), which is faster and needs no iframe handling. On v42 users see the shell, so consider running more there.
- **Restricted roles and v40:** out of scope, as decided.
- **Weak spots:**
  - Effects of the Admin lists are mostly tested in each module with mocked keys, not by saving through Admin. Only the data set blacklist is tested end to end.
  - Export sheets are checked by sheet names, headers and row counts, not cell by cell.
  - Metadata language is checked on Dossiers only.
- **Fixed waits:** the editor helpers use 2 fixed waits, because of P4 and a save button reset about 500ms after loading. React should allow removing them.
- **Search load time:** about 6 seconds on 8098, measured once in this session with a single browser.
- **Likely changes on React:**
  - `e2e/support/widgets.ts`, for the table and editor
  - `.alert-success`, `.alert-danger` and `btn-warning`, used for Admin checks and the save button state
  - The `#searchTable` cell structure, used for sort values

### Changes on 8098

- HMIS Dictionary v1.16.1 is installed. This stays.
- `keyDbLocale` of `pentaho` is `en`. It may have been unset before, as I did not record it first.
- Everything else was checked against a snapshot after the run: dataStore keys, service translations, and no `E2E_` metadata or new visualizations left.
- The `description` of the BOAT Medical Linelist stage was edited and restored.

## Known bugs (NOTHING TO DO IN THIS ITERATION)

These come from reading the code and have not been reproduced in a browser, except where noted. My suggestion is in brackets.

The suite does not pin any of them: where a scenario touches one, tests only cover the unaffected part. For example, Data Sets indicators are tested through `#{de.coc}`. This way, React can keep or fix each bug later without breaking a test.

**Search**

- [ ] **Accents:** the code removes accents on a copy of the data and then discards it, so `e` does not match `é`. [fix]
- [ ] **Highlighting:** with only one of the global and column filters active, the regex includes the literal word `undefined`, which gets highlighted in text. [fix]
- [ ] **Stale service codes:** `servicesCode` is declared outside the data element loop, so a data set without the attribute can reuse the previous one's codes. [fix]
- [ ] **Hidden markup:** global search also looks inside generated formula HTML and raw expressions, so a term like `tooltip` matches rows. [fix the markup, keep raw expressions]
- [ ] **Export markup:** formula HTML is only stripped when the header is in English, and never for program indicator formulas. [fix]
- [ ] **Advanced columns:** the advanced row needs all three advanced groups allowed, while the link shows with any one. A role with only some sees a link that does nothing. [fix]

**Data Sets**

- [ ] **Missed indicators:** indicators referencing a data element without a category option combo are not listed. The regex `#{(\w+)\.?\w+?}` captures only 10 of the 11 UID characters for `#{abcdefghijk}` (confirmed by running it). Programs already uses a corrected pattern. [fix]

**Programs**

- [ ] **Rule variables entry:** the table of contents check reads `accesses.programRulesVariables`, while the key is `programRuleVariables`, so the entry never appears. [fix]
- [ ] **Resources format:** the README documents `(ID1;ID2;...)`, but the code does not remove the parentheses. No program on 8098 uses this attribute. [confirm the real format]
- [ ] **Toggle reset:** following a link from Indicators clears all session storage, which also resets the legacy elements toggle. [fix]
- [ ] **Toggle loses the selection:** turning the toggle on with a program selected reloads the page, so the program must be selected again. [fix]

**Indicators**

- [ ] **Links narrow the selector:** after following a link, the Data Sets or Programs selector lists only that item until the page reloads, and nothing is selected. [confirm the intent]
- [ ] **Constants:** only two hardcoded constant UIDs are handled in formulas. [fix, using the constants API]
- [ ] **Nested indicators:** the formula code handles `#`, `I`, `D`, `G` and `C`, but not `N{}`. [fix]
- [ ] **Untranslated names:** this module uses `name` instead of `displayName`, so metadata is not translated, and its table of contents is hardcoded in English. [fix]

**Dossiers**

- [ ] **Blacklists ignored:** blacklisted data sets and groups still appear in Dossiers, while the Admin page says they are not displayed in the panels. [confirm the intent]

**Admin**

- [ ] **Not protected by URL:** non-admins can open `#/admin` directly, as only the tab is hidden. [fix]
- [ ] **Reload race:** the submit buttons reload the page without waiting for the save to finish, so saves can be lost. This may also make baseline tests flaky. [fix]
- [ ] **Writes on open:** just viewing the page can write `setup_dossierConfigComplete` and reload it. [keep the result, review the mechanism]
- [ ] **Config never reverts:** that write only runs if the attribute check passes, so the flag can stay true. [fix]

**Shell and settings**

- [ ] **Active tab:** on deep links, the code targets `#dossiersPrograms` and `#dossierIndicator`, while the ids are `dossierPrograms` and `dossierIndicators`. [fix]
- [ ] **Print:** the print button stays disabled on Search and Admin. [keep]
- [ ] **Layout settings merge:** Search and Data Sets merge stored settings with the defaults, while Programs and Indicators replace them, so new columns can go missing there. [fix]
- [ ] **Settings created on view:** the first visit to a module writes its settings to the dataStore, whichever user it is. [review]
- [ ] **Missing translations:** en has 9 keys missing, which display as written (for example the `DataSets` column header). es, fr and pt lack about 26 to 29, and show English. ar lacks 10. [keep the English fallback, fix `DataSets`]
- [ ] **Hardcoded UIDs:** attributes `pG4YeQyynJh` and `zC3TBJnSxar`, groups `LjRqO9XzQPs` and `epFY01iJN0Z`. All exist on 8098. [keep for now, move to configuration if other organisations will use the app]

## Out of scope

- Restricted roles (advanced and normal users): what they can see, hidden tabs and buttons, and default access per role. Tests use one user with full access
- DHIS2 v40
- Pixel-level visual regression, because the React app will not match exactly
- DHIS2 apps themselves (Data Visualizer and others), beyond checking that they open the right object
- Non-Chromium browsers
- Unit tests for domain and data layers, which belong to the migration tasks
