import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { headersOf, rowsOf, tableAfter } from "../support/pages";

const { mentalGroup, snakebites } = fixtures.programs;

test.describe("HIS: related indicators columns", () => {
    for (const program of [snakebites, mentalGroup]) {
        test(`${program.name}: short name and descriptions of numerator and denominator`, async ({
            programs,
            api,
        }) => {
            await programs.load();
            await programs.select(program.name);
            await programs.waitIdle();
            if ((await programs.indicatorsHeading.count()) === 0) test.skip();

            const table = tableAfter(programs.indicatorsHeading);
            const headers = await headersOf(table);
            const columns = {
                displayShortName: headers.indexOf(t("dos_ShortNameElement")),
                numeratorDescription: headers.indexOf(t("dos_NumeratorIndicatorDescription")),
                denominatorDescription: headers.indexOf(t("dos_DenominatorIndicatorDescription")),
            };
            Object.values(columns).forEach(column => expect(column).toBeGreaterThan(-1));

            const name = headers.indexOf(t("dos_NameElement"));
            const row = rowsOf(table).first();
            const displayName = (await row.locator("td").nth(name).innerText()).trim();
            const [indicator] = await api.list("indicators", {
                fields: "displayShortName,numeratorDescription,denominatorDescription",
                filter: `displayName:eq:${displayName}`,
            });
            for (const [field, column] of Object.entries(columns)) {
                await expect(row.locator("td").nth(column)).toHaveText(
                    (indicator[field] ?? "").trim()
                );
            }
        });
    }
});
