import { Locator } from "@playwright/test";
import { config, visibleIndicators } from "../support/data";
import { expect, fixtures, test } from "../support/fixtures";

const { small } = fixtures.dataSets;

const maxHeight = (cell: Locator) => cell.evaluate(element => getComputedStyle(element).maxHeight);

test.describe("HIS: scrollable long cells", () => {
    test("Options are limited on screen, and shown in full when printing", async ({
        dataSets,
        page,
    }) => {
        await dataSets.load();
        await dataSets.select(small.name);
        const cell = dataSets.root.locator('[data-test="options-cell"]').first();
        await expect(cell).toBeAttached();

        expect(await maxHeight(cell)).toBe("170px");
        await page.emulateMedia({ media: "print" });
        expect(await maxHeight(cell)).toBe("none");
    });

    test("Formulas are limited on screen, and shown in full when printing", async ({
        dataSets,
        api,
        page,
    }) => {
        const { blacklistDS } = await config(api);
        const all = await api.list("dataSets", {
            fields: "id,displayName,dataSetElements[dataElement[id]]",
        });
        const indicators = await visibleIndicators(api);
        const formulas = indicators.map(i => `${i.numerator} ${i.denominator}`);
        const dataSet = all
            .filter((d: any) => !blacklistDS.includes(d.id))
            .sort((a: any, b: any) => a.dataSetElements.length - b.dataSetElements.length)
            .find((d: any) =>
                d.dataSetElements.some((e: any) =>
                    formulas.some(formula => formula.includes(`#{${e.dataElement.id}.`))
                )
            );

        await dataSets.load();
        await dataSets.select(dataSet.displayName);
        const cell = dataSets.root.locator('[data-test="formula-cell"]').first();
        await expect(cell).toBeAttached();

        expect(await maxHeight(cell)).toBe("170px");
        await page.emulateMedia({ media: "print" });
        expect(await maxHeight(cell)).toBe("none");
    });
});
