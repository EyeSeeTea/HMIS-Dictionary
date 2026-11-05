import { expect, test } from "../support/fixtures";

test.describe("HIS: local cache of Search", () => {
    test("A change in the metadata is noticed on the next load", async ({ search, api }) => {
        const [type] = await api.list("indicatorTypes", {
            fields: "id",
            pageSize: 1,
            paging: true,
        });
        const id = api.uid();
        const indicator = {
            id,
            name: `E2E_${id}`,
            shortName: `E2E_${id}`,
            numerator: "1",
            numeratorDescription: "n",
            denominator: "1",
            denominatorDescription: "d",
            annualized: false,
            indicatorType: { id: type.id },
        };

        await search.load();
        await expect(search.table.rows.first()).toBeVisible();
        await search.filterById(id);
        await expect(search.table.rows).toHaveCount(0);

        await api.withMetadata({ indicators: [indicator] }, async () => {
            await search.load();
            await search.filterById(id);
            await expect(search.table.rows).toHaveCount(1);
        });

        await search.load();
        await search.filterById(id);
        await expect(search.table.rows).toHaveCount(0);
    });
});
