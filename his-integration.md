# HIS Dictionary -> HMIS Dictionary: features to integrate

**Task:** [HIS Dictionary -> HMIS Dictionary: integrate missing features](https://app.clickup.com/t/1amt6mz8trd) | **Source:** [msf-oca-his/dhis-dictionary](https://github.com/msf-oca-his/dhis-dictionary), branch `release` (v4.1.1, 2025-10-28)

Use `release`, not `main`: the default branch lacks the latest formula work. The other branches add nothing beyond these two.

Items are grouped by priority and tagged by area and relative cost, from 1 (cheapest) to 10 (most costly). Costs are estimates from reading the code. Counts come from the local v42 instance (port 8098).

## High

- [x] [datasets] [programs] [cost: 10] **Org unit tree:** collapsible read-only tree with the org units where the selected item is assigned, within the user's hierarchy. Names containing `_geo` are left out.
- [x] [datasets] [programs] [cost: 8] **Print selection:** panel to choose what gets printed, without changing the screen.
    - Data Sets: each section, disaggregations, indicators, and the columns of data elements and indicators.
    - Programs: each section grouped by stage, indicators, attributes, and the columns of data elements, indicators and attributes.
- [x] [search] [cost: 5] **Tracker data elements:** include them, with separate types (HIS: "Data Element - Aggregate" and "Data Element - Individual") and their programs as the group. Programs starting with `~` are left out of the group. There are 918 on our instance. **Decide:** we exclude them on purpose, and `e2e.md` checks for it.
- [x] [search] [cost: 2] **Multi-word search:** `a b` finds rows with both words, in any order and in any column. Each word is highlighted. Today we search for the exact phrase.
- [x] [search] [cost: 1] **`&` operator:** `a & b` means AND, next to the `|` we have.
- [x] [search] [cost: 3] **Exact phrase first:** rows containing the whole phrase go on top, before any other sorting.
- [x] [datasets] [cost: 1] **Data set description:** under the title. 163 of 202 data sets have one.
- [x] [programs] [cost: 5] **Event reports and charts by program:** list them automatically (`program.id` filter), with description, count and link. We only list the ones in the `HMIS-Dict_Resources` attribute, and they disappear on v42 (P3 in `e2e.md`). To check: the `program.id` filter and the `dhis-web-event-*` links on v42.

## Medium

- [x] [datasets] [programs] [cost: 6] **Limit the selector to the user's org units:** only items assigned to their org units or descendants. We list everything the user can read. **Decide:** it changes what OCBA users see today.
- [x] [programs] [cost: 3] **Hide programs from the selector:** data sets already have `blacklist.dataSetIds`, programs have nothing. HIS uses a hardcoded attribute (`AvNq8fW4evL`) that does not exist on our instance, so a setting like the data sets one fits better. **Decide.**
- [x] [search] [cost: 1] **Short name of program indicators:** always empty in our table (`SearchCatalog.ts`).
- [x] [search] [cost: 4] **Group column:** HIS shows data element groups for data elements (we show data sets), and the program for program indicators (we show program indicator groups). **Decide:** add columns rather than replace ours.
- [x] [search] [cost: 2] **Export:** keep the table's sort order, and disable the button when there are no rows.
- [x] [search] [cost: 1] **Help:** add the DHIS2 glossary (data element, indicator, program indicator, group, data set, program) and explain the new operators.
- [x] [datasets] [cost: 1] **Section description:** under the section title. 93 of 1893 sections have one.
- [x] [datasets] [cost: 2] **Aggregation Type column:** in the data elements table, with its layout settings entry.
- [ ] [datasets] [cost: 1] **Skip orphaned data elements:** do not show elements that are in a section but no longer in the data set. This also corrects the section count.
- [ ] [programs] [cost: 2] **Short Name column:** in stage data elements and attributes. Not fetched today.
- [ ] [programs] [cost: 2] **Related indicators columns:** add Short Name, Numerator description and Denominator description. The entity already has them.
- [ ] [general] [cost: 3] **Translations:** use the HIS `es.po` and `fr.po` as a source for the new strings. We have no `fr.po` yet, as `migration.md` already tracks.

## Low

- [ ] [search] [cost: 4] **More formula tokens:** resolve `#{deGroup:id}`, `.co:id` (category option) and `D{program.dataElement}`, which we leave as raw text. Rarely used here: 0, 1 and 0 of 1947 indicators.
- [ ] [search] [cost: 3] **Flag broken formulas:** mark ids not found (HIS: `DE:id`, `PI:id` in error style) and `sum(` expressions ("not well-formed"). We show the plain id or the raw text.
- [ ] [datasets] [cost: 2] **Indicators assigned to the data set:** also read `dataSet.indicators`. We only find them by formula reference, and only through `#{de.coc}` (the "Missed indicators" bug). Only 1 of 202 data sets has assigned indicators.
- [ ] [datasets] [cost: 1] **Scrollable long cells:** limit options and formula cells to 170px high, and show them in full when printing.
- [ ] [programs] [cost: 3] **Link without access:** grey out "Open" with a tooltip when the user cannot read the program's analytics.
- [ ] [general] [cost: 2] **Error boundaries:** a render error in one section shows a message instead of breaking the whole page. We have none.
- [ ] [general] [cost: 9] **Local cache:** HIS keeps Search and item data in IndexedDB, per language. **Decide:** only if Search is slow enough to need it, and with invalidation, as HIS never refreshes it.

## Considered covered

- **Search:** global search, column selector, per-column filters, sorting, paging, highlighting, `|`, Excel export, and formulas with names and description tooltips. HIS searches only the visible columns, and ours searches all of them.
- **Data Sets and Programs:** searchable selector with counter, table of contents, section tables with counts, option lists, tracked entity attributes, indicators with described formulas, and data set hiding through the blacklist.
- **Data Sets:** disaggregations section, with links from the elements table.
- **Print:** button and print CSS.
- **Fixes that do not apply:** French Excel export and search with only spaces.

## Not to port

- **Tabs:** we keep the side menu.
- **Export as HTML `.xls`:** ours is real `.xlsx`.
- **Redirect to Search until its data is loaded:** it only exists to fill the HIS cache.
- **Rajdhani font.**
