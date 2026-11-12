import { expect, fixtures, test } from "../support/fixtures";

const { small } = fixtures.dataSets;

// This test breaks a section on purpose, so the error must not fail it
test.use({ failOnPageError: async ({}, use) => use() });

test.describe("HIS: error boundaries", () => {
    test("An error in one section shows a message, and the rest of the page works", async ({
        dataSets,
        page,
    }) => {
        await page.route(/\/api(\/\d+)?\/dataSets(\.json)?\?.*sections/, async route => {
            const response = await route.fetch();
            const json = await response.json();
            for (const section of json.dataSets[0].sections) {
                for (const element of section.dataElements) {
                    element.displayName = { notAText: true };
                }
            }
            await route.fulfill({ response, json });
        });

        await dataSets.load();
        await dataSets.select(small.name);

        await expect(page.locator('[data-test="error-boundary"]').first()).toContainText(
            "Something went wrong"
        );
        await expect(dataSets.title).toBeVisible();
        await expect(dataSets.categoryCombosHeading).toBeVisible();
        await expect(dataSets.tabs.first()).toBeVisible();
    });
});
