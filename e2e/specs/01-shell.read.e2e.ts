import { expect, fixtures, test } from "../support/fixtures";
import { env } from "../support/env";
import { t } from "../support/i18n";
import { App, mockKeys, tabIds } from "../support/pages";

const moduleHeading: Record<string, string> = {
    dossiers: t("dos_Dossiers"),
    dossierPrograms: t("dos_Programs"),
    datasets: t("idx_DataSets"),
    dossierIndicators: t("dos_Indicators"),
    admin: t("idx_Admin"),
};

const missingKeys = (keys: string[]) => Object.fromEntries(keys.map(key => [key, undefined]));

test.describe("1. App shell and navigation", () => {
    test.describe("Loading and session", () => {
        test("The app loads inside the Global Shell, at its app path @smoke", async ({ page }) => {
            await page.goto(env.shellUrl);
            const frame = page.frameLocator("iframe").first();
            await expect(frame.locator("#menu-container li#search")).toBeVisible({
                timeout: 120_000,
            });
            await expect(new App(page, frame).tab(tabIds.search)).toBeVisible();
        });

        test("The app loads standalone, at its direct URL @smoke", async ({ app, page }) => {
            await app.open("search");
            await expect(app.tab(tabIds.search)).toBeVisible();
            expect(page.url()).toContain(env.baseUrl);
            expect(page.frames()).toHaveLength(1);
        });

        test('The app appears in the DHIS2 app list as "HMIS Dictionary", with its icon', async ({
            api,
        }) => {
            const apps = await api.get<any[]>("apps");
            const app = apps.find(a => a.name === "HMIS Dictionary");
            expect(app, "installed app").toBeTruthy();
            expect(app.icons?.["48"]).toBeTruthy();
        });

        test("Without a session, opening the app leads to the login page", async ({ browser }) => {
            const context = await browser.newContext({
                storageState: { cookies: [], origins: [] },
            });
            const page = await context.newPage();
            await page.goto(env.baseUrl);
            await expect(page).toHaveURL(/login/i, { timeout: 60_000 });
            await context.close();
        });

        test("If the session expires, switching module leads to the login page", async ({
            app,
            page,
            context,
        }) => {
            test.fixme(
                true,
                "Baseline problem P1: on v42 the ping gets a 401, so the app never reloads"
            );
            await app.open("dossierIndicators");
            await expect(app.tab(tabIds.search)).toBeVisible();
            await context.clearCookies();
            await app.tabLink(tabIds.search).click();
            await expect(page).toHaveURL(/login/i, { timeout: 60_000 });
        });
    });

    test.describe("Navigation", () => {
        test("Opening the app with no hash redirects to `#/search`", async ({ page }) => {
            await page.goto(env.baseUrl);
            await expect(page).toHaveURL(/#\/search$/);
        });

        test("An unknown route redirects to `#/search`", async ({ app, page }) => {
            await app.open("does-not-exist");
            await expect(page).toHaveURL(/#\/search$/);
        });

        test("Deep links work: `#/search`, `#/dossiers`, `#/dossiers/editor`, `#/dossierPrograms`, `#/datasets`, `#/dossierIndicators`, `#/admin`", async ({
            app,
            page,
        }) => {
            await app.open("search");
            await expect(page.locator("#searchTable")).toBeVisible();
            for (const [route, heading] of [
                ["dossiers", moduleHeading.dossiers],
                ["dossiers/editor", moduleHeading.dossiers],
                ["dossierPrograms", moduleHeading.dossierPrograms],
                ["datasets", moduleHeading.datasets],
                ["dossierIndicators", moduleHeading.dossierIndicators],
                ["admin", moduleHeading.admin],
            ]) {
                await app.open(route!);
                await page.reload();
                await expect(page).toHaveURL(new RegExp(`#/${route}$`));
                await expect(
                    page.getByRole("heading", { name: heading, exact: true }).first()
                ).toBeVisible();
            }
        });

        test("Clicking each side tab shows its module, updates the URL and marks the tab as active", async ({
            app,
            page,
        }) => {
            await app.open("search");
            for (const id of [
                tabIds.dossiers,
                tabIds.programs,
                tabIds.dataSets,
                tabIds.indicators,
                tabIds.admin,
            ]) {
                await app.tabLink(id).click();
                await expect(page).toHaveURL(new RegExp(`#/${id}$`));
                await expect(
                    page.getByRole("heading", { name: moduleHeading[id], exact: true }).first()
                ).toBeVisible();
                await expect(app.tab(id)).toHaveClass(/active/);
            }
            await app.tabLink(tabIds.search).click();
            await expect(page).toHaveURL(/#\/search$/);
            await expect(page.locator("#searchTable")).toBeVisible();
            await expect(app.tab(tabIds.search)).toHaveClass(/active/);
        });

        test("Browser back and forward move between modules", async ({ app, page }) => {
            await app.open("dossierIndicators");
            await app.tabLink(tabIds.dataSets).click();
            await expect(page).toHaveURL(/#\/datasets$/);
            await expect(
                page.getByRole("heading", { name: moduleHeading.datasets, exact: true })
            ).toBeVisible();
            await app.waitIdle();
            await app.tabLink(tabIds.admin).click();
            await expect(page).toHaveURL(/#\/admin$/);
            await expect(
                page.getByRole("heading", { name: moduleHeading.admin, exact: true })
            ).toBeVisible();
            await app.waitIdle();
            // Going back while a module is still loading can leave the previous module on screen (P7).
            await page.waitForLoadState("networkidle");
            await page.goBack();
            await expect(page).toHaveURL(/#\/datasets$/);
            await expect(
                page.getByRole("heading", { name: moduleHeading.datasets, exact: true })
            ).toBeVisible();
            await page.goForward();
            await expect(page).toHaveURL(/#\/admin$/);
            await expect(
                page.getByRole("heading", { name: moduleHeading.admin, exact: true })
            ).toBeVisible();
        });

        test("Reloading keeps the current module", async ({ app, page }) => {
            await app.open("datasets");
            await page.reload();
            await expect(page).toHaveURL(/#\/datasets$/);
            await expect(
                page.getByRole("heading", { name: moduleHeading.datasets, exact: true })
            ).toBeVisible();
        });

        test("Tabs appear in order: Search, Dossiers, Programs, Data Sets, Indicators, Admin", async ({
            app,
        }) => {
            await app.open("dossierIndicators");
            await expect(app.tabs).toHaveText(
                [
                    "idx_Search",
                    "idx_Dossiers",
                    "idx_Programs",
                    "idx_DataSets",
                    "idx_Indicators",
                    "idx_Admin",
                ].map(key => t(key))
            );
        });
    });

    test.describe("Header", () => {
        test('Page title is "Metadata Dictionary"', async ({ app, page }) => {
            await app.open("dossierIndicators");
            await expect(page).toHaveTitle("Metadata Dictionary");
        });

        test("Standalone: header shows the title, and clicking it goes to the DHIS2 home page", async ({
            app,
            page,
        }) => {
            await app.open("dossierIndicators");
            const title = app.header.getByText("Metadata Dictionary");
            await expect(title).toBeVisible();
            await title.click();
            await expect(page).not.toHaveURL(/HMIS-Dictionary/, { timeout: 60_000 });
            expect(page.url()).toContain(env.dhis2Url);
        });

        test("Inside the Global Shell: only one header is displayed, and the floating print button replaces the header one", async ({
            page,
        }) => {
            await page.goto(env.shellUrl);
            const frame = page.frameLocator("iframe").first();
            await expect(frame.locator("#menu-container")).toBeVisible({ timeout: 120_000 });
            await expect(frame.locator("#header")).toBeHidden();
            await expect(frame.locator(".printButton:visible")).toHaveCount(1);
        });
    });

    test.describe("Tab visibility", () => {
        test("Dossiers tab is shown only when `setup_organisationUnitGroupSet` has a value", async ({
            app,
            page,
        }) => {
            await app.open("dossierIndicators");
            await expect(app.tab(tabIds.dossiers)).toBeVisible();
            await mockKeys(page, { setup_organisationUnitGroupSet: undefined });
            await page.reload();
            await expect(app.tab(tabIds.indicators)).toBeVisible();
            await expect(app.tab(tabIds.dossiers)).toHaveCount(0);
        });

        test("Admin tab is shown to the full-access user", async ({ app }) => {
            await app.open("dossierIndicators");
            await expect(app.tab(tabIds.admin)).toBeVisible();
        });

        test("Admin tab is shown when `setup_userGroup` does not exist", async ({ app, page }) => {
            await mockKeys(page, { setup_userGroup: undefined });
            await app.open("dossierIndicators");
            await expect(app.tab(tabIds.admin)).toBeVisible();
        });
    });

    test.describe("Missing configuration", () => {
        for (const keys of [
            ["setup_userGroup", "setup_organisationUnitGroupSet", "setup_dossierConfigComplete"],
            [
                "blacklist_dataElementGroups",
                "blacklist_dataSets",
                "blacklist_indicatorGroups",
                "blacklist_tag",
            ],
            ["notInUse_indicatorGroups", "notInUse_programIndicatorGroups", "notInUse_tag"],
            ["legacy_dataElementGroups", "legacy_optionGroups"],
        ]) {
            test(keys.map(key => `\`${key}\``).join(", "), async ({ page, search }) => {
                for (const key of keys) {
                    await page.unrouteAll();
                    await mockKeys(page, { [key]: undefined });
                    // With the service set missing, the flag must be off too, or Search crashes (P5).
                    if (key === "setup_organisationUnitGroupSet") {
                        await mockKeys(page, { setup_dossierConfigComplete: { value: false } });
                    }
                    await search.load();
                    await expect(search.tab(tabIds.search)).toBeVisible();
                }
            });
        }

        test("App loads with the whole `HMIS_Dictionary` namespace missing", async ({
            page,
            search,
        }) => {
            await page.route(/\/api(\/\d+)?\/dataStore\/HMIS_Dictionary(\/.*)?$/, route =>
                route.request().method() === "GET"
                    ? route.fulfill({ status: 404, json: { httpStatusCode: 404 } })
                    : route.fulfill({ status: 201, json: { status: "OK" } })
            );
            await search.load();
            await expect(search.tab(tabIds.dossiers)).toHaveCount(0);
            await expect(search.tab(tabIds.admin)).toBeVisible();
        });
    });

    test.describe("Loading indicator and print", () => {
        test("Loading indicator appears with its message, then disappears", async ({
            search,
            page,
        }) => {
            // Slow down one request, so the indicator is visible for long enough to check it.
            await page.route(/\/api(\/\d+)?\/dataElements/, async route => {
                await new Promise(resolve => setTimeout(resolve, 2_000));
                await route.continue();
            });
            await search.open("search");
            await expect(search.loading).toBeVisible();
            await expect(search.loading).toContainText(
                new RegExp(`${t("load_loading")}|${t("load_dataElements")}`)
            );
            await search.table.waitLoaded();
            await expect(search.loading).toBeHidden();
        });

        test("Print button is disabled while a selection loads, and enabled once it has loaded, on Dossiers, Programs, Data Sets and Indicators", async ({
            dossiers,
            programs,
            dataSets,
            indicators,
            api,
        }) => {
            const indicator = await api.get(`indicators/${fixtures.nestedIndicator.id}`, {
                fields: "name",
            });
            await dossiers.loadRoute("dossiers");
            await expect(dossiers.printButton).toBeDisabled();
            await dossiers.select(fixtures.service.name);
            await expect(dossiers.printButton).toBeEnabled();

            await programs.load();
            await programs.select(fixtures.programs.ambulances.name);
            await expect(programs.printButton).toBeEnabled();

            await dataSets.load();
            await dataSets.select(fixtures.dataSets.small.name);
            await expect(dataSets.printButton).toBeEnabled();

            await indicators.load();
            await indicators.select(indicator.name);
            await expect(indicators.printButton).toBeEnabled();
        });

        test("Print button calls `window.print` (stubbed)", async ({ dataSets }) => {
            await dataSets.stubPrint();
            await dataSets.load();
            await dataSets.select(fixtures.dataSets.small.name);
            await dataSets.printButton.click();
            expect(await dataSets.printCalls()).toBe(1);
        });

        test("Print media hides the header, side menu, selector panel and edit button, on each module", async ({
            page,
            dossiers,
            programs,
            dataSets,
            indicators,
        }) => {
            const expectHidden = async (app: App) => {
                await page.emulateMedia({ media: "print" });
                await expect(app.header).toBeHidden();
                await expect(page.locator("#menu-container")).toBeHidden();
                await expect(page.locator("#headerDossierPanel")).toBeHidden();
                await page.emulateMedia({ media: "screen" });
            };
            await dossiers.loadRoute("dossiers");
            await dossiers.select(fixtures.service.name);
            await expect(dossiers.editButton).toBeVisible();
            await expectHidden(dossiers);
            await page.emulateMedia({ media: "print" });
            await expect(dossiers.editButton).toBeHidden();
            await page.emulateMedia({ media: "screen" });
            await programs.load();
            await expectHidden(programs);
            await dataSets.load();
            await expectHidden(dataSets);
            await indicators.load();
            await expectHidden(indicators);
        });

        test('Print media hides the "Back to Top" links', async ({ page, dossiers }) => {
            await dossiers.loadRoute("dossiers");
            await dossiers.select(fixtures.service.name);
            const link = page.getByRole("link", { name: t("dos_BackToTop") }).first();
            await expect(link).toBeVisible();
            await page.emulateMedia({ media: "print" });
            await expect(link).toBeHidden();
        });
    });

    test.describe("Help icons", () => {
        test("Help icons show their text on the headers and columns of Search, Programs, Data Sets and Indicators", async ({
            page,
            search,
            programs,
            dataSets,
            indicators,
            api,
        }) => {
            const help = page.locator("span[title]:has(svg)");
            const expectHelp = async () => {
                await expect(help.first()).toBeAttached();
                expect((await help.first().getAttribute("title"))?.trim()).toBeTruthy();
            };
            await search.load();
            await search.openColumns();
            await expectHelp();
            await programs.load();
            await programs.select(fixtures.programs.ambulances.name);
            await expectHelp();
            await dataSets.load();
            await dataSets.select(fixtures.dataSets.small.name);
            await expectHelp();
            const indicator = await api.get(`indicators/${fixtures.nestedIndicator.id}`, {
                fields: "name",
            });
            await indicators.load();
            await indicators.select(indicator.name);
            await expectHelp();
        });
    });
});
