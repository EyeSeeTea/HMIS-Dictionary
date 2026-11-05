import { expect, fixtures, test } from "../support/fixtures";
import { allIndicators, config, escapeRegex, services, visibleIndicators } from "../support/data";
import { t } from "../support/i18n";
import { mockKeys, SearchPage } from "../support/pages";
import { readXlsx } from "../support/xlsx";

const COLUMNS = {
    type: t("object_type"),
    name: t("object_name"),
    shortName: t("object_shortName"),
    description: t("object_description"),
    service: t("service_name"),
    form: t("object_form"),
    num: t("object_num_formula"),
    den: t("object_den_formula"),
    exp: t("object_exp_formula"),
    flt: t("object_flt_formula"),
    group: t("objectGroup_name"),
};

const ADVANCED = [
    "object_id",
    "object_code",
    "object_ICD10",
    "objectGroup_id",
    "objectGroup_code",
    "service_id",
    "service_code",
];

async function expectFound(search: SearchPage, id: string) {
    await search.filterById(id);
    await expect(search.table.rows).toHaveCount(1);
}

async function expectNotFound(search: SearchPage, id: string) {
    await search.filterById(id);
    await expect(search.table.rows).toHaveCount(0);
}

const FORMULA_DE = /#\{(\w{11})\}/;
const FORMULA_DE_COC = /#\{(\w{11})\.(\w{11})\}/;
const FORMULA_PI = /I\{(\w{11})\}/;
const FORMULA_IND = /N\{(\w{11})\}/;

