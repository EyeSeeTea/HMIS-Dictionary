import { Page } from "@playwright/test";
import { expect, fixtures, test } from "../support/fixtures";
import { Api } from "../support/api";
import { AdminPage, App, readKeyEventually, SearchPage } from "../support/pages";
import { t } from "../support/i18n";

async function submitAndWait(page: Page, click: () => Promise<unknown>) {
    await Promise.all([page.waitForEvent("load"), click()]);
}

async function chooseOther(selector: AdminPage["userGroup"], avoid: string) {
    const labels = await selector.locator("option:not([disabled])").allInnerTexts();
    const label = labels.map(x => x.trim()).find(x => x !== avoid)!;
    await selector.selectOption({ label });
    return label;
}

type Field = {
    title: string;
    key: string;
    input: string;
    submit: string;
    value: unknown;
    effect?: (ctx: { page: Page; api: Api }) => Promise<void>;
};

const uid = "AAAAAAAAAAA";

const fields: Field[] = [
    {
        title: "Blacklist: data element groups",
        key: "blacklist_dataElementGroups",
        input: "selectedDEG",
        submit: "submitDEG",
        value: [uid],
    },
    {
        title: "Blacklist: data sets, takes effect in Data Sets",
        key: "blacklist_dataSets",
        input: "selectedDS",
        submit: "submitDS",
        value: [fixtures.dataSets.small.id],
        effect: async ({ page }) => {
            const app = new App(page);
            await app.open("datasets");
            await page.waitForLoadState("networkidle");
            await expect(
                page.locator("#drpBoxServices option", { hasText: fixtures.dataSets.small.name })
            ).toHaveCount(0);
        },
    },
    {
        title: "Blacklist: indicator groups",
        key: "blacklist_indicatorGroups",
        input: "selectedIG",
        submit: "submitIG",
        value: [uid],
    },
    {
        title: "Blacklist tag text",
        key: "blacklist_tag",
        input: "blTag",
        submit: "submitBL_Tag",
        value: "E2E BL",
    },
    {
        title: "Not in use: indicator groups",
        key: "notInUse_indicatorGroups",
        input: "notInUseIG",
        submit: "submitNIU_IG",
        value: [uid],
    },
    {
        title: "Not in use: program indicator groups",
        key: "notInUse_programIndicatorGroups",
        input: "notInUsePIG",
        submit: "submitNIU_PIG",
        value: [uid],
    },
    {
        title: "Not in use tag text",
        key: "notInUse_tag",
        input: "niuTag",
        submit: "submitNIU_Tag",
        value: "E2E NIU",
    },
    {
        title: "Legacy: data element groups",
        key: "legacy_dataElementGroups",
        input: "selectedLEG_DEG",
        submit: "submitLEG_DEG",
        value: [uid],
    },
    {
        title: "Legacy: option groups",
        key: "legacy_optionGroups",
        input: "selectedLEG_OPG",
        submit: "submitLEG_OPG",
        value: [uid],
    },
];

const inputNames: Record<string, string> = {
    selectedDEG: "DEG_UIDs",
    selectedDS: "DS_UIDs",
    selectedIG: "IG_UIDs",
    blTag: "BL_TAG",
    notInUseIG: "NIU_IG_UIDs",
    notInUsePIG: "NIU_PIG_UIDs",
    niuTag: "NIU_TAG",
    selectedLEG_DEG: "DEG_UIDs",
    selectedLEG_OPG: "DS_UIDs",
};

