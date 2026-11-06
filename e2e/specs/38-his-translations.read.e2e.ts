import { Page } from "@playwright/test";
import { expect, fixtures, test } from "../support/fixtures";

const panels = {
    es: {
        orgUnits: "Unidades organizativas",
        guide: "Terminología DHIS2",
    },
    fr: {
        orgUnits: "Unités d'organisation",
        guide: "Terminologie DHIS2",
    },
} as const;

/**
 * The language of the user, for this page. It answers both places where it is read: the app reads
 * userSettings, and the header of @dhis2/ui sets the language again from me on each render.
 */
async function useLanguage(page: Page, language: string) {
    await page.route(/\/api(\/\d+)?\/userSettings(\.json)?(\?|$)/, async route => {
        const response = await route.fetch();
        const json = await response.json();
        await route.fulfill({ response, json: { ...json, keyUiLocale: language } });
    });
    await page.route(/\/api(\/\d+)?\/me(\.json)?(\?|$)/, async route => {
        const response = await route.fetch();
        const json = await response.json();
        const settings = json.settings ? { ...json.settings, keyUiLocale: language } : undefined;
        await route.fulfill({ response, json: settings ? { ...json, settings } : json });
    });
}

test.describe("HIS: translations of the new features", () => {
    for (const language of ["es", "fr"] as const) {
        test(`The new panels and help are translated in ${language}`, async ({
            dataSets,
            search,
            page,
        }) => {
            const texts = panels[language];
            await useLanguage(page, language);

            await dataSets.load();
            await dataSets.select(fixtures.dataSets.small.name);
            await expect(
                page.getByRole("button", { name: new RegExp(texts.orgUnits) })
            ).toBeVisible();

            await search.load();
            await page.locator("#accordion section > button").nth(2).click();
            await expect(search.root.locator("#collapseThree")).toContainText(texts.guide);
        });
    }

    test("In English they keep their texts", async ({ dataSets, page }) => {
        await dataSets.load();
        await dataSets.select(fixtures.dataSets.small.name);
        await expect(page.getByRole("button", { name: /Organisation units/ })).toBeVisible();
    });
});
