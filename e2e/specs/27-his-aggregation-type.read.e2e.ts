import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { headersOf, rowsOf, tableAfter } from "../support/pages";

test.describe("HIS: aggregation type of data elements", () => {
    test("The sections of a data set show it", async ({ dataSets, api }) => {
        const { small } = fixtures.dataSets;
        const { sections } = await api.get(`dataSets/${small.id}`, {
            fields: "sections[dataElements[displayName,aggregationType]]",
        });
        const [element] = sections[0].dataElements;

        await dataSets.load();
        await dataSets.select(small.name);
        const table = tableAfter(dataSets.sections.first());
        const headers = await headersOf(table);
        const column = headers.indexOf(t("dos_AggregationType"));
        expect(column).toBeGreaterThan(-1);

        const row = rowsOf(table).filter({ hasText: element.displayName }).first();
        await expect(row.locator("td").nth(column)).toHaveText(element.aggregationType);
    });
});
