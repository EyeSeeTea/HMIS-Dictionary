import { expect, fixtures, test } from "../support/fixtures";
import { rowsOf, tableAfter } from "../support/pages";

const { eventProgram } = fixtures.programs;
const noAccess = '[data-test="resource-no-access"]';

test.describe("HIS: links without access", () => {
    test("With access to the data of the program, event resources are links", async ({
        programs,
    }) => {
        await programs.load();
        await programs.select(eventProgram.name);
        const rows = rowsOf(tableAfter(programs.resourcesHeading));
        await expect(rows.first()).toBeVisible();
        await expect(rows.locator(noAccess)).toHaveCount(0);
        await expect(rows.locator("a").first()).toHaveAttribute("href", /dhis-web-event/);
    });

    test("Without it, they are greyed out, with an explanation", async ({ programs, page }) => {
        await page.route(/\/api(\/\d+)?\/programs(\.json)?\?/, async route => {
            const response = await route.fetch();
            const json = await response.json();
            for (const program of json.programs ?? []) {
                program.access = { data: { read: false } };
            }
            await route.fulfill({ response, json });
        });

        await programs.load();
        await programs.select(eventProgram.name);
        const rows = rowsOf(tableAfter(programs.resourcesHeading));
        await expect(rows.first()).toBeVisible();

        const count = await rows.count();
        await expect(rows.locator(noAccess)).toHaveCount(count);
        await expect(rows.locator("a")).toHaveCount(0);
        await expect(rows.locator(noAccess).first()).toHaveAttribute("title", /no access/);
    });
});