test.describe("10. Admin", () => {
    test("Services: error when any has no code, or when the set is empty", async ({
        admin,
        api,
    }) => {
        const id = api.uid();
        const setId = api.uid();
        await api.withKeys(["setup_organisationUnitGroupSet"], async () => {
            await api.withMetadata(
                {
                    organisationUnitGroups: [{ id, name: `E2E_${id}`, shortName: `E2E_${id}` }],
                    organisationUnitGroupSets: [
                        {
                            id: setId,
                            name: `E2E_${setId}`,
                            shortName: `E2E_${setId}`,
                            organisationUnitGroups: [{ id }],
                        },
                    ],
                },
                async () => {
                    await api.setKey("setup_organisationUnitGroupSet", {
                        value: setId,
                        object: { id: setId, name: `E2E_${setId}` },
                    });
                    await admin.load();
                    await expect(admin.check("divOUG")).toHaveClass(/alert-danger/);
                    // Restore before the temporary set is deleted.
                    await api.setKey("setup_organisationUnitGroupSet", {
                        value: fixtures.groupSet,
                        object: { id: fixtures.groupSet, name: "HMIS_Dictionary" },
                    });
                }
            );
        });
    });

    test("Attribute: error if missing or only on one", async ({ admin, page, api }) => {
        // The app saves the result of the checks, so the flag is restored afterwards
        await api.withKeys(["setup_dossierConfigComplete"], async () => {
            await page.route(/\/api(\/\d+)?\/attributes(\.json)?(\?|$)/, async route => {
                const response = await route.fetch();
                const json = await response.json();
                json.attributes = json.attributes.map((a: any) =>
                    a.name === "serviceCode" ? { ...a, indicatorGroupAttribute: false } : a
                );
                await route.fulfill({ response, json });
            });
            await admin.load();
            await expect(admin.check("divA")).toHaveClass(/alert-danger/);
        });
    });

    test("Setting the user group works when the key is missing and when it is present, read back through the API", async ({
        admin,
        api,
        page,
    }) => {
        await api.withKeys(["setup_userGroup"], async () => {
            const saved = await api.getKey<any>("setup_userGroup");
            await admin.load();
            const label = await chooseOther(admin.userGroup, saved.object.name);
            await submitAndWait(page, () => admin.submit("submitUG").click());
            await expect
                .poll(async () => (await api.getKey<any>("setup_userGroup"))?.value)
                .toBe(label);

            await api.setKey("setup_userGroup", undefined);
            await admin.load();
            await admin.userGroup.selectOption({ label: saved.object.name });
            await submitAndWait(page, () => admin.submit("submitUG").click());
            await expect
                .poll(async () => (await api.getKey<any>("setup_userGroup"))?.value)
                .toBe(saved.object.name);
        });
    });

    test("Changing to a group the user is not in hides the Admin tab", async ({ admin, api }) => {
        const me = await api.get("me", { fields: "userGroups[id]" });
        const ids = new Set(me.userGroups.map((g: any) => g.id));
        const groups = await api.list<any>("userGroups", { fields: "id,name" });
        const other = groups.find(g => !ids.has(g.id));
        await api.withKeys(["setup_userGroup"], async () => {
            await api.setKey("setup_userGroup", {
                value: other.name,
                object: { id: other.id, name: other.name },
            });
            await admin.open("dossierIndicators");
            await expect(admin.tab("dossierIndicators")).toBeVisible();
            await expect(admin.tab("admin")).toBeHidden();
        });
    });

    test("Setting the group set works when the key is missing and when it is present", async ({
        admin,
        api,
        page,
    }) => {
        await api.withKeys(["setup_organisationUnitGroupSet"], async () => {
            const saved = await api.getKey<any>("setup_organisationUnitGroupSet");
            await admin.load();
            await chooseOther(admin.groupSet, saved.object.name);
            await submitAndWait(page, () => admin.submit("submitOUGS").click());
            await expect
                .poll(async () => (await api.getKey<any>("setup_organisationUnitGroupSet"))?.value)
                .not.toBe(saved.value);

            await api.setKey("setup_organisationUnitGroupSet", undefined);
            await admin.load();
            await admin.groupSet.selectOption({ label: saved.object.name });
            await submitAndWait(page, () => admin.submit("submitOUGS").click());
            await expect
                .poll(async () => (await api.getKey<any>("setup_organisationUnitGroupSet"))?.value)
                .toBe(saved.value);
        });
    });

    test("Changing the group set changes the services in Dossiers", async ({ dossiers, api }) => {
        const sets = await api.list<any>("organisationUnitGroupSets", {
            fields: "id,name,organisationUnitGroups[id,code,displayName]",
        });
        const other = sets.find(
            s =>
                s.id !== fixtures.groupSet &&
                s.organisationUnitGroups.length > 0 &&
                s.organisationUnitGroups.every((g: any) => g.code)
        );
        test.skip(!other, "No other group set whose groups all have a code");
        await api.withKeys(["setup_organisationUnitGroupSet"], async () => {
            await api.setKey("setup_organisationUnitGroupSet", {
                value: other.id,
                object: { id: other.id, name: other.name },
            });
            await dossiers.loadRoute("dossiers");
            expect(new Set(await dossiers.optionLabels())).toEqual(
                new Set(other.organisationUnitGroups.map((g: any) => g.displayName))
            );
        });
    });

    for (const field of fields) {
        test(field.title, async ({ admin, api, page }) => {
            const name = inputNames[field.input]!;
            const input = (a: AdminPage) => {
                const all = a.input(name);
                // Two fields share each of these names; the second one is the legacy field.
                return field.key.startsWith("legacy_") ? all.last() : all.first();
            };
            await api.withKeys([field.key], async () => {
                const saved = await api.getKey(field.key);
                await admin.load();
                if (saved !== undefined)
                    await expect(input(admin)).toHaveValue(JSON.stringify(saved));

                await input(admin).fill(JSON.stringify(field.value));
                await submitAndWait(page, () => admin.submit(field.submit).click());
                await readKeyEventually(api, field.key, field.value);

                await api.setKey(field.key, undefined);
                await admin.load();
                await input(admin).fill(JSON.stringify(field.value));
                await submitAndWait(page, () => admin.submit(field.submit).click());
                await readKeyEventually(api, field.key, field.value);

                if (field.effect) await field.effect({ page, api });
            });
        });
    }

    test("`setup_dossierConfigComplete` becomes true when all checks pass", async ({
        admin,
        api,
    }) => {
        await api.withKeys(["setup_dossierConfigComplete"], async () => {
            await api.setKey("setup_dossierConfigComplete", { value: false });
            await admin.load();
            await expect
                .poll(async () => (await api.getKey<any>("setup_dossierConfigComplete"))?.value, {
                    timeout: 30_000,
                })
                .toBe(true);
        });
    });

    test("Once true, Search shows the service columns", async ({ page, api }) => {
        await api.withKeys(["setup_dossierConfigComplete"], async () => {
            await api.setKey("setup_dossierConfigComplete", { value: true });
            const search = new SearchPage(page);
            await search.load();
            expect(await search.table.headers()).toContain(t("service_name"));
        });
    });
});
