import { expect, fixtures, test } from "../support/fixtures";
import { config, visibleIndicators } from "../support/data";
import { t } from "../support/i18n";
import { DataSetsPage, headersOf, mockKeys, rowsOf, tableAfter } from "../support/pages";

const { small, noElements } = fixtures.dataSets;

const dataSetFields =
    "id,displayName,sections[id,displayName,dataElements[id,displayName,displayShortName,categoryCombo[id,displayName],optionSet[options[displayName]]]],dataSetElements[categoryCombo[id,displayName],dataElement[id,displayName,categoryCombo[id,displayName]]]";

async function open(dataSets: DataSetsPage, label: string) {
    await dataSets.load();
    await dataSets.select(label);
}

const sectionHeaders = [
    "dos_NameElement",
    "dos_FormNameElement",
    "dos_ShortNameElement",
    "dos_DescriptionElement",
    "dos_DataTypeElement",
    "dos_Options",
    "dos_CategoryCombination",
].map(key => t(key));

/** The smallest data set in the selector with a category combo override. */
async function overrideDataSet(api: any) {
    const { blacklistDS } = await config(api);
    const all = await api.list("dataSets", {
        fields: "id,displayName,dataSetElements[categoryCombo[id],dataElement[categoryCombo[id]]]",
    });
    return all
        .filter((d: any) => !blacklistDS.includes(d.id) && d.id !== small.id)
        .sort((a: any, b: any) => a.dataSetElements.length - b.dataSetElements.length)
        .find((d: any) =>
            d.dataSetElements.some(
                (e: any) => e.categoryCombo && e.categoryCombo.id !== e.dataElement.categoryCombo.id
            )
        );
}

