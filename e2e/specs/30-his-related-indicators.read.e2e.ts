import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { headersOf, rowsOf, tableAfter } from "../support/pages";

const { trackerProgram, indicatorsProgram } = fixtures.programs;

test.describe("HIS: related indicators columns", () => {
    const cases = [
        { role: "A program with related indicators", program: indicatorsProgram },
        { role: "A tracker program", program: trackerProgram },
    ];
    for (const { role, program } of cases) {
        test(`${role}: short name and descriptions of numerator and denominator`, async ({
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
            // By the name as shown, with its spaces collapsed, so not with a filter on the exact name
            const all = await api.list<any>("indicators", {
                fields: "displayName,displayShortName,numeratorDescription,denominatorDescription",
            });
            const collapse = (text: string) => text.replace(/\s+/g, " ").trim();
            const indicator = all.find(i => collapse(i.displayName) === collapse(displayName));
            expect(indicator, `Indicator named "${displayName}"`).toBeDefined();
            for (const [field, column] of Object.entries(columns)) {
                await expect(row.locator("td").nth(column)).toHaveText(
                    (indicator[field] ?? "").trim()
                );
            }
        });
    }
});
