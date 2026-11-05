import { visibleIndicators } from "../support/data";
import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

const NAME = t("object_name");

/** An indicator whose name has at least two long words, and no search operators. */
async function indicatorWithWords(api: any) {
    const indicators = await visibleIndicators(api);
    for (const indicator of indicators) {
        if (/[|&]/.test(indicator.displayName)) continue;
        const words = indicator.displayName.split(/\s+/).filter(word => /^\w{4,}$/.test(word));
        const [first, second] = words;
        if (first && second && first !== second) return { indicator, first, second };
    }
    throw new Error("No indicator found");
}

test.describe("HIS: multi-word search", () => {
    test("Finds rows with all the words, in any order", async ({ search, api }) => {
        const { indicator, first, second } = await indicatorWithWords(api);
        await search.load();
        await search.searchFor(`${second} ${first}`);
        await search.filterById(indicator.id);
        await expect(search.table.rows).toHaveCount(1);
    });

    test("Words can be in different columns", async ({ search, api }) => {
        const { indicator, first } = await indicatorWithWords(api);
        await search.load();
        await search.searchFor(`${first} indicator`);
        await search.filterById(indicator.id);
        await expect(search.table.rows).toHaveCount(1);
    });

    test("A word that is in no column leaves the row out", async ({ search, api }) => {
        const { indicator, first } = await indicatorWithWords(api);
        await search.load();
        await search.searchFor(`${first} nosuchworde2e`);
        await search.filterById(indicator.id);
        await expect(search.table.rows).toHaveCount(0);
    });

    test("Each word is highlighted", async ({ search, api }) => {
        const { indicator, first, second } = await indicatorWithWords(api);
        await search.load();
        await search.searchFor(`${second} ${first}`);
        await search.filterById(indicator.id);
        const cell = await search.table.cell(0, NAME);
        const marks = (await cell.locator(".highlighted").allInnerTexts()).map(mark =>
            mark.toLowerCase()
        );
        expect(marks).toContain(first.toLowerCase());
        expect(marks).toContain(second.toLowerCase());
    });
});
