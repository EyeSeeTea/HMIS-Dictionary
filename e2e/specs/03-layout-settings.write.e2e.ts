import { expect, test } from "../support/fixtures";
import { App, SearchPage } from "../support/pages";

const views = [
    { route: "search", key: "layoutSettings_search" },
    { route: "datasets", key: "layoutSettings_datasets" },
    { route: "dossierPrograms", key: "layoutSettings_programs" },
    { route: "dossierIndicators", key: "layoutSettings_indicators" },
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
    test("Apply saves to `layoutSettings_<view>` and reloads", async ({ app, api }) => {
        for (const view of views) {
            await api.withKeys([view.key], async () => {
                const before = await api.getKey<any>(view.key);
                await openSettings(app, view.route);
                const box = app.settings.checks(app.settings.rows.nth(1)).nth(2);
                const wasChecked = await box.isChecked();
                await box.click();
                await Promise.all([app.page.waitForEvent("load"), app.settings.apply.click()]);
                await expect
                    .poll(async () => JSON.stringify(await api.getKey(view.key)))
                    .not.toEqual(JSON.stringify(before));
                await app.waitIdle();
                await openSettingsAfterReload(app, view.route);
                expect(await app.settings.checks(app.settings.rows.nth(1)).nth(2).isChecked()).toBe(
                    !wasChecked
                );
            });
        }
    });

    test("Apply with no changes reloads, with the stored value unchanged", async ({ app, api }) => {
        for (const view of views) {
            const stored = JSON.stringify(await api.getKey(view.key));
            await openSettings(app, view.route);
            await Promise.all([app.page.waitForEvent("load"), app.settings.apply.click()]);
            expect(JSON.stringify(await api.getKey(view.key))).toEqual(stored);
        }
    });

    test("Advanced groups: a valid group is saved", async ({ app, api }) => {
        const [group] = await api.list("userGroups", { fields: "id", pageSize: 1, paging: true });
        for (const view of views) {
            await api.withKeys([view.key], async () => {
                await openSettings(app, view.route);
                await app.settings.groups.fill(JSON.stringify([group.id]));
                await Promise.all([app.page.waitForEvent("load"), app.settings.apply.click()]);
                await expect
                    .poll(async () => (await api.getKey<any>(view.key)).advancedUserGroups)
                    .toEqual([group.id]);
            });
        }
    });
});

async function openSettingsAfterReload(app: App, route: string) {
    if (route === "search") {
        await new SearchPage(app.page).table.waitLoaded();
        await new SearchPage(app.page).openColumns();
    }
    await app.settings.open();
}
