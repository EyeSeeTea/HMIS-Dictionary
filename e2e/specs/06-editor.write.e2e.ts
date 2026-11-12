import { expect, fixtures, test } from "../support/fixtures";
import { Api } from "../support/api";
import { DossiersPage } from "../support/pages";

const svc = fixtures.service;
/** Read inside the tests, so they skip on instances without a service. */
const path = () => `organisationUnitGroups/${svc.id}`;

const getTranslations = async (api: Api) =>
    (await api.get(path(), { fields: "translations" })).translations as any[];
const description = (list: any[], locale: string) =>
    list.find(x => x.locale === locale && x.property === "DESCRIPTION")?.value as
        | string
        | undefined;

/** Runs a test and restores the service's translations afterwards. */
async function preserving(api: Api, fn: (saved: any[]) => Promise<void>) {
    const saved = await getTranslations(api);
    try {
        await fn(saved);
    } finally {
        await api.put(`${path()}/translations`, { translations: saved });
    }
}

async function openEditor(dossiers: DossiersPage, language = "EN") {
    await dossiers.loadRoute("dossiers");
    await dossiers.select(svc.name);
    await dossiers.openEditor();
    if (language !== "EN") {
        await dossiers.languageSelector.selectOption({ label: language });
        await dossiers.waitForEditorReady();
    }
}

test.describe("6. Dossiers - editor", () => {
    test.beforeEach(() => {
        // Skips without a service with data sets and indicator groups
        void svc.id;
    });

    test("Save button turns to warning state on edit, and success state after saving", async ({
        dossiers,
        api,
    }) => {
        await preserving(api, async () => {
            await openEditor(dossiers);
            await dossiers.editor.type("E2E state check");
            await expect(dossiers.saveButton).toHaveClass(/btn-warning/);
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
        });
    });

    test("The description is saved under the selected locale, read back through the API", async ({
        dossiers,
        api,
    }) => {
        await preserving(api, async saved => {
            await openEditor(dossiers, "FR");
            await dossiers.editor.type("E2E texte en francais");
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
            const list = await getTranslations(api);
            expect(description(list, "fr")).toContain("E2E texte en francais");
            expect(description(list, "en")).toBe(description(saved, "en"));
        });
    });

    test("Saved text appears in the reader after a reload, for a user in that language", async ({
        dossiers,
        api,
    }) => {
        await preserving(api, async () => {
            await openEditor(dossiers, "ES");
            await dossiers.editor.type("E2E texto guardado");
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
            await api.withLocale("es", async () => {
                const { translations } = await api.get(path(), { fields: "translations" });
                const name =
                    translations.find((x: any) => x.locale === "es" && x.property === "NAME")
                        ?.value ?? svc.name;
                await dossiers.loadRoute("dossiers");
                await dossiers.selector
                    .selectOption({ label: name })
                    .catch(() => dossiers.selector.selectOption({ label: svc.name }));
                await dossiers.waitIdle();
                await expect(dossiers.description).toContainText("E2E texto guardado");
            });
        });
    });

    test("Saving Arabic text works", async ({ dossiers, api }) => {
        await preserving(api, async () => {
            await openEditor(dossiers, "AR");
            await dossiers.editor.type("نص اختبار");
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
            expect(description(await getTranslations(api), "ar")).toContain("نص اختبار");
        });
    });

    test("Saving one locale keeps the other locales and the non-description translations, such as NAME", async ({
        dossiers,
        api,
    }) => {
        await preserving(api, async saved => {
            await openEditor(dossiers);
            await dossiers.editor.type("E2E keep others");
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
            const list = await getTranslations(api);
            const others = (l: any[]) =>
                l
                    .filter(x => !(x.locale === "en" && x.property === "DESCRIPTION"))
                    .map(x => `${x.locale}/${x.property}/${x.value}`)
                    .sort();
            expect(others(list)).toEqual(others(saved));
        });
    });

    test("Saving empty content removes that locale's description only", async ({
        dossiers,
        api,
    }) => {
        await preserving(api, async saved => {
            await openEditor(dossiers, "PT");
            await dossiers.editor.clear();
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
            const list = await getTranslations(api);
            expect(description(list, "pt")).toBeUndefined();
            expect(description(list, "es")).toBe(description(saved, "es"));
        });
    });

    test("HTML formatting survives a save and reload, including a table and a list", async ({
        dossiers,
        api,
    }) => {
        await preserving(api, async saved => {
            const html =
                "<h2>E2E title</h2><ul><li>one</li></ul><table><tbody><tr><td>cell</td></tr></tbody></table>";
            await api.put(`${path()}/translations`, {
                translations: saved
                    .filter(x => !(x.locale === "en" && x.property === "DESCRIPTION"))
                    .concat({ locale: "en", property: "DESCRIPTION", value: html }),
            });
            await openEditor(dossiers);
            await expect(dossiers.editor.body.locator("li")).toHaveText("one");
            await expect(dossiers.editor.body.locator("td")).toHaveText("cell");
            await dossiers.saveButton.click();
            await expect(dossiers.saveButton).toHaveClass(/btn-success/);
            const value = description(await getTranslations(api), "en")!;
            expect(value).toContain("<li>one</li>");
            expect(value).toContain("<table");
            await dossiers.loadRoute("dossiers");
            await dossiers.select(svc.name);
            await expect(dossiers.description.locator("h2")).toHaveText("E2E title");
            await expect(dossiers.description.locator("td")).toHaveText("cell");
        });
    });

    test("Failed save does not show the success state", async ({ dossiers, page }) => {
        await openEditor(dossiers);
        await dossiers.editor.type("E2E failed save");
        await page.route(/\/api(\/\d+)?\/organisationUnitGroups\/.*\/translations/, route =>
            route.request().method() === "GET"
                ? route.continue()
                : route.fulfill({ status: 500, json: {} })
        );
        await dossiers.saveButton.click();
        await expect(dossiers.saveButton).not.toHaveClass(/btn-success/);
    });
});