/** A small, not blacklisted data set that uses a data element in an indicator through #{de.coc}. */
async function dataSetWithIndicator(api: any) {
    const { blacklistDS } = await config(api);
    const all = await api.list("dataSets", {
        fields: "id,displayName,dataSetElements[dataElement[id]]",
    });
    const indicators = await visibleIndicators(api);
    const candidates = all
        .filter((d: any) => !blacklistDS.includes(d.id))
        .sort((a: any, b: any) => a.dataSetElements.length - b.dataSetElements.length);
    for (const dataSet of candidates) {
        const ids = new Set(dataSet.dataSetElements.map((e: any) => e.dataElement.id));
        const indicator = indicators.find(i =>
            [...`${i.numerator} ${i.denominator}`.matchAll(/#\{(\w{11})\.\w{11}\}/g)].some(m =>
                ids.has(m[1])
            )
        );
        if (indicator) return { dataSet, indicator };
    }
    return undefined;
}

test.describe("8. Data Sets", () => {
    test.describe("Selector and general", () => {
        test("Counter shows the number of data sets, sorted by name in the selector @smoke", async ({
            dataSets,
            api,
        }) => {
            const { blacklistDS } = await config(api);
            const all = (await api.list("dataSets", { fields: "id,displayName" })).filter(
                (d: any) => !blacklistDS.includes(d.id)
            );
            await dataSets.load();
            await expect(dataSets.pageText).toContainText(`Number of Data Sets: ${all.length}`);
            const labels = await dataSets.optionLabels();
            expect(new Set(labels)).toEqual(new Set(all.map((d: any) => d.displayName)));
            expect(labels).toEqual(
                [...labels].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
            );
        });

        test("Blacklisted data sets are excluded from the selector", async ({ dataSets, api }) => {
            const { blacklistDS } = await config(api);
            const blacklisted = await api.list("dataSets", {
                fields: "displayName",
                filter: `id:in:[${blacklistDS.join(",")}]`,
            });
            await dataSets.load();
            const labels = await dataSets.optionLabels();
            for (const { displayName } of blacklisted.slice(0, 20))
                expect(labels).not.toContain(displayName);
        });

        test("Empty blacklist shows all data sets", async ({ dataSets, page, api }) => {
            const all = await api.list("dataSets", { fields: "displayName" });
            await mockKeys(page, { blacklist_dataSets: [] });
            await dataSets.load();
            await expect(dataSets.pageText).toContainText(`Number of Data Sets: ${all.length}`);
        });

        test("Selecting a data set shows its title and table of contents", async ({ dataSets }) => {
            await open(dataSets, small.name);
            await expect(dataSets.title).toHaveText(small.name);
            await expect(dataSets.tocLink("Sections")).toBeVisible();
        });

        test("Table of contents order: sections, category combinations, indicators", async ({
            dataSets,
            api,
        }) => {
            const found = await dataSetWithIndicator(api);
            test.skip(!found, "No data set with an indicator");
            await open(dataSets, found!.dataSet.displayName);
            await expect(dataSets.tocLink("Indicators")).toBeVisible();
            await expect(dataSets.tocLink("Category combinations")).toBeVisible();
            const entries = await dataSets.tocEntries();
            const sections = entries.indexOf("Sections");
            const combos = entries.indexOf("Category combinations");
            const indicators = entries.indexOf("Indicators");
            expect(sections).toBeGreaterThanOrEqual(0);
            expect(combos).toBeGreaterThan(sections);
            expect(indicators).toBeGreaterThan(combos);
        });

        test("Each table of contents link scrolls to its target", async ({ dataSets, api }) => {
            const found = await dataSetWithIndicator(api);
            test.skip(!found, "No data set with an indicator");
            await open(dataSets, found!.dataSet.displayName);
            await expect(dataSets.tocLink("Indicators")).toBeVisible();
            await dataSets.expectTocScrolls([
                ["Indicators", dataSets.root.locator("#indicatorContainer")],
                ["Category combinations", dataSets.root.locator("#categoryComboContainer")],
                ["Sections", dataSets.root.locator("#sectionContainer")],
            ]);
        });

        test('"Go to index" links scroll to the top', async ({ dataSets }) => {
            await open(dataSets, small.name);
            await dataSets.expectGoToIndexScrolls();
        });

        test("Switching data set replaces all content, with nothing left over", async ({
            dataSets,
            api,
        }) => {
            const override = await overrideDataSet(api);
            const second = await api.get(`dataSets/${override.id}`, { fields: dataSetFields });
            await open(dataSets, small.name);
            const first = await api.get(`dataSets/${small.id}`, { fields: dataSetFields });
            await dataSets.select(override.displayName);
            await expect(dataSets.sections).toHaveCount(second.sections.length);
            const names = new Set(second.sections.map((s: any) => s.displayName));
            for (const section of first.sections) {
                if (!names.has(section.displayName)) {
                    await expect(
                        dataSets.sections.filter({ hasText: section.displayName })
                    ).toHaveCount(0);
                }
            }
        });

        test("Switching data set quickly shows only the last selected one's data", async ({
            dataSets,
            api,
        }) => {
            const last = await api.get(`dataSets/${small.id}`, { fields: dataSetFields });
            await dataSets.load();
            await dataSets.selector.selectOption({
                label: (await overrideDataSet(api)).displayName,
            });
            await dataSets.selector.selectOption({ label: small.name });
            await expect(dataSets.title).toHaveText(small.name);
            await dataSets.waitIdle();
            await expect(dataSets.sections).toHaveCount(last.sections.length);
            await expect(dataSets.sections.first()).toHaveText(last.sections[0].displayName);
        });
    });

    test.describe("Sections", () => {
        test("Data set with sections shows each section, with element count", async ({
            dataSets,
            api,
        }) => {
            const dataSet = await api.get(`dataSets/${small.id}`, { fields: dataSetFields });
            await open(dataSets, small.name);
            await expect(dataSets.sections).toHaveCount(dataSet.sections.length);
            for (const section of dataSet.sections) {
                const heading = dataSets.root.locator(`h3[id="${section.id}"]`);
                await expect(heading).toHaveText(section.displayName);
                await expect(rowsOf(tableAfter(heading))).toHaveCount(section.dataElements.length);
            }
            await expect(dataSets.pageText).toContainText(
                `Number of Elements in Section: ${dataSet.sections[0].dataElements.length}`
            );
        });

        test("Section with no data elements renders with no errors", async ({ dataSets, page }) => {
            await mockKeys(page, { blacklist_dataSets: [] });
            await open(dataSets, noElements.name);
            await expect(dataSets.sections.first()).toBeVisible();
        });

        test("Columns: name, form name, short name, description, value type, options, category combination", async ({
            dataSets,
        }) => {
            await open(dataSets, small.name);
            expect(await headersOf(tableAfter(dataSets.sections.first()))).toEqual(sectionHeaders);
        });

        test("Options are listed for data elements with an option set", async ({
            dataSets,
            api,
        }) => {
            const { blacklistDS } = await config(api);
            const all = await api.list<any>("dataSets", {
                fields: "id,displayName,sections[id,dataElements[id,displayName,optionSet[options[displayName]]]],dataSetElements~size",
            });
            const dataSet = all
                .filter(d => !blacklistDS.includes(d.id))
                .sort((a, b) => a.dataSetElements - b.dataSetElements)
                .find(d =>
                    d.sections.some((s: any) => s.dataElements.some((e: any) => e.optionSet))
                );
            test.skip(!dataSet, "No data set with an option set");
            const section = dataSet.sections.find((s: any) =>
                s.dataElements.some((e: any) => e.optionSet)
            );
            const element = section.dataElements.find((e: any) => e.optionSet);
            await open(dataSets, dataSet.displayName);
            const row = rowsOf(tableAfter(dataSets.root.locator(`h3[id="${section.id}"]`)))
                .filter({ hasText: element.displayName })
                .first();
            await expect(row.locator("li").first()).toHaveText(
                element.optionSet.options[0].displayName
            );
        });
    });

    test.describe("Category combinations", () => {
        test("Category combo is right per element, with sections (PR #68)", async ({
            dataSets,
            api,
        }) => {
            const dataSet = await api.get(`dataSets/${small.id}`, { fields: dataSetFields });
            const overrides = new Map<string, any>(
                dataSet.dataSetElements.map((e: any) => [
                    e.dataElement.id,
                    e.categoryCombo ?? e.dataElement.categoryCombo,
                ])
            );
            await open(dataSets, small.name);
            for (const section of dataSet.sections) {
                const table = tableAfter(dataSets.root.locator(`h3[id="${section.id}"]`));
                for (const element of section.dataElements) {
                    const row = rowsOf(table).filter({ hasText: element.displayName }).first();
                    await expect(row.locator("td").last()).toHaveText(
                        overrides.get(element.id).displayName
                    );
                }
            }
        });

        test("Data set override of the category combo takes precedence over the element's own", async ({
            dataSets,
            api,
        }) => {
            const override = await overrideDataSet(api);
            const dataSet = await api.get(`dataSets/${override.id}`, { fields: dataSetFields });
            const element = dataSet.dataSetElements.find(
                (e: any) => e.categoryCombo && e.categoryCombo.id !== e.dataElement.categoryCombo.id
            );
            const section = dataSet.sections.find((s: any) =>
                s.dataElements.some((d: any) => d.id === element.dataElement.id)
            );
            await open(dataSets, override.displayName);
            const row = rowsOf(tableAfter(dataSets.root.locator(`h3[id="${section.id}"]`)))
                .filter({ hasText: element.dataElement.displayName })
                .first();
            await expect(row.locator("td").last()).toHaveText(element.categoryCombo.displayName);
        });

        test("Category combinations table lists every combo in use, with its categories and items, with and without sections", async ({
            dataSets,
            api,
        }) => {
            const override = await overrideDataSet(api);
            const dataSet = await api.get(`dataSets/${override.id}`, { fields: dataSetFields });
            const combos = new Map<string, string>(
                dataSet.dataSetElements.map((e: any) => {
                    const combo = e.categoryCombo ?? e.dataElement.categoryCombo;
                    return [combo.id, combo.displayName];
                })
            );
            await open(dataSets, override.displayName);
            const table = tableAfter(dataSets.categoryCombosHeading);
            expect(await headersOf(table)).toEqual([
                t("dos_CategoryCombination"),
                t("dos_Categories"),
                t("dos_Items"),
            ]);
            for (const [id, name] of combos) {
                await expect(dataSets.root.locator(`td[id="${id}"]`), name).toHaveText(name);
            }
        });

        test("Combo with several categories is displayed across rows, with the combo cell spanning them", async ({
            dataSets,
            api,
        }) => {
            const { blacklistDS } = await config(api);
            const all = await api.list<any>("dataSets", {
                fields: "id,displayName,dataSetElements[categoryCombo[id,categories~size]]",
            });
            const dataSet = all
                .filter(d => !blacklistDS.includes(d.id))
                .sort((a, b) => a.dataSetElements.length - b.dataSetElements.length)
                .find(d => d.dataSetElements.some((e: any) => e.categoryCombo?.categories > 1));
            test.skip(!dataSet, "No data set with a multi-category combo");
            const combo = dataSet.dataSetElements.find(
                (e: any) => e.categoryCombo?.categories > 1
            ).categoryCombo;
            await open(dataSets, dataSet.displayName);
            const cell = dataSets.root.locator(`td[id="${combo.id}"]`);
            await expect(cell).toHaveAttribute("rowspan", String(combo.categories));
        });

        test("Clicking a category combo in a row scrolls to its definition", async ({
            dataSets,
            page,
            api,
        }) => {
            const dataSet = await api.get(`dataSets/${small.id}`, { fields: dataSetFields });
            const section = dataSet.sections[0];
            const element = section.dataElements[0];
            const entry = dataSet.dataSetElements.find((e: any) => e.dataElement.id === element.id);
            const combo = entry.categoryCombo ?? entry.dataElement.categoryCombo;
            await open(dataSets, small.name);
            await page.evaluate(() => window.scrollTo(0, 0));
            await tableAfter(dataSets.root.locator(`h3[id="${section.id}"]`))
                .locator("td a", { hasText: combo.displayName })
                .first()
                .click();
            await dataSets.expectInView(dataSets.root.locator(`td[id="${combo.id}"]`));
        });
    });

    test.describe("Indicators", () => {
        test("Table lists indicators using this data set's elements through `#{de.coc}`, sorted by name", async ({
            dataSets,
            api,
        }) => {
            const found = await dataSetWithIndicator(api);
            test.skip(!found, "No data set with an indicator");
            await open(dataSets, found!.dataSet.displayName);
            const table = tableAfter(dataSets.indicatorsHeading);
            await expect(
                rowsOf(table).filter({ hasText: found!.indicator.displayName }).first()
            ).toBeVisible();
            const names = (await rowsOf(table).locator("td:first-child").allInnerTexts()).map(x =>
                x.trim()
            );
            expect(names).toEqual(
                [...names].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
            );
        });

        test("Data set indicators: blacklisted indicators are excluded, and not-in-use ones are visible", async ({
            dataSets,
            api,
            page,
        }) => {
            const found = await dataSetWithIndicator(api);
            test.skip(!found || !found.indicator.indicatorGroups.length, "No grouped indicator");
            const group = found!.indicator.indicatorGroups[0]!.id;
            await mockKeys(page, {
                notInUse_indicatorGroups: [group],
                blacklist_indicatorGroups: [],
            });
            await open(dataSets, found!.dataSet.displayName);
            const row = dataSets.root
                .locator("#indicatorContainer tbody tr")
                .filter({ hasText: found!.indicator.displayName });
            await expect(row.first()).toBeVisible();
            await page.unrouteAll();
            await mockKeys(page, {
                notInUse_indicatorGroups: [],
                blacklist_indicatorGroups: [group],
            });
            await open(dataSets, found!.dataSet.displayName);
            await expect(dataSets.tocLink("Category combinations")).toBeVisible();
            await expect(row).toHaveCount(0);
        });

        test("Columns: name, short name, type, numerator, numerator description, denominator, denominator description", async ({
            dataSets,
            api,
        }) => {
            const found = await dataSetWithIndicator(api);
            test.skip(!found, "No data set with an indicator");
            await open(dataSets, found!.dataSet.displayName);
            expect(await headersOf(tableAfter(dataSets.indicatorsHeading))).toEqual(
                [
                    "dos_NameIndicator",
                    "dos_ShortNameIndicator",
                    "dos_Type",
                    "dos_NumeratorIndicator",
                    "dos_NumeratorIndicatorDescription",
                    "dos_DenominatorIndicator",
                    "dos_DenominatorIndicatorDescription",
                ].map(key => t(key))
            );
        });

        test("Numerator and denominator show readable descriptions", async ({ dataSets, api }) => {
            const found = await dataSetWithIndicator(api);
            test.skip(!found, "No data set with an indicator");
            await open(dataSets, found!.dataSet.displayName);
            const row = dataSets.root
                .locator("#indicatorContainer tbody tr")
                .filter({ hasText: found!.indicator.displayName })
                .first();
            await expect(row.locator("td").nth(3)).not.toContainText("#{");
            await expect(row.locator("td").nth(5)).not.toContainText("#{");
            await expect(row.locator("td").nth(3)).not.toBeEmpty();
        });

        test("Indicators block and entry are absent when there are none", async ({
            dataSets,
            page,
        }) => {
            await page.route(/\/api(\/\d+)?\/indicators\?/, route =>
                route.fulfill({ json: { indicators: [] } })
            );
            await open(dataSets, small.name);
            await expect(dataSets.tocLink("Category combinations")).toBeVisible();
            await expect(dataSets.indicatorsHeading).toHaveCount(0);
            await expect(dataSets.tocLink("Indicators")).toHaveCount(0);
        });
    });
});
