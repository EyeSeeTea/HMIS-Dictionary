import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { App, mockKeys, SearchPage } from "../support/pages";

const views = [
    {
        name: "search",
        route: "search",
        key: "layoutSettings_search",
        firstRow: "srch_SelectColumns_objBasics",
    },
    {
        name: "datasets",
        route: "datasets",
        key: "layoutSettings_datasets",
        firstRow: "dos_Sections",
    },
    {
        name: "programs",
        route: "dossierPrograms",
        key: "layoutSettings_programs",
        firstRow: "dos_DescriptionOfProgram",
    },
    {
        name: "indicators",
        route: "dossierIndicators",
        key: "layoutSettings_indicators",
        firstRow: "dos_FormulaOfIndicator",
    },
];

async function openSettings(app: App, route: string) {
    await app.open(route);
    await app.waitIdle();
    if (route === "search") {
        await new SearchPage(app.page).table.waitLoaded();
        await new SearchPage(app.page).openColumns();
    }
    await app.settings.open();
}

test.describe("3. Layout settings and access levels", () => {
    test.describe("Settings dialog", () => {
        test("Settings button is visible", async ({ app, page }) => {
            for (const view of views) {
                await app.open(view.route);
                if (view.route === "search") await new SearchPage(page).openColumns();
                await expect(app.settingsButton).toBeVisible();
            }
        });

        test("On Search the button is inside the Select Columns panel, and on the others it is in the page header", async ({
            app,
            page,
            search,
        }) => {
            await search.load();
            await expect(search.settingsButton).toBeHidden();
            await search.openColumns();
            await expect(
                search.columnsPanel.getByRole("button", { name: t("layout_settings") })
            ).toBeVisible();
            for (const view of views.slice(1)) {
                await app.open(view.route);
                await expect(
                    page
                        .locator("#headerDossierPanel")
                        .getByRole("button", { name: t("layout_settings") })
                ).toBeVisible();
            }
        });

        test("Dialog lists sections with their columns, translated", async ({ app, api }) => {
            for (const view of views) {
                await openSettings(app, view.route);
                const stored = await api.getKey<any>(view.key);
                const expected: string[] = [];
                const sorted = (o: Record<string, any>) =>
                    Object.values(o).sort((a: any, b: any) => a.index - b.index) as any[];
                for (const section of sorted(stored.accesses)) {
                    expected.push(t(section.translationKey));
                    for (const column of sorted(section.columns ?? {}))
                        expected.push(t(column.translationKey));
                }
                const labels = await app.settings.rows.locator("td:first-child").allInnerTexts();
                expect(labels.map(label => label.trim()).slice(0, 1)).toEqual([expected[0]]);
                for (const label of expected) expect(labels.map(l => l.trim())).toContain(label);
            }
        });

        test("Dialog shows the stored access for each row, with the admin column always checked and disabled", async ({
            app,
            api,
        }) => {
            for (const view of views) {
                await openSettings(app, view.route);
                const stored = await api.getKey<any>(view.key);
                const section = Object.values<any>(stored.accesses).sort(
                    (a, b) => a.index - b.index
                )[0];
                const row = app.settings.rows.first();
                const [admin, advanced, normal] = [0, 1, 2].map(i =>
                    app.settings.checks(row).nth(i)
                );
                await expect(admin!).toBeChecked();
                await expect(admin!).toBeDisabled();
                expect(await advanced!.isChecked()).toBe(section.access >= 1);
                expect(await normal!.isChecked()).toBe(section.access === 2);
                const count = await app.settings.rows.count();
                for (let i = 0; i < count; i++) {
                    await expect(
                        app.settings.checks(app.settings.rows.nth(i)).first()
                    ).toBeChecked();
                    await expect(
                        app.settings.checks(app.settings.rows.nth(i)).first()
                    ).toBeDisabled();
                }
            }
        });

        test("Restore is disabled with no changes, and undoes the pending changes", async ({
            app,
        }) => {
            for (const view of views) {
                await openSettings(app, view.route);
                const { restore, rows } = app.settings;
                await expect(restore).toBeDisabled();
                const box = app.settings.checks(rows.first()).nth(2);
                const before = await box.isChecked();
                await box.click();
                await expect(restore).toBeEnabled();
                await restore.click();
                expect(await app.settings.checks(rows.first()).nth(2).isChecked()).toBe(before);
                await expect(restore).toBeDisabled();
            }
        });

        test("Close and the X button discard the pending changes", async ({ app, api }) => {
            for (const view of views) {
                const stored = JSON.stringify(await api.getKey(view.key));
                await openSettings(app, view.route);
                await app.settings.checks(app.settings.rows.first()).nth(2).click();
                await app.settings.close.click();
                await expect(app.settings.dialog).toBeHidden();
                await app.settings.open();
                await app.settings.checks(app.settings.rows.nth(1)).nth(2).click();
                await app.settings.closeX.click();
                await expect(app.settings.dialog).toBeHidden();
                expect(JSON.stringify(await api.getKey(view.key))).toEqual(stored);
            }
        });

        test("Advanced groups: a non-JSON-array value shows the format error, with no write", async ({
            app,
            api,
        }) => {
            for (const view of views) {
                const stored = JSON.stringify(await api.getKey(view.key));
                await openSettings(app, view.route);
                await app.settings.groups.fill("not-an-array");
                await app.settings.apply.click();
                await expect(app.settings.formatError).toBeVisible();
                expect(JSON.stringify(await api.getKey(view.key))).toEqual(stored);
            }
        });

        test("Advanced groups: an unknown group shows the group error, with no write", async ({
            app,
            api,
        }) => {
            for (const view of views) {
                const stored = JSON.stringify(await api.getKey(view.key));
                await openSettings(app, view.route);
                await app.settings.groups.fill('["doesNotExis"]');
                await app.settings.apply.click();
                await expect(app.settings.groupError).toBeVisible();
                expect(JSON.stringify(await api.getKey(view.key))).toEqual(stored);
            }
        });

        test("Focusing the field clears the error", async ({ app }) => {
            await openSettings(app, "datasets");
            await app.settings.groups.fill("not-an-array");
            await app.settings.apply.click();
            await expect(app.settings.formatError).toBeVisible();
            await app.settings.groups.blur();
            await app.settings.groups.focus();
            await expect(app.settings.formatError).toBeHidden();
        });

        test("With no stored settings, the module displays with its default access", async ({
            app,
            page,
        }) => {
            for (const view of views) {
                await mockKeys(page, { [view.key]: undefined });
                await app.open(view.route);
                await app.waitIdle();
                await expect(app.tab("search")).toBeVisible();
            }
            const search = new SearchPage(page);
            await search.load();
            expect(await search.table.headers()).toContain(t("object_name"));
        });

        test("Stored settings missing a newer column still show it, on Search and Data Sets", async ({
            page,
            search,
            api,
        }) => {
            const stored = await api.getKey<any>("layoutSettings_search");
            const trimmed = structuredClone(stored);
            delete trimmed.accesses.objectsBasics.columns.shortName;
            await mockKeys(page, { layoutSettings_search: trimmed });
            await search.load();
            expect(await search.table.headers()).toContain(t("object_shortName"));

            const ds = await api.getKey<any>("layoutSettings_datasets");
            const dsTrimmed = structuredClone(ds);
            delete dsTrimmed.accesses.sections.columns.shortName;
            await mockKeys(page, { layoutSettings_datasets: dsTrimmed });
            await search.open("datasets");
            await search.waitIdle();
            await search.settings.open();
            await expect(
                search.settings.rows.filter({ hasText: t("dos_ShortNameElement") })
            ).not.toHaveCount(0);
        });
    });

    test.describe("Access applied", () => {
        test("Stored settings on 8098 give the full-access user every Search column", async ({
            search,
            dataSets,
        }) => {
            await search.load();
            await search.openColumns();
            await search.advancedLink.click();
            for (const key of [
                "object_type",
                "object_name",
                "object_shortName",
                "object_form",
                "object_id",
                "object_code",
                "object_ICD10",
                "object_description",
                "object_num_formula",
                "object_den_formula",
                "object_exp_formula",
                "object_flt_formula",
                "objectGroup_name",
                "objectGroup_id",
                "objectGroup_code",
                "service_name",
                "service_id",
                "service_code",
            ]) {
                await expect(search.columnCheckbox(t(key))).toBeVisible();
            }
            await dataSets.load();
            await expect(dataSets.settingsButton).toBeVisible();
        });
    });
});
