import { config } from "../support/data";
import { expect, test } from "../support/fixtures";

const description = "#dataSetDescription";

async function visibleDataSets(api: any) {
    const { blacklistDS } = await config(api);
    const all = await api.list("dataSets", { fields: "id,displayName,displayDescription" });
    return all.filter((d: any) => !blacklistDS.includes(d.id));
}

test.describe("HIS: data set description", () => {
    test("It is shown under the title, also when printing", async ({ dataSets, api, page }) => {
        const withText = (await visibleDataSets(api)).find((d: any) => d.displayDescription);
        await dataSets.load();
        await dataSets.select(withText.displayName);
        const text = dataSets.root.locator(description);
        await expect(text).toHaveText(withText.displayDescription.trim());

        await page.emulateMedia({ media: "print" });
        await expect(text).toBeVisible();
    });

    test("Without one, nothing is shown", async ({ dataSets, api }) => {
        const without = (await visibleDataSets(api)).find((d: any) => !d.displayDescription);
        await dataSets.load();
        await dataSets.select(without.displayName);
        await expect(dataSets.title).toBeVisible();
        await expect(dataSets.root.locator(description)).toHaveCount(0);
    });
});
