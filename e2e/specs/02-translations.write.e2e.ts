import { expect, fixtures, test } from "../support/fixtures";
import { env } from "../support/env";
import { t } from "../support/i18n";
import { App, ProgramsPage, SearchPage } from "../support/pages";
import { readXlsx } from "../support/xlsx";

const tabKeys = [
    "idx_Search",
    "idx_Dossiers",
    "idx_Programs",
    "idx_DataSets",
    "idx_Indicators",
    "idx_Admin",
];

async function expectTabs(app: App, language: string) {
    await app.open("dossierIndicators");
    await expect(app.tabs).toHaveText(tabKeys.map(key => t(key, language)));
}

test.describe("2. Translations", () => {
    test("For each of en, es, fr, pt, ar: side tabs and each module's labels are in that language", async ({
        app,
        api,
        page,
    }) => {
        for (const language of ["en", "es", "fr", "pt", "ar"]) {
            await api.withLocale(language, async () => {
                await expectTabs(app, language);
                await app.open("search");
                await expect(page.locator("#accordion")).toContainText(
                    t("srch_SelectColumns", language)
                );
                await app.open("dossiers");
                await expect(page.locator("#headerDossierPanel")).toContainText(
                    t("dos_Dossiers", language)
                );
                await app.open("dossierPrograms");
                await expect(page.locator("#headerDossierPanel")).toContainText(
                    t("dos_Programs", language)
                );
                await app.open("datasets");
                await expect(page.locator("#headerDossierPanel")).toContainText(
                    t("idx_DataSets", language)
                );
                await app.open("dossierIndicators");
                await expect(page.locator("#headerDossierPanel")).toContainText(
                    t("dos_Indicators", language)
                );
                await app.open("admin");
                await expect(page.locator("#headerPanel")).toContainText(t("idx_Admin", language));
            });
        }
    });

    test("Regional locale (`pt_BR`, `es_419`, `ar_EG`) resolves to its base language", async ({
        app,
        api,
    }) => {
        for (const [locale, language] of [
            ["pt_BR", "pt"],
            ["es_419", "es"],
            ["ar_EG", "ar"],
        ] as const) {
            await api.withLocale(locale, () => expectTabs(app, language));
        }
    });

    test("Unsupported locale (`ru`) falls back to English", async ({ app, api }) => {
        await api.withLocale("ru", () => expectTabs(app, "en"));
    });

    test("User with no language setting uses the system default", async ({ app, api }) => {
        const { keyUiLocale } = await api
            .get("systemSettings", { key: "keyUiLocale" })
            .catch(() => ({ keyUiLocale: "en" }));
        await api.withLocale(undefined, () => expectTabs(app, (keyUiLocale ?? "en").split("_")[0]));
    });

    test("Labels missing in a language display the English text", async ({ app, api, page }) => {
        // `layout_settings` is in English but not in Spanish.
        expect(t("layout_settings", "es")).toBe(t("layout_settings", "en"));
        await api.withLocale("es", async () => {
            await app.open("datasets");
            await expect(page.locator("#headerDossierPanel")).toContainText(
                t("layout_settings", "en")
            );
        });
    });

    test("Metadata names and descriptions follow the user's language, checked on Dossiers", async ({
        api,
        browser,
    }) => {
        const { translations } = await api.get(`organisationUnitGroups/${fixtures.service.id}`, {
            fields: "translations",
        });
        const translated = translations.find(
            (x: any) => x.locale === "es" && x.property === "NAME"
        );
        const description = translations.find(
            (x: any) => x.locale === "es" && x.property === "DESCRIPTION"
        );
        test.skip(!translated && !description, "The chosen service has no Spanish translations");
        await api.withLocale(
            "es",
            async () => {
                // DHIS2 reads the metadata language at login, so this needs a new session.
                const context = await browser.newContext({
                    storageState: { cookies: [], origins: [] },
                });
                await context.request.post(`${env.dhis2Url}/api/auth/login`, {
                    data: { username: env.username, password: env.password },
                });
                const page = await context.newPage();
                const app = new App(page);
                await app.open("dossiers");
                await page.waitForLoadState("networkidle");
                const label = translated?.value ?? fixtures.service.name;
                await page.locator("#drpBoxServices").selectOption({ label });
                await expect(page.locator("#DossierTitleContainer h1")).toHaveText(label);
                if (description) {
                    const start = description.value
                        .replace(/<[^>]+>/g, " ")
                        .trim()
                        .split("&")[0]
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .join(" ");
                    await expect(page.locator("#dossierDescription")).toContainText(start);
                }
                await context.close();
            },
            "es"
        );
    });

    test('Arabic sets `dir="rtl"` on the document, and aligns the page content to the right', async ({
        app,
        api,
        page,
    }) => {
        await api.withLocale("ar", async () => {
            await app.open("dossierIndicators");
            await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
            const box = await page
                .locator("#headerDossierPanel h1")
                .first()
                .evaluate(heading => {
                    const range = document.createRange();
                    range.selectNodeContents(heading);
                    return range.getBoundingClientRect().x;
                });
            expect(box).toBeGreaterThan(page.viewportSize()!.width / 2);
        });
    });

    test('Other languages set `dir="ltr"`', async ({ app, api, page }) => {
        for (const language of ["en", "es", "fr", "pt"]) {
            await api.withLocale(language, async () => {
                await app.open("dossierIndicators");
                await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
            });
        }
    });

    test("Search help text is translated, with its formatting", async ({ api, page }) => {
        await api.withLocale("es", async () => {
            const search = new SearchPage(page);
            await search.load();
            await search.togglePanel(t("srch_Help", "es"));
            const firstWords = t("srch_Help_Text", "es")
                .replace(/<[^>]+>/g, " ")
                .trim()
                .split(/\s+/)
                .slice(0, 3)
                .join(" ");
            await expect(search.helpPanel).toContainText(firstWords);
            await expect(search.helpPanel.locator("b").first()).toBeVisible();
        });
    });

    test("Excel export headers are translated, on Search and Programs", async ({ api, page }) => {
        await api.withLocale("es", async () => {
            const search = new SearchPage(page);
            await search.load();
            await search.table.filter(t("object_name", "es"), "Measles");
            await expect(search.table.rows.first()).toBeVisible();
            const exportLabel = (key: string) => page.getByRole("button", { name: t(key, "es") });
            const file = await search.download(() => exportLabel("srch_exportToExcel").click());
            const sheet = (await readXlsx(file.path))["Search Data"]!;
            expect(sheet.headers).toContain(t("object_name", "es"));

            const programs = new ProgramsPage(page);
            await programs.load();
            await programs.select(fixtures.programs.boat.name);
            const programFile = await programs.download(() =>
                exportLabel("dos_exportToExcel").click()
            );
            const programSheets = await readXlsx(programFile.path);
            expect(programSheets["Data Elements"]!.headers).toContain(t("dos_Stage", "es"));
        });
    });
});
