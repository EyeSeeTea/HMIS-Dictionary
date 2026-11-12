import { expect, test } from "../support/fixtures";
import { allIndicators, config, visibleIndicators } from "../support/data";
import { t } from "../support/i18n";
import {
    DataSetsPage,
    IndicatorsPage,
    mockKeys,
    ProgramsPage,
    rowsOf,
    tableAfter,
} from "../support/pages";

const withElement = async (api: any) =>
    (await visibleIndicators(api)).find(
        i => /^\s*#\{\w{11}\.\w{11}\}/.test(i.numerator) && /^\s*\d+\s*$/.test(i.denominator)
    )!;

async function open(indicators: IndicatorsPage, name: string) {
    await indicators.load();
    await indicators.select(name);
}

/** The name the selector shows, which is translated. `name` differs when it has translations. */
async function byName(api: any, id: string): Promise<string> {
    return (await api.get(`indicators/${id}`, { fields: "displayName" })).displayName;
}

test.describe("9. Indicators", () => {
    test("Counter shows the number of indicators, sorted by name in the selector @smoke", async ({
        indicators,
        api,
    }) => {
        const visible = await visibleIndicators(api);
        await indicators.load();
        await expect(indicators.pageText).toContainText(`Number of Indicators: ${visible.length}`);
        const labels = await indicators.optionLabels();
        expect(labels).toHaveLength(visible.length);
        // Names may start with spaces, which count for the order but are not displayed.
        const raw = await indicators.options.allTextContents();
        expect(raw).toEqual(
            [...raw].sort((a, b) =>
                a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
            )
        );
    });

    test("Selector: blacklisted indicators are excluded, and not-in-use ones are visible", async ({
        indicators,
        api,
        page,
    }) => {
        const { blacklistIG } = await config(api);
        const all = await allIndicators(api);
        const blacklisted = all.find(i => i.indicatorGroups.some(g => blacklistIG.includes(g.id)))!;
        test.skip(!blacklisted, "No indicator in a blacklisted group");
        const unique = all.filter(i => all.filter(o => o.name === blacklisted.name).length === 1);
        expect(unique.length).toBeGreaterThan(0);
        await indicators.load();
        expect(await indicators.optionLabels()).not.toContain(blacklisted.name);
        await mockKeys(page, {
            blacklist_indicatorGroups: [],
            notInUse_indicatorGroups: [blacklistIG[0]!],
        });
        await indicators.load();
        expect(await indicators.optionLabels()).toContain(blacklisted.name);
    });

    test("Nothing is displayed before selecting an indicator", async ({ indicators }) => {
        await indicators.load();
        await expect(indicators.title).toHaveCount(0);
        await expect(indicators.toc).toHaveCount(0);
    });

    test("Selecting an indicator shows its name, description and table of contents", async ({
        indicators,
        api,
    }) => {
        const all = await api.list<any>("indicators", {
            fields: "id,name,description,indicatorGroups[id]",
        });
        const { blacklistIG } = await config(api);
        const indicator = all.find(
            i => i.description && !i.indicatorGroups.some((g: any) => blacklistIG.includes(g.id))
        );
        await open(indicators, indicator.name);
        await expect(indicators.title).toHaveText(indicator.name);
        await expect(indicators.root.locator("#DossierTitleContainer h4")).toHaveText(
            indicator.description.trim()
        );
        await expect(indicators.toc.locator("a").first()).toBeVisible();
    });

    test("Formula section shows the numerator and denominator with names and operators", async ({
        indicators,
        api,
    }) => {
        const raw = await visibleIndicators(api);
        const indicator = raw.find(i =>
            /^\s*#\{\w{11}\.\w{11}\}\s*\+\s*#\{\w{11}\.\w{11}\}\s*$/.test(i.numerator)
        )!;
        const [, deId] = /#\{(\w{11})/.exec(indicator.numerator)!;
        const { name } = await api.get(`dataElements/${deId}`, { fields: "name" });
        await open(indicators, await byName(api, indicator.id));
        const table = tableAfter(indicators.formulaHeading);
        await expect(table).toContainText(name);
        await expect(table).toContainText("+");
        await expect(table).not.toContainText("#{");
    });

    test("Formula handles `#{de}`, `#{de.coc}`, `I{pi}`, `D{program.de}`, `G{group}` and plain numbers", async ({
        indicators,
        api,
    }) => {
        // D{} and G{} are not on the instance, so the write spec adds them.
        const raw = await visibleIndicators(api);
        for (const regex of [
            /^\s*#\{\w{11}\}\s*$/,
            /^\s*#\{\w{11}\.\w{11}\}\s*$/,
            /^\s*I\{\w{11}\}\s*$/,
        ]) {
            const indicator = raw.find(i => regex.test(i.numerator));
            if (!indicator) continue;
            await open(indicators, await byName(api, indicator.id));
            const table = tableAfter(indicators.formulaHeading);
            await expect(table).not.toContainText("{");
            await expect(rowsOf(table).first()).not.toHaveText("");
        }
        const number = raw.find(i => /^\s*\d+\s*$/.test(i.denominator))!;
        await open(indicators, await byName(api, number.id));
        await expect(
            tableAfter(indicators.formulaHeading.locator("xpath=following::table[1]"))
        ).toContainText(number.denominator.trim());
    });

    test("Numerator table lists each item with its type, name, data sets and program, sorted by name", async ({
        indicators,
        api,
    }) => {
        const indicator = await withElement(api);
        const [, deId] = /#\{(\w{11})/.exec(indicator.numerator)!;
        const { name } = await api.get(`dataElements/${deId}`, { fields: "name" });
        await open(indicators, await byName(api, indicator.id));
        const table = tableAfter(indicators.numeratorHeading);
        await expect(table.locator("thead th")).toHaveText([
            new RegExp(t("dos_Type")),
            new RegExp(t("dos_NameIndicator")),
            /DataSets|Data Sets/,
            new RegExp(t("dos_Program")),
        ]);
        await expect(rowsOf(table).filter({ hasText: name }).first()).toBeVisible();
    });

    test("Denominator table does the same", async ({ indicators, api }) => {
        const raw = await visibleIndicators(api);
        const indicator = raw.find(i => /#\{\w{11}\.\w{11}\}/.test(i.denominator))!;
        const [, deId] = /#\{(\w{11})/.exec(indicator.denominator)!;
        const { name } = await api.get(`dataElements/${deId}`, { fields: "name" });
        await open(indicators, await byName(api, indicator.id));
        const table = tableAfter(indicators.denominatorHeading);
        await expect(table.locator("thead th")).toHaveCount(4);
        await expect(rowsOf(table).filter({ hasText: name }).first()).toBeVisible();
    });

    test("Types: aggregate data element, tracker data element, program indicator, number, organisation unit group", async ({
        indicators,
        api,
    }) => {
        // Tracker data elements and organisation unit groups are not on the instance, so the write spec adds them.
        const raw = await visibleIndicators(api);
        const aggregate = await withElement(api);
        await open(indicators, await byName(api, aggregate.id));
        const types = rowsOf(tableAfter(indicators.numeratorHeading)).locator("td:first-child");
        await expect(
            types.filter({ hasText: "Data Element - Aggregate Value" }).first()
        ).toBeVisible();
        const pi = raw.find(i => /^\s*I\{\w{11}\}\s*$/.test(i.numerator));
        test.skip(!pi, "No indicator with only a program indicator");
        await open(indicators, await byName(api, pi!.id));
        await expect(types.filter({ hasText: "Program Indicator" }).first()).toBeVisible();
        const number = raw.find(i => /^\s*\d+\s*$/.test(i.denominator))!;
        await open(indicators, await byName(api, number.id));
        await expect(
            rowsOf(tableAfter(indicators.denominatorHeading)).locator("td:first-child").first()
        ).toHaveText("Number");
    });

    test('Data element in no data set shows "No Value"', async ({ indicators, api }) => {
        const des = await api.list<any>("dataElements", { fields: "id,dataSetElements~size" });
        const none = new Set(des.filter(d => d.dataSetElements === 0).map(d => d.id));
        const indicator = (await visibleIndicators(api)).find(i => {
            const m = /^\s*#\{(\w{11})/.exec(i.numerator);
            return m && none.has(m[1]!) && !/\b(I|D|A|C|G)\{/.test(i.numerator);
        });
        test.skip(!indicator, "No indicator using a data element in no data set");
        await open(indicators, await byName(api, indicator!.id));
        await expect(tableAfter(indicators.numeratorHeading)).toContainText("No Value");
    });

    test("Numerator and denominator descriptions are displayed", async ({ indicators, api }) => {
        const { blacklistIG } = await config(api);
        const all = await api.list<any>("indicators", {
            fields: "id,name,numerator,denominator,numeratorDescription,denominatorDescription,indicatorGroups[id]",
        });
        const indicator = all.find(
            i =>
                i.numeratorDescription &&
                i.denominatorDescription &&
                /#\{/.test(i.numerator) &&
                /#\{/.test(i.denominator) &&
                !i.indicatorGroups.some((g: any) => blacklistIG.includes(g.id))
        );
        test.skip(!indicator, "No indicator with both descriptions");
        await open(indicators, indicator.name);
        await expect(indicators.pageText).toContainText(indicator.numeratorDescription.trim());
        await expect(indicators.pageText).toContainText(indicator.denominatorDescription.trim());
    });

    test("Sections with no items are hidden", async ({ indicators, api }) => {
        const indicator = await withElement(api);
        await open(indicators, await byName(api, indicator.id));
        await expect(indicators.numeratorHeading).toBeVisible();
        await expect(indicators.denominatorHeading).toBeVisible();
        await indicators.page.route(/\/api(\/\d+)?\/indicators(\.json)?(\?|$)/, async route => {
            const response = await route.fetch();
            const json = await response.json();
            json.indicators = json.indicators.map((i: any) =>
                i.id === indicator.id ? { ...i, numerator: "", denominator: "" } : i
            );
            await route.fulfill({ response, json });
        });
        await open(indicators, await byName(api, indicator.id));
        await expect(indicators.numeratorHeading).toBeHidden();
        await expect(indicators.denominatorHeading).toBeHidden();
    });

    test("Each table of contents link scrolls to its target", async ({ indicators, api }) => {
        const indicator = await withElement(api);
        await open(indicators, await byName(api, indicator.id));
        await expect(indicators.tocLink(/Denominator/)).toBeVisible();
        await indicators.expectTocScrolls([
            [/Denominator/, indicators.denominatorHeading],
            [/Numerator/, indicators.numeratorHeading],
            [/Formula/, indicators.formulaHeading],
        ]);
    });

    test('"Go to index" links scroll to the top', async ({ indicators, api }) => {
        const indicator = await withElement(api);
        await open(indicators, await byName(api, indicator.id));
        await indicators.expectGoToIndexScrolls();
    });

    test("Clicking a data set opens Data Sets with that data set available in the selector", async ({
        indicators,
        api,
        page,
    }) => {
        const indicator = await withElement(api);
        const [, deId] = /#\{(\w{11})/.exec(indicator.numerator)!;
        const de = await api.get(`dataElements/${deId}`, {
            fields: "dataSetElements[dataSet[name]]",
        });
        test.skip(de.dataSetElements.length === 0, "The data element is in no data set");
        await open(indicators, await byName(api, indicator.id));
        const dataSetName = de.dataSetElements[0].dataSet.name;
        await tableAfter(indicators.numeratorHeading)
            .getByRole("button", { name: dataSetName, exact: true })
            .first()
            .click();
        await expect(page).toHaveURL(/#\/datasets$/);
        const dataSets = new DataSetsPage(page);
        await expect(
            dataSets.selector.locator("option", { hasText: dataSetName }).first()
        ).toBeAttached();
    });

    test("Clicking a program opens Programs with that program available in the selector", async ({
        indicators,
        api,
        page,
    }) => {
        // Only tracker data elements link to a program, so this needs a D{} formula.
        const raw = await allIndicators(api);
        const indicator = raw.find(i => /D\{\w{11}\.\w{11}\}/.test(i.numerator));
        test.skip(!indicator, "No indicator using D{} on this instance: covered by the write spec");
        const [, programId] = /D\{(\w{11})/.exec(indicator!.numerator)!;
        const { name } = await api.get(`programs/${programId}`, { fields: "name" });
        await open(indicators, indicator!.name);
        await tableAfter(indicators.numeratorHeading)
            .getByRole("button", { name, exact: true })
            .first()
            .click();
        await expect(page).toHaveURL(/#\/dossierPrograms$/);
        const programs = new ProgramsPage(page);
        await expect(programs.selector.locator("option", { hasText: name }).first()).toBeAttached();
    });

    test("Switching indicator replaces all content, with nothing left over", async ({
        indicators,
        api,
    }) => {
        const first = await withElement(api);
        const second = (await visibleIndicators(api)).find(
            i =>
                i.id !== first.id &&
                /^\s*#\{\w{11}\.\w{11}\}/.test(i.numerator) &&
                /#\{(\w{11})/.exec(i.numerator)![1] !== /#\{(\w{11})/.exec(first.numerator)![1]
        )!;
        const firstDe = /#\{(\w{11})/.exec(first.numerator)![1];
        const secondDe = /#\{(\w{11})/.exec(second.numerator)![1];
        const firstName = (await api.get(`dataElements/${firstDe}`, { fields: "name" })).name;
        const secondName = (await api.get(`dataElements/${secondDe}`, { fields: "name" })).name;
        await open(indicators, await byName(api, first.id));
        await expect(tableAfter(indicators.numeratorHeading)).toContainText(firstName);
        await indicators.select(await byName(api, second.id));
        const table = tableAfter(indicators.numeratorHeading);
        await expect(table).toContainText(secondName);
        if (firstName !== secondName) await expect(table).not.toContainText(firstName);
    });

    test("Switching indicator quickly shows only the last selected indicator's data", async ({
        indicators,
        api,
    }) => {
        const first = await withElement(api);
        const second = (await visibleIndicators(api)).find(
            i =>
                i.id !== first.id &&
                /^\s*#\{\w{11}\.\w{11}\}/.test(i.numerator) &&
                /#\{(\w{11})/.exec(i.numerator)![1] !== /#\{(\w{11})/.exec(first.numerator)![1]
        )!;
        const secondDe = /#\{(\w{11})/.exec(second.numerator)![1];
        const secondName = (await api.get(`dataElements/${secondDe}`, { fields: "name" })).name;
        const secondLabel = await byName(api, second.id);
        await indicators.load();
        await indicators.selector.selectOption({ label: await byName(api, first.id) });
        await indicators.selector.selectOption({ label: secondLabel });
        await expect(indicators.title).toHaveText(secondLabel);
        await indicators.waitIdle();
        await expect(tableAfter(indicators.numeratorHeading)).toContainText(secondName);
    });
});
