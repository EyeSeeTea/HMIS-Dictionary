import { visibleIndicators } from "../support/data";
import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

const NAME = t("object_name");

async function namedIndicator(api: any) {
    const indicators = await visibleIndicators(api);
    const indicator = indicators.find(
        i => !/[|&]/.test(i.displayName) && /^\w{4,}\s+\w{4,}/.test(i.displayName)
    );
    if (!indicator) throw new Error("No indicator found");
    const [first = "", second = ""] = indicator.displayName.split(/\s+/);
    return { indicator, first, second };
}

test.describe("HIS: & operator", () => {
    test("Finds rows with all the terms, in any column", async ({ search, api }) => {
        const { indicator, first } = await namedIndicator(api);
        await search.load();
        await search.searchFor(`indicator & ${first}`);
        await search.filterById(indicator.id);
        await expect(search.table.rows).toHaveCount(1);
    });

    test("A term that is in no column leaves the row out", async ({ search, api }) => {
        const { indicator, first } = await namedIndicator(api);
        await search.load();
        await search.searchFor(`${first} & nosuchworde2e`);
        await search.filterById(indicator.id);
        await expect(search.table.rows).toHaveCount(0);
    });

    test("A term keeps its words together", async ({ search, api }) => {
        const { indicator, first, second } = await namedIndicator(api);
        await search.load();
        await search.searchFor(`${first} ${second} & indicator`);
        await search.filterById(indicator.id);
        await expect(search.table.rows).toHaveCount(1);

        await search.searchFor(`${second} ${first} & indicator`);
        await expect(search.table.rows).toHaveCount(0);
    });

    test("Each term is highlighted", async ({ search, api }) => {
        const { indicator, first } = await namedIndicator(api);
        await search.load();
        await search.searchFor(`indicator & ${first}`);
        await search.filterById(indicator.id);
        const marks = await (await search.table.cell(0, NAME))
            .locator(".highlighted")
            .allInnerTexts();
        expect(marks.map(mark => mark.toLowerCase())).toContain(first.toLowerCase());
    });
});