test.describe("4. Search", () => {
    test.describe("Data loading", () => {
        test("Table loads data elements, indicators and program indicators, each with the right type @smoke", async ({
            search,
            api,
        }) => {
            await search.load();
            const [indicator] = await visibleIndicators(api);
            const { blacklistDEG } = await config(api);
            const de = (
                await api.list<any>("dataElements", {
                    fields: "id,dataElementGroups[id]",
                    filter: "domainType:eq:AGGREGATE",
                })
            ).find(d => !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id)));
            const [pi] = await api.list("programIndicators", { fields: "id" });
            await search.filterById(indicator!.id);
            await expect(await search.table.cell(0, COLUMNS.type)).toHaveText("indicator");
            await search.filterById(de.id);
            await expect(await search.table.cell(0, COLUMNS.type)).toHaveText("dataElement");
            await search.filterById(pi.id);
            await expect(await search.table.cell(0, COLUMNS.type)).toHaveText("program indicator");
        });

        test("Tracker-domain data elements are excluded", async ({ search, api }) => {
            const [de] = await api.list("dataElements", {
                fields: "id",
                filter: "domainType:eq:TRACKER",
                pageSize: 1,
                paging: true,
            });
            await search.load();
            await expectNotFound(search, de.id);
        });

        test("Data elements in a blacklisted group are excluded", async ({ search, api }) => {
            const { blacklistDEG } = await config(api);
            const [de] = await api.list("dataElements", {
                fields: "id",
                filter: [
                    "domainType:eq:AGGREGATE",
                    `dataElementGroups.id:in:[${blacklistDEG.join(",")}]`,
                ],
            });
            await search.load();
            await expectNotFound(search, de.id);
        });

        test("Data elements in no data set are included", async ({ search, api }) => {
            const { blacklistDEG } = await config(api);
            const all = await api.list<any>("dataElements", {
                fields: "id,dataSetElements~size,dataElementGroups[id]",
                filter: "domainType:eq:AGGREGATE",
            });
            const de = all.find(
                d =>
                    d.dataSetElements === 0 &&
                    !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id))
            );
            test.skip(!de, "No such data element on this instance");
            await search.load();
            await expectFound(search, de.id);
        });

        test("Blacklisted data sets are left out of a row's group columns, and the row stays", async ({
            search,
            api,
        }) => {
            const { blacklistDEG, blacklistDS } = await config(api);
            const all = await api.list<any>("dataElements", {
                fields: "id,dataElementGroups[id],dataSetElements[dataSet[id,displayName]]",
                filter: "domainType:eq:AGGREGATE",
            });
            const de = all.find(
                d =>
                    !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id)) &&
                    d.dataSetElements.some((e: any) => blacklistDS.includes(e.dataSet.id)) &&
                    d.dataSetElements.some((e: any) => !blacklistDS.includes(e.dataSet.id))
            );
            test.skip(!de, "No such data element on this instance");
            await search.load();
            await search.showColumn(COLUMNS.group);
            await expectFound(search, de.id);
            const cell = await search.table.cell(0, COLUMNS.group);
            for (const { dataSet } of de.dataSetElements) {
                const blacklisted = blacklistDS.includes(dataSet.id);
                if (blacklisted) await expect(cell).not.toContainText(dataSet.displayName);
                else await expect(cell).toContainText(dataSet.displayName);
            }
        });

        test("Indicators in any blacklisted group are excluded", async ({ search, api }) => {
            const { blacklistIG } = await config(api);
            const indicator = (await allIndicators(api)).find(i =>
                i.indicatorGroups.some(g => blacklistIG.includes(g.id))
            );
            await search.load();
            await expectNotFound(search, indicator!.id);
        });

        test("Indicators in no group are included", async ({ search, api }) => {
            const indicator = (await allIndicators(api)).find(i => i.indicatorGroups.length === 0);
            test.skip(!indicator, "No such indicator on this instance");
            await search.load();
            await expectFound(search, indicator!.id);
        });

        test("Not-in-use indicators and program indicators are visible to the full-access user", async ({
            page,
            search,
            api,
        }) => {
            const { blacklistIG, notInUsePIG } = await config(api);
            const indicator = (await allIndicators(api)).find(
                i =>
                    i.indicatorGroups.length > 0 &&
                    !i.indicatorGroups.some(g => blacklistIG.includes(g.id))
            )!;
            const [pi] = await api.list("programIndicators", {
                fields: "id",
                filter: `programIndicatorGroups.id:in:[${notInUsePIG.join(",")}]`,
            });
            await mockKeys(page, { notInUse_indicatorGroups: [indicator.indicatorGroups[0]!.id] });
            await search.load();
            await expectFound(search, indicator.id);
            await expectFound(search, pi.id);
        });

        test("Data element in several data sets lists all of them, comma separated", async ({
            search,
            api,
        }) => {
            const { blacklistDEG, blacklistDS } = await config(api);
            const all = await api.list<any>("dataElements", {
                fields: "id,dataElementGroups[id],dataSetElements[dataSet[id,displayName]]",
                filter: "domainType:eq:AGGREGATE",
            });
            const de = all.find(
                d =>
                    !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id)) &&
                    d.dataSetElements.filter((e: any) => !blacklistDS.includes(e.dataSet.id))
                        .length > 1
            );
            await search.load();
            await search.showColumn(COLUMNS.group);
            await expectFound(search, de.id);
            const cell = await search.table.cell(0, COLUMNS.group);
            await expect(cell).toContainText(", ");
            for (const { dataSet } of de.dataSetElements.filter(
                (e: any) => !blacklistDS.includes(e.dataSet.id)
            )) {
                await expect(cell).toContainText(dataSet.displayName);
            }
        });

        test("Service column is populated for a data element and an indicator, including a multi-service value", async ({
            search,
            api,
        }) => {
            const all = await services(api, fixtures.groupSet);
            const byCode = new Map(all.map(s => [s.code.split("_")[2]!, s.displayName]));
            const { blacklistIG } = await config(api);
            const groups = await api.list<any>("indicatorGroups", {
                fields: "id,attributeValues[value,attribute[id]],indicators[id]",
            });
            const multi = groups.find(g => {
                const codes = g.attributeValues[0]?.value.split("_").slice(1) ?? [];
                return (
                    !blacklistIG.includes(g.id) &&
                    g.indicators.length > 0 &&
                    codes.filter((c: string) => byCode.has(c)).length > 1
                );
            });
            test.skip(!multi, "No multi-service indicator group on this instance");
            const indicators = (await visibleIndicators(api)).filter(
                i => i.indicatorGroups.length === 1
            );
            const indicator = indicators.find(i => i.indicatorGroups[0]!.id === multi.id);
            test.skip(!indicator, "No indicator only in that group");
            await search.load();
            await expectFound(search, indicator!.id);
            const cell = await search.table.cell(0, COLUMNS.service);
            for (const code of multi.attributeValues[0].value.split("_").slice(1)) {
                if (byCode.has(code)) await expect(cell).toContainText(byCode.get(code)!);
            }
            const firstDataElementWithService = (await search.table.columnValues(COLUMNS.service))
                .length;
            expect(firstDataElementWithService).toBe(1);
            await search.table.filter(t("object_id"), "");
            await search.table.filter(COLUMNS.type, "dataElement");
            await expect(search.table.rows.first()).toBeVisible();
            const values = await search.table.columnValues(COLUMNS.service);
            expect(values.filter(Boolean).length).toBeGreaterThan(0);
        });

        test("Group columns show data sets for data elements, indicator groups for indicators, and program indicator groups for program indicators", async ({
            search,
            api,
        }) => {
            const { blacklistDEG, blacklistDS, blacklistIG } = await config(api);
            const des = await api.list<any>("dataElements", {
                fields: "id,dataElementGroups[id],dataSetElements[dataSet[id,displayName]]",
                filter: "domainType:eq:AGGREGATE",
            });
            const de = des.find(
                d =>
                    !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id)) &&
                    d.dataSetElements.length === 1 &&
                    !blacklistDS.includes(d.dataSetElements[0].dataSet.id)
            );
            const indicator = (await allIndicators(api)).find(
                i =>
                    i.indicatorGroups.length === 1 &&
                    !blacklistIG.includes(i.indicatorGroups[0]!.id)
            )!;
            const pis = await api.list<any>("programIndicators", {
                fields: "id,programIndicatorGroups[name]",
            });
            const pi = pis.find(p => p.programIndicatorGroups.length > 0);
            await search.load();
            await search.showColumn(COLUMNS.group);
            await expectFound(search, de.id);
            await expect(await search.table.cell(0, COLUMNS.group)).toHaveText(
                de.dataSetElements[0].dataSet.displayName
            );
            await expectFound(search, indicator.id);
            await expect(await search.table.cell(0, COLUMNS.group)).toContainText(
                indicator.indicatorGroups[0]!.name
            );
            await expectFound(search, pi.id);
            await expect(await search.table.cell(0, COLUMNS.group)).toContainText(
                pi.programIndicatorGroups[0].name
            );
        });

        test("Service columns are hidden when `setup_dossierConfigComplete` is false", async ({
            page,
            search,
        }) => {
            await mockKeys(page, { setup_dossierConfigComplete: { value: false } });
            await search.load();
            expect(await search.table.headers()).not.toContain(COLUMNS.service);
        });
    });

    test.describe("Formulas", () => {
        test("Indicator formulas show names instead of UIDs, for `#{de}`, `#{de.coc}`, `I{pi}` and `N{ind}`", async ({
            search,
            api,
        }) => {
            const indicators = await visibleIndicators(api);
            const des = new Map(
                (await api.list<any>("dataElements", { fields: "id,displayName" })).map(d => [
                    d.id,
                    d.displayName,
                ])
            );
            const pis = new Map(
                (await api.list<any>("programIndicators", { fields: "id,displayName" })).map(p => [
                    p.id,
                    p.displayName,
                ])
            );
            const inds = new Map((await allIndicators(api)).map(i => [i.id, i.displayName]));
            await search.load();
            await search.showColumn(COLUMNS.num);
            for (const [regex, names] of [
                [FORMULA_DE, des],
                [FORMULA_DE_COC, des],
                [FORMULA_PI, pis],
                [FORMULA_IND, inds],
            ] as const) {
                const indicator = indicators.find(i => {
                    const m = regex.exec(i.numerator);
                    return m && names.has(m[1]!);
                });
                test.skip(!indicator, `No indicator matching ${regex}`);
                const id = regex.exec(indicator!.numerator)![1]!;
                await expectFound(search, indicator!.id);
                const cell = await search.table.cell(0, COLUMNS.num);
                await expect(cell).toContainText(names.get(id)!);
            }
        });

        test("Numerator and denominator columns both work", async ({ search, api }) => {
            const indicator = (await visibleIndicators(api)).find(
                i =>
                    FORMULA_DE_COC.test(i.numerator) &&
                    (FORMULA_DE_COC.test(i.denominator) || FORMULA_DE.test(i.denominator))
            );
            test.skip(!indicator, "No indicator with data elements in both formulas");
            await search.load();
            await search.showColumn(COLUMNS.num);
            await search.showColumn(COLUMNS.den);
            await expectFound(search, indicator!.id);
            await expect(await search.table.cell(0, COLUMNS.num)).not.toContainText("#{");
            await expect(await search.table.cell(0, COLUMNS.den)).not.toContainText("#{");
            await expect(await search.table.cell(0, COLUMNS.num)).not.toBeEmpty();
            await expect(await search.table.cell(0, COLUMNS.den)).not.toBeEmpty();
        });

        test("Operators appear on separate lines, and hovering an item shows its description", async ({
            search,
            api,
        }) => {
            const des = await api.list<any>("dataElements", { fields: "id,displayDescription" });
            const withDescription = new Set(des.filter(d => d.displayDescription).map(d => d.id));
            const indicator = (await visibleIndicators(api)).find(i => {
                const m = /^\s*#\{(\w{11})(\.\w{11})?\}\s*\+\s*#\{/.exec(i.numerator);
                return m && withDescription.has(m[1]!);
            });
            test.skip(!indicator, "No indicator adding two described data elements");
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, indicator!.id);
            const cell = await search.table.cell(0, COLUMNS.num);
            await expect(cell.locator("br").first()).toBeAttached();
            await expect(cell.locator("b", { hasText: "+" }).first()).toBeVisible();
            const item = cell.locator(".tooltipcontainer").first();
            await item.hover();
            await expect(item.locator(".tooltiptext")).toBeVisible();
        });

        test("Blacklisted items in a formula show the tag, using the default text and a configured text", async ({
            page,
            search,
            api,
        }) => {
            const { blacklistDEG } = await config(api);
            const blacklisted = new Set(
                (
                    await api.list<any>("dataElements", {
                        fields: "id",
                        filter: `dataElementGroups.id:in:[${blacklistDEG.join(",")}]`,
                    })
                ).map(d => d.id)
            );
            const indicator = (await visibleIndicators(api)).find(i => {
                const m = /#\{(\w{11})/.exec(i.numerator);
                return m && blacklisted.has(m[1]!);
            });
            test.skip(!indicator, "No indicator using a blacklisted data element");
            await mockKeys(page, { blacklist_tag: undefined });
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, indicator!.id);
            await expect(await search.table.cell(0, COLUMNS.num)).toContainText("[Blacklisted]");
            await page.unrouteAll();
            await mockKeys(page, { blacklist_tag: "E2E TAG" });
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, indicator!.id);
            await expect(await search.table.cell(0, COLUMNS.num)).toContainText("[E2E TAG]");
        });

        test("Not-in-use items in a formula show the tag, using the default text and a configured text", async ({
            page,
            search,
            api,
        }) => {
            const { notInUsePIG } = await config(api);
            const pis = new Set(
                (
                    await api.list<any>("programIndicators", {
                        fields: "id",
                        filter: `programIndicatorGroups.id:in:[${notInUsePIG.join(",")}]`,
                    })
                ).map(p => p.id)
            );
            const indicator = (await visibleIndicators(api)).find(i => {
                const m = FORMULA_PI.exec(i.numerator);
                return m && pis.has(m[1]!);
            });
            test.skip(!indicator, "No indicator using a not-in-use program indicator");
            await mockKeys(page, { notInUse_tag: undefined });
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, indicator!.id);
            await expect(await search.table.cell(0, COLUMNS.num)).toContainText("[Not in Use]");
            await page.unrouteAll();
            await mockKeys(page, { notInUse_tag: "E2E NIU" });
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, indicator!.id);
            await expect(await search.table.cell(0, COLUMNS.num)).toContainText("[E2E NIU]");
        });

        test("Program indicator expression and filter are translated for the rows on the current page", async ({
            search,
            api,
        }) => {
            const pis = await api.list<any>("programIndicators", {
                fields: "id,expression,filter",
            });
            const pi = pis.find(p => /#\{/.test(p.expression) && /#\{/.test(p.filter ?? ""));
            test.skip(!pi, "No program indicator with data elements in expression and filter");
            await search.load();
            await search.showColumn(COLUMNS.exp);
            await search.showColumn(COLUMNS.flt);
            await expectFound(search, pi.id);
            await expect(await search.table.cell(0, COLUMNS.exp)).not.toContainText("#{");
            await expect(await search.table.cell(0, COLUMNS.flt)).not.toContainText("#{");
        });

        test("Moving to another page translates the rows on that page", async ({ search }) => {
            await search.load();
            await search.showColumn(COLUMNS.exp);
            await search.table.filter(COLUMNS.type, "program indicator");
            await expect(search.table.rows.first()).toBeVisible();
            await search.table.goToPage(2);
            const values = async () => (await search.table.columnValues(COLUMNS.exp)).join(" ");
            await expect.poll(values, { timeout: 60_000 }).not.toMatch(/#\{\w{11}\.\w{11}\}/);
        });

        test('"Expand" appears only on formulas with nested indicators, in numerator and denominator', async ({
            search,
            api,
        }) => {
            const plain = (await visibleIndicators(api)).find(i =>
                FORMULA_DE_COC.test(i.numerator)
            )!;
            const expand = search.root.getByRole("button", {
                name: t("srch_formula_modal_expand"),
            });
            await search.load();
            await search.showColumn(COLUMNS.num);
            await search.showColumn(COLUMNS.den);
            await expectFound(search, fixtures.nestedIndicator.id);
            await expect(expand.first()).toBeVisible();
            await expectFound(search, plain.id);
            await expect(expand).toHaveCount(0);
        });
    });

    test.describe("Formula dialog", () => {
        async function openDialog(search: SearchPage) {
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, fixtures.nestedIndicator.id);
            await search.root
                .getByRole("button", { name: t("srch_formula_modal_expand") })
                .first()
                .click();
            await expect(search.formulaDialog).toBeVisible();
        }

        test("Title shows the indicator and whether it is the numerator or denominator", async ({
            search,
            api,
        }) => {
            const indicator = await api.get(`indicators/${fixtures.nestedIndicator.id}`, {
                fields: "displayName",
            });
            await openDialog(search);
            const title = search.formulaDialog.getByRole("heading");
            await expect(title).toContainText(indicator.displayName);
            await expect(title).toContainText(t("object_expand_num_formula"));
        });

        test("Nested indicators are expanded, with a colour legend listing each one, its description and id", async ({
            search,
            api,
        }) => {
            const indicator = await api.get(`indicators/${fixtures.nestedIndicator.id}`, {
                fields: "numerator",
            });
            const ids = [...indicator.numerator.matchAll(/N\{(\w{11})\}/g)].map(
                (m: RegExpExecArray) => m[1]!
            );
            await openDialog(search);
            for (const id of ids) {
                const nested = await api.get(`indicators/${id}`, { fields: "displayName" });
                const entry = search.formulaDialog.locator(".formula-legend-item", { hasText: id });
                await expect(entry).toContainText(nested.displayName);
                await expect(entry.locator(".formula-legend-chip")).toBeVisible();
            }
        });

        test("Changing the maximum depth updates the formula, within the limits of 1 and 10", async ({
            search,
        }) => {
            await openDialog(search);
            const depth = search.root.locator("#maxDepthInput");
            await expect(depth).toHaveAttribute("min", "1");
            await expect(depth).toHaveAttribute("max", "10");
            await expect(depth).toHaveValue("3");
            const legend = search.formulaDialog.locator(".formula-legend-item");
            const atThree = await legend.count();
            await depth.fill("1");
            await expect(depth).toHaveValue("1");
            await expect(legend.first()).toBeVisible();
            expect(await legend.count()).toBeLessThanOrEqual(atThree);
            await depth.fill("10");
            await expect(legend.first()).toBeVisible();
            expect(await legend.count()).toBeGreaterThanOrEqual(atThree);
        });

        test("Close and the X button close the dialog", async ({ search }) => {
            await openDialog(search);
            await search.formulaDialog
                .locator(".modal-footer")
                .getByRole("button", { name: t("CLOSE") })
                .click();
            await expect(search.formulaDialog).toBeHidden();
            await search.root
                .getByRole("button", { name: t("srch_formula_modal_expand") })
                .first()
                .click();
            await expect(search.formulaDialog).toBeVisible();
            await expect(search.formulaDialog).toHaveCSS("opacity", "1");
            await search.formulaDialog
                .locator(".modal-header")
                .getByRole("button", { name: "Close" })
                .click();
            await expect(search.formulaDialog).toBeHidden();
        });
    });

    test.describe("Search and filters", () => {
        async function knownObject(search: SearchPage) {
            await search.load();
            return (await search.table.columnValues(COLUMNS.name))[0]!;
        }

        test("Global search matches any column, case-insensitively, updating as you type", async ({
            search,
        }) => {
            const name = await knownObject(search);
            await search.globalSearch.pressSequentially(name.toUpperCase());
            await expect(search.table.rows.first()).toContainText(name);
            const values = await search.table.columnValues(COLUMNS.name);
            expect(values).toContain(name);
        });

        test("The search button and the Enter key apply the term", async ({ search }) => {
            const name = await knownObject(search);
            await search.searchFor(name);
            await search.searchButton.click();
            await expect(search.table.rows.first()).toContainText(name);
            await search.globalSearch.press("Enter");
            await expect(search.table.rows.first()).toContainText(name);
            await expect(search.searchButton).toBeEnabled();
        });

        test("Global search also matches hidden columns (for example, by UID)", async ({
            search,
            api,
        }) => {
            const [indicator] = await visibleIndicators(api);
            await search.load();
            expect(await search.table.headers()).not.toContain(t("object_id"));
            await search.searchFor(indicator!.id);
            await expect(search.table.rows.first()).toBeVisible();
        });

        test("`|` works as OR, with spaces trimmed", async ({ search, api }) => {
            const [a, b] = await visibleIndicators(api);
            await search.load();
            await search.showColumn(t("object_id"), true);
            await search.table.filter(t("object_id"), `${a!.id} |  ${b!.id} `);
            await expect(search.table.rows).toHaveCount(2);
            await search.table.filter(t("object_id"), "");
            await search.searchFor(`${a!.id} |  ${b!.id} `);
            const ids = await search.table.columnValues(t("object_id"));
            expect(ids).toEqual(expect.arrayContaining([a!.id, b!.id]));
        });

        test("Regex characters are treated literally", async ({ search }) => {
            await search.load();
            await search.searchFor("zzzz.*");
            await expect(search.table.rows).toHaveCount(0);
            await search.searchFor("(%)");
            await expect(search.table.rows.first()).toContainText("(%)");
        });

        test("The matched term is highlighted, for global search and for column filters", async ({
            search,
        }) => {
            const name = await knownObject(search);
            const term = name.split(" ")[0]!;
            await search.searchFor(term);
            const highlighted = search.table.rows.first().locator(".highlighted").first();
            await expect(highlighted).toHaveText(new RegExp(escapeRegex(term), "i"));
            await search.clearFilters.click();
            await search.table.filter(COLUMNS.name, term);
            const cell = await search.table.cell(0, COLUMNS.name);
            await expect(cell.locator(".highlighted").first()).toHaveText(
                new RegExp(escapeRegex(term), "i")
            );
        });

        test("Search with no results shows an empty table", async ({ search }) => {
            await search.load();
            await search.searchFor("no-such-object-e2e");
            await expect(search.table.rows).toHaveCount(0);
            await expect(search.table.table).toBeVisible();
        });

        test("Column filters are visible by default, and the checkbox toggles them", async ({
            search,
        }) => {
            await search.load();
            await expect(search.filtersCheckbox).toBeChecked();
            await expect(search.table.filterInputs.first()).toBeVisible();
            await search.filtersCheckbox.uncheck();
            await expect(search.table.filterInputs).toHaveCount(0);
            await search.filtersCheckbox.check();
            await expect(search.table.filterInputs.first()).toBeVisible();
        });

        test("Each visible column has a filter", async ({ search }) => {
            await search.load();
            const headers = await search.table.headers();
            await expect(search.table.filterInputs).toHaveCount(headers.length);
        });

        test("Column filter narrows by that column only, also supports `|`, and combines with global search as AND", async ({
            search,
        }) => {
            await search.load();
            await search.table.filter(COLUMNS.type, "program indicator");
            await expect(search.table.rows.first()).toContainText("program indicator");
            expect(new Set(await search.table.columnValues(COLUMNS.type))).toEqual(
                new Set(["program indicator"])
            );
            // A type value is not in the name column, so filtering names by it finds nothing.
            await search.table.filter(COLUMNS.type, "");
            await search.table.filter(COLUMNS.name, "no-such-name-e2e");
            await expect(search.table.rows).toHaveCount(0);
            await search.table.filter(COLUMNS.name, "");
            await search.table.setPageSize(100);
            await search.table.filter(COLUMNS.type, "program indicator | dataElement");
            await expect(search.table.rows.first()).toBeVisible();
            for (const value of new Set(await search.table.columnValues(COLUMNS.type))) {
                expect(["dataElement", "program indicator"]).toContain(value);
            }
            await search.table.filter(COLUMNS.type, "dataElement");
            await expect(search.table.rows.first()).toContainText("dataElement");
            await search.searchFor("no-such-object-e2e");
            await expect(search.table.rows).toHaveCount(0);
        });

        test('"Clear filters" is disabled with no filters, and clears the global term and column filters', async ({
            search,
        }) => {
            await search.load();
            await expect(search.clearFilters).toBeDisabled();
            await search.searchFor("no-such-object-e2e");
            await search.table.filter(COLUMNS.type, "x");
            await expect(search.clearFilters).toBeEnabled();
            await search.clearFilters.click();
            await expect(search.globalSearch).toHaveValue("");
            await expect(search.table.filterInput(0)).toHaveValue("");
            await expect(search.table.rows.first()).toBeVisible();
            await expect(search.clearFilters).toBeDisabled();
        });
    });

    test.describe("Table", () => {
        const collator = new Intl.Collator("en", { sensitivity: "base" });
        const sorted = (values: string[], direction: 1 | -1) => {
            const items = values.filter(value => value.trim());
            const byCode = items.every(
                (v, i) =>
                    i === 0 ||
                    direction *
                        (items[i - 1]!.toLowerCase() < v.toLowerCase()
                            ? -1
                            : items[i - 1]!.toLowerCase() === v.toLowerCase()
                              ? 0
                              : 1) <=
                        0
            );
            const byLocale = items.every(
                (v, i) => i === 0 || direction * collator.compare(items[i - 1]!, v) <= 0
            );
            return byCode || byLocale;
        };

        test("Each column sorts ascending and descending", async ({ search }) => {
            await search.load();
            for (const column of await search.table.headers()) {
                const expectSorted = async (direction: 1 | -1) =>
                    expect(async () => {
                        const values = await search.table.columnSortValues(column);
                        expect(
                            sorted(values, direction),
                            `${column} ${direction}: ${values.join(" ; ")}`
                        ).toBe(true);
                    }).toPass({ timeout: 15_000 });
                // Which direction comes first is not asserted: today the first click sorts descending.
                await search.table.sortBy(column);
                await expect
                    .poll(async () => {
                        const values = await search.table.columnSortValues(column);
                        return sorted(values, 1) || sorted(values, -1);
                    })
                    .toBe(true);
                const before = await search.table.columnSortValues(column);
                const direction: 1 | -1 = sorted(before, 1) && !sorted(before, -1) ? 1 : -1;
                await search.table.sortBy(column);
                await expectSorted(direction === 1 ? -1 : 1);
                // A column can have only blank values at both ends, for example when most rows have none.
                if (before.some(value => value.trim())) {
                    expect(await search.table.columnSortValues(column)).not.toEqual(before);
                }
            }
        });

        test("Default page size, page size options and page navigation work", async ({
            search,
        }) => {
            await search.load();
            await expect(search.table.rows).toHaveCount(10);
            await expect(search.table.pageSizeButton(10)).toHaveClass(/active/);
            for (const size of [25, 50, 100]) {
                await search.table.setPageSize(size);
                await expect(search.table.rows).toHaveCount(size);
            }
            await search.table.setPageSize(10);
            const first = await search.table.columnValues(COLUMNS.name);
            await search.table.goToPage(2);
            await expect.poll(() => search.table.columnValues(COLUMNS.name)).not.toEqual(first);
            await search.table.goToPage(1);
            await expect.poll(() => search.table.columnValues(COLUMNS.name)).toEqual(first);
        });

        test("Filtering updates the page count, and returns to a valid page", async ({
            search,
        }) => {
            await search.load();
            const total = await search.table.pageCount();
            await search.table.goToPage(3);
            await search.table.filter(COLUMNS.name, "Measles");
            await expect(search.table.rows.first()).toBeVisible();
            expect(await search.table.pageCount()).toBeLessThan(total);
        });
    });

    test.describe("Panels and columns", () => {
        test("Search, Select Columns and Help panels expand and collapse, with Search open by default", async ({
            search,
        }) => {
            await search.load();
            await expect(search.searchPanel).toBeVisible();
            await expect(search.columnsPanel).toBeHidden();
            await expect(search.helpPanel).toBeHidden();
            for (const [name, panel] of [
                [t("srch_SelectColumns"), search.columnsPanel],
                [t("srch_Help"), search.helpPanel],
            ] as const) {
                await search.togglePanel(name);
                await expect(panel).toBeVisible();
                await search.togglePanel(name);
                await expect(panel).toBeHidden();
            }
            await search.togglePanel(t("srch_SearchAll"));
            await expect(search.searchPanel).toBeHidden();
        });

        test("Default visible columns: type, name, short name, description and service name", async ({
            search,
        }) => {
            await search.load();
            expect(await search.table.headers()).toEqual([
                COLUMNS.type,
                COLUMNS.name,
                COLUMNS.shortName,
                COLUMNS.description,
                COLUMNS.service,
            ]);
        });

        test("Select Columns groups: objects, descriptions, groups and services", async ({
            search,
        }) => {
            await search.load();
            await search.openColumns();
            for (const key of [
                "srch_SelectColumns_objBasics",
                "srch_SelectColumns_objDescs",
                "srch_SelectColumns_grpBasics",
                "srch_SelectColumns_servBasics",
            ]) {
                await expect(search.columnsPanel.locator("b", { hasText: t(key) })).toBeVisible();
            }
        });

        test("Each column checkbox shows and hides its column, for all 18 columns", async ({
            search,
        }) => {
            await search.load();
            await search.openColumns();
            await search.advancedLink.click();
            const keys = [
                "object_type",
                "object_name",
                "object_shortName",
                "object_form",
                "object_description",
                "object_num_formula",
                "object_den_formula",
                "object_exp_formula",
                "object_flt_formula",
                "objectGroup_name",
                "service_name",
                ...ADVANCED,
            ];
            expect(keys).toHaveLength(18);
            for (const key of keys) {
                const label = t(key);
                const box = search.columnCheckbox(label);
                const visible = await box.isChecked();
                await box.click();
                await expect
                    .poll(async () => (await search.table.headers()).includes(label))
                    .toBe(!visible);
                await box.click();
                await expect
                    .poll(async () => (await search.table.headers()).includes(label))
                    .toBe(visible);
            }
        });

        test("Column checkboxes show their help text", async ({ search }) => {
            await search.load();
            await search.openColumns();
            const label = search.columnsPanel
                .locator("label")
                .filter({ hasText: t("object_name") })
                .first();
            await expect(label.locator("span[title]")).toHaveAttribute(
                "title",
                t("object_name_help")
            );
        });

        test('"Show / Hide advanced columns" reveals the advanced columns for an admin', async ({
            search,
        }) => {
            await search.load();
            await search.openColumns();
            const box = search.columnCheckbox(t("object_id"));
            await expect(box).toBeHidden();
            await search.advancedLink.click();
            await expect(box).toBeVisible();
            await search.advancedLink.click();
            await expect(box).toBeHidden();
        });

        test("Services group is hidden when `setup_dossierConfigComplete` is false", async ({
            page,
            search,
        }) => {
            await mockKeys(page, { setup_dossierConfigComplete: { value: false } });
            await search.load();
            await search.openColumns();
            await expect(
                search.columnsPanel.locator("b", { hasText: t("srch_SelectColumns_servBasics") })
            ).toBeHidden();
        });

        test("ICD10 column shows the code for data elements that have it", async ({
            search,
            api,
        }) => {
            const { blacklistDEG } = await config(api);
            const des = await api.list<any>("dataElements", {
                fields: "id,attributeValues[value,attribute[id]],dataElementGroups[id]",
                filter: ["domainType:eq:AGGREGATE", "attributeValues.attribute.id:eq:zC3TBJnSxar"],
            });
            const de = des.find(
                d =>
                    d.attributeValues.length === 1 &&
                    !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id))
            );
            test.skip(!de, "No data element with only the ICD10 attribute");
            await search.load();
            await search.showColumn(t("object_ICD10"), true);
            await expectFound(search, de.id);
            await expect(await search.table.cell(0, t("object_ICD10"))).toHaveText(
                de.attributeValues[0].value
            );
        });

        test("Help panel shows the formatted help text", async ({ search }) => {
            await search.load();
            await search.togglePanel(t("srch_Help"));
            await expect(search.helpPanel).toBeVisible();
            await expect(search.helpPanel.locator("li").first()).toBeVisible();
            await expect(search.helpPanel.locator("b").first()).toBeVisible();
            await expect(search.helpPanel).not.toContainText("<b>");
        });
    });

    test.describe("Export", () => {
        test('Export downloads `search_export.xlsx`, with a "Search Data" sheet @smoke', async ({
            search,
        }) => {
            await search.load();
            await search.table.filter(COLUMNS.name, "Measles");
            await expect(search.table.rows.first()).toContainText(/measles/i);
            const file = await search.download(() => search.exportButton.click());
            expect(file.name).toBe("search_export.xlsx");
            const sheets = await readXlsx(file.path);
            expect(Object.keys(sheets)).toEqual(["Search Data"]);
        });

        test("The file has all filtered rows, not just the current page", async ({ search }) => {
            await search.load();
            await search.table.filter(COLUMNS.name, "Measles");
            await expect(search.table.rows.first()).toBeVisible();
            await search.table.setPageSize(100);
            await expect(search.table.rows.first()).toBeVisible();
            const pages = await search.table.pageCount();
            if (pages > 1) await search.table.goToPage(pages);
            const shown = 100 * (pages - 1) + (await search.table.rows.count());
            if (pages > 1) await search.table.goToPage(1);
            await search.table.setPageSize(10);
            await expect(search.table.rows).toHaveCount(10);
            const file = await search.download(() => search.exportButton.click());
            const sheets = await readXlsx(file.path);
            expect(sheets["Search Data"]!.rows).toHaveLength(shown);
        });

        test("The file has only the visible columns, with their headers, in order", async ({
            search,
        }) => {
            await search.load();
            await search.showColumn(COLUMNS.form);
            await search.columnCheckbox(COLUMNS.shortName).uncheck();
            const headers = await search.table.headers();
            await search.table.filter(COLUMNS.name, "Measles");
            await expect(search.table.rows.first()).toBeVisible();
            const file = await search.download(() => search.exportButton.click());
            const sheets = await readXlsx(file.path);
            expect(sheets["Search Data"]!.headers).toEqual(headers);
        });

        test("Indicator formula cells contain plain text, in English", async ({ search, api }) => {
            const indicator = (await visibleIndicators(api)).find(i =>
                FORMULA_DE_COC.test(i.numerator)
            )!;
            await search.load();
            await search.showColumn(COLUMNS.num);
            await expectFound(search, indicator.id);
            const file = await search.download(() => search.exportButton.click());
            const [row] = (await readXlsx(file.path))["Search Data"]!.rows;
            expect(row![COLUMNS.num]).toBeTruthy();
            expect(row![COLUMNS.num]).not.toMatch(/<[a-z]+/i);
        });

        test("Accented text is preserved", async ({ search, api }) => {
            const { blacklistDEG } = await config(api);
            const des = await api.list<any>("dataElements", {
                fields: "id,displayName,dataElementGroups[id]",
                filter: "domainType:eq:AGGREGATE",
            });
            const de = des.find(
                d =>
                    /[À-ÿ]/.test(d.displayName) &&
                    !d.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id))
            );
            test.skip(!de, "No accented data element name");
            await search.load();
            await expectFound(search, de.id);
            const file = await search.download(() => search.exportButton.click());
            const [row] = (await readXlsx(file.path))["Search Data"]!.rows;
            expect(row![COLUMNS.name]).toBe(de.displayName);
        });

        test("The table returns to the same page and page size afterwards", async ({ search }) => {
            await search.load();
            await search.table.setPageSize(25);
            await search.table.goToPage(2);
            await search.table.filter(COLUMNS.name, "a");
            await expect(search.table.rows.first()).toBeVisible();
            await search.table.goToPage(2);
            await search.download(() => search.exportButton.click());
            await expect(search.table.pageSizeButton(25)).toHaveClass(/active/);
            await expect(search.table.activePage).toHaveText(/2/);
            await expect(search.table.rows).toHaveCount(25);
        });
    });

    test.describe("Visualization link", () => {
        test("Icon appears on indicator rows, and not on data element or program indicator rows", async ({
            search,
            api,
        }) => {
            await search.load();
            const icon = search.visualizationIcons;
            await search.table.filter(COLUMNS.type, "dataElement");
            await expect(search.table.rows.first()).toContainText("dataElement");
            await expect(icon).toHaveCount(0);
            await search.table.filter(COLUMNS.type, "program indicator");
            await expect(search.table.rows.first()).toContainText("program indicator");
            await expect(icon).toHaveCount(0);
            const indicator = (await visibleIndicators(api))[0]!;
            await search.table.filter(COLUMNS.type, "");
            await expectFound(search, indicator.id);
            await expect(icon).toHaveCount(1);
        });
    });
});
