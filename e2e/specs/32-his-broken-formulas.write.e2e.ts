import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

const NUMERATOR = t("object_num_formula");

test.describe("HIS: broken formulas", () => {
    test("Ids not found and sum() expressions are flagged", async ({ search, api }) => {
        const [type] = await api.list("indicatorTypes", {
            fields: "id",
            pageSize: 1,
            paging: true,
        });
        const indicator = (numerator: string) => {
            const id = api.uid();
            return {
                id,
                name: `E2E_${id}`,
                shortName: `E2E_${id}`,
                numerator,
                numeratorDescription: "n",
                denominator: "1",
                denominatorDescription: "d",
                annualized: false,
                indicatorType: { id: type.id },
            };
        };
        const missing = indicator("#{doesNotExis} + I{doesNotExis}");
        const sum = indicator("sum(#{doesNotExis})");

        await api.withMetadata({ indicators: [missing, sum] }, async () => {
            await search.load();
            await search.showColumn(NUMERATOR);

            await search.filterById(missing.id);
            const cell = await search.table.cell(0, NUMERATOR);
            await expect(cell).toContainText("DE:doesNotExis");
            await expect(cell).toContainText("PI:doesNotExis");

            await search.filterById(sum.id);
            await expect(await search.table.cell(0, NUMERATOR)).toContainText(
                "Expression is not well-formed"
            );
        });
    });
});
