import { expect, fixtures, test } from "../support/fixtures";

const { small } = fixtures.dataSets;
const orphan = "E2E orphaned element";

test.describe("HIS: orphaned data elements", () => {
    test("They are not listed in the section, nor counted", async ({ dataSets, api, page }) => {
        const { sections } = await api.get(`dataSets/${small.id}`, {
            fields: "sections[id,dataElements[id]]",
        });
        const [section] = sections;

        // The only data set like this on the instance is blacklisted, so one is made from a real one
        await page.route(/\/api(\/\d+)?\/dataSets(\.json)?\?.*sections/, async route => {
            const response = await route.fetch();
            const json = await response.json();
            const [element] = json.dataSets[0].sections[0].dataElements;
            json.dataSets[0].sections[0].dataElements.push({
                ...element,
                id: "orphanE2E01",
                displayName: orphan,
            });
            await route.fulfill({ response, json });
        });

        await dataSets.load();
        await dataSets.select(small.name);
        const block = page.locator(`[id="${section.id}"]`).locator("xpath=ancestor::section[1]");

        await expect(block).toContainText(`in Section: ${section.dataElements.length}`);
        await expect(block.locator("tbody tr").first()).toBeVisible();
        await expect(block.locator("tbody tr").filter({ hasText: orphan })).toHaveCount(0);
    });
});
