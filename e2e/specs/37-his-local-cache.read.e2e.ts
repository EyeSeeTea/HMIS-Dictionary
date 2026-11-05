import { expect, test } from "../support/fixtures";

const dataElementsLoad = /\/api(\/\d+)?\/dataElements(\.json)?\?.*paging=false/;

test.describe("HIS: local cache of Search", () => {
    test("The second load does not ask the server for the data again", async ({ search, page }) => {
        const loads: string[] = [];
        page.on("request", request => {
            if (dataElementsLoad.test(request.url())) loads.push(request.url());
        });

        await search.load();
        await expect(search.table.rows.first()).toBeVisible();
        expect(loads.length).toBeGreaterThan(0);
        const firstRow = await search.table.rows.first().innerText();

        loads.length = 0;
        await search.load();
        await expect(search.table.rows.first()).toBeVisible();

        expect(loads).toEqual([]);
        expect(await search.table.rows.first().innerText()).toBe(firstRow);
    });
});
