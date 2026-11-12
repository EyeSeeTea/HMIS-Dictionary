import { Page } from "@playwright/test";
import { expect, fixtures, skipWithoutHealthServiceAttribute, test } from "../support/fixtures";
import { Api } from "../support/api";
import { AdminPage, App, readKeyEventually, SearchPage } from "../support/pages";
import { escapeRegex } from "../support/data";
import { t } from "../support/i18n";

async function submitAndWait(page: Page, click: () => Promise<unknown>) {
    await Promise.all([page.waitForEvent("load"), click()]);
}

async function chooseOther(selector: AdminPage["userGroup"], avoid: string) {
    await expect(selector.locator('option:not([value=""])').first()).toBeAttached();
    const count = await selector.locator('option:not([value=""])').count();
    test.skip(count < 2, "Only one option on this instance, so there is no other to choose");
    const labels = await selector.locator('option:not([value=""])').allInnerTexts();
    const label = labels.map(x => x.trim()).find(x => x !== avoid)!;
    await selector.selectOption({ label });
    return label;
}

/** No object has this id. */
const uid = "AAAAAAAAAAA";

type Effect = (ctx: { page: Page; api: Api }) => Promise<void>;

/** The tags, text fields. */
type TextField = {
    title: string;
    key: string;
    input: string;
    submit: string;
    value: string;
};

type NamedRef = { id: string; name: string };

/** The lists of ids, chosen by name: the first object of `model`, unless `pick` says another. */
type IdsField = {
    title: string;
    key: string;
    submit: string;
    model: string;
    pick?: () => NamedRef;
    effect?: Effect;
};

/** The selects of the metadata the app relies on: `metadata_<key>` keys. */
const metadataSelects = [
    { key: "healthServiceAttribute", select: "drpBoxA", submit: "submitA" },
    { key: "advancedUserGroup", select: "drpBoxAdvancedUG", submit: "submitAdvancedUG" },
    { key: "allUsersGroup", select: "drpBoxAllUsersUG", submit: "submitAllUsersUG" },
    { key: "icd10Attribute", select: "drpBoxICD10", submit: "submitICD10" },
    { key: "programResourcesAttribute", select: "drpBoxResources", submit: "submitResources" },
];

const textFields: TextField[] = [
    {
        title: "Blacklist tag text",
        key: "blacklist_tag",
        input: "BL_TAG",
        submit: "submitBL_Tag",
        value: "E2E BL",
    },
    {
        title: "Not in use tag text",
        key: "notInUse_tag",
        input: "NIU_TAG",
        submit: "submitNIU_Tag",
        value: "E2E NIU",
    },
];

const idsFields: IdsField[] = [
    {
        title: "Blacklist: data element groups",
        key: "blacklist_dataElementGroups",
        submit: "submitDEG",
        model: "dataElementGroups",
    },
    {
        title: "Blacklist: data sets, takes effect in Data Sets",
        key: "blacklist_dataSets",
        submit: "submitDS",
        model: "dataSets",
        pick: () => fixtures.dataSets.small,
        effect: async ({ page }) => {
            const app = new App(page);
            await app.open("datasets");
            await page.waitForLoadState("networkidle");
            await expect(
                page.locator("#drpBoxServices option", {
                    // The whole name: others may start with it, as "X (Start Sunday)"
                    hasText: new RegExp(`^\\s*${escapeRegex(fixtures.dataSets.small.name)}\\s*$`),
                })
            ).toHaveCount(0);
        },
    },
    {
        title: "Blacklist: indicator groups",
        key: "blacklist_indicatorGroups",
        submit: "submitIG",
        model: "indicatorGroups",
    },
    {
        title: "Not in use: indicator groups",
        key: "notInUse_indicatorGroups",
        submit: "submitNIU_IG",
        model: "indicatorGroups",
    },
    {
        title: "Not in use: program indicator groups",
        key: "notInUse_programIndicatorGroups",
        submit: "submitNIU_PIG",
        model: "programIndicatorGroups",
    },
    {
        title: "Legacy: data element groups",
        key: "legacy_dataElementGroups",
        submit: "submitLEG_DEG",
        model: "dataElementGroups",
    },
    {
        title: "Legacy: option groups",
        key: "legacy_optionGroups",
        submit: "submitLEG_OPG",
        model: "optionGroups",
    },
];

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
        const chosen = fixtures.healthServiceAttribute;
        // The app saves the result of the checks, so the flag is restored afterwards
        await api.withKeys(["setup_dossierConfigComplete"], async () => {
            await page.route(/\/api(\/\d+)?\/attributes(\.json)?(\?|$)/, async route => {
                const response = await route.fetch();
                const json = await response.json();
                json.attributes = json.attributes.map((a: any) =>
                    a.id === chosen ? { ...a, indicatorGroupAttribute: false } : a
                );
                await route.fulfill({ response, json });
            });
            await admin.load();
            await expect(admin.check("divA")).toHaveClass(/alert-danger/);
        });
    });

    test("Attribute: the check follows the attribute chosen, not one named serviceCode", async ({
        admin,
        api,
    }) => {
        const attributes = await api.list<any>("attributes", {
            fields: "id,dataSetAttribute,indicatorGroupAttribute",
        });
        const other = attributes.find(a => !a.dataSetAttribute && !a.indicatorGroupAttribute);
        test.skip(!other, "No attribute outside data sets and indicator groups");
        await api.withKeys(
            ["metadata_healthServiceAttribute", "setup_dossierConfigComplete"],
            async () => {
                await api.setKey("metadata_healthServiceAttribute", { value: other.id });
                await admin.load();
                await expect(admin.check("divA")).toHaveClass(/alert-danger/);
                // Not among the options (data sets and indicator groups), so shown by id
                await expect(admin.select("drpBoxA")).toHaveValue(other.id);
                await expect(admin.select("drpBoxA").locator("option:checked")).toHaveText(
                    `${other.id} (not found)`
                );
            }
        );
    });

    for (const metadata of metadataSelects) {
        test(`Metadata: ${metadata.key} is saved, read back through the API`, async ({
            admin,
            api,
            page,
        }) => {
            const key = `metadata_${metadata.key}`;
            await api.withKeys([key, "setup_dossierConfigComplete"], async () => {
                await admin.load();
                const select = admin.select(metadata.select);
                const values = await select
                    .locator('option:not([value=""])')
                    .evaluateAll(options => options.map(o => (o as HTMLOptionElement).value));
                const current = await select.inputValue();
                const value = values.find(v => v !== current);
                test.skip(!value, `No other option for ${metadata.key} on this instance`);

                await select.selectOption(value!);
                await submitAndWait(page, () => admin.submit(metadata.submit).click());
                await readKeyEventually(api, key, { value });
                await expect(admin.select(metadata.select)).toHaveValue(value!);
            });
        });
    }

    test("Metadata: None clears a setting, stored as an empty value", async ({
        admin,
        api,
        page,
    }) => {
        const key = "metadata_icd10Attribute";
        await api.withKeys([key], async () => {
            await admin.load();
            await admin.select("drpBoxICD10").selectOption("");
            await submitAndWait(page, () => admin.submit("submitICD10").click());
            await readKeyEventually(api, key, { value: "" });
            await expect(admin.select("drpBoxICD10")).toHaveValue("");
            await expect(admin.submit("submitICD10")).toBeDisabled();
        });
    });

    test("A saved id missing on the instance is shown by id, and can be cleared", async ({
        admin,
        api,
        page,
    }) => {
        const key = "metadata_allUsersGroup";
        await api.withKeys([key], async () => {
            await api.setKey(key, { value: uid });
            await admin.load();
            const select = admin.select("drpBoxAllUsersUG");
            await expect(select).toHaveValue(uid);
            await expect(select.locator("option:checked")).toHaveText(`${uid} (not found)`);
            await select.selectOption("");
            await submitAndWait(page, () => admin.submit("submitAllUsersUG").click());
            await readKeyEventually(api, key, { value: "" });
        });
    });

    test("None clears the group set, and Dossiers is hidden", async ({ admin, api, page }) => {
        await api.withKeys(
            ["setup_organisationUnitGroupSet", "setup_dossierConfigComplete"],
            async () => {
                await admin.load();
                await admin.groupSet.selectOption("");
                await submitAndWait(page, () => admin.submit("submitOUGS").click());
                await readKeyEventually(api, "setup_organisationUnitGroupSet", {});
                await expect(admin.check("divOUGS")).toHaveClass(/alert-danger/);
                await expect(admin.tab("dossiers")).toBeHidden();
            }
        );
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

    for (const field of textFields) {
        test(field.title, async ({ admin, api, page }) => {
            await api.withKeys([field.key], async () => {
                const saved = await api.getKey(field.key);
                await admin.load();
                if (saved !== undefined)
                    await expect(admin.input(field.input)).toHaveValue(JSON.stringify(saved));

                await admin.input(field.input).fill(JSON.stringify(field.value));
                await submitAndWait(page, () => admin.submit(field.submit).click());
                await readKeyEventually(api, field.key, field.value);

                await api.setKey(field.key, undefined);
                await admin.load();
                await admin.input(field.input).fill(JSON.stringify(field.value));
                await submitAndWait(page, () => admin.submit(field.submit).click());
                await readKeyEventually(api, field.key, field.value);
            });
        });
    }

    for (const field of idsFields) {
        test(`${field.title}, chosen by name`, async ({ admin, api, page }) => {
            const [first] = await api.list<NamedRef>(field.model, {
                fields: "id,name",
                order: "name:asc",
                pageSize: 1,
                paging: true,
            });
            const item = field.pick?.() ?? first;
            test.skip(!item, `No ${field.model} on this instance`);
            const ids = admin.ids(field.submit);

            await api.withKeys([field.key], async () => {
                const saved = await api.getKey<string[]>(field.key);
                await admin.load();
                await expect
                    .poll(async () => (await ids.selected()).length)
                    .toBe(saved?.length ?? 0);
                await expect(admin.submit(field.submit)).toBeDisabled();

                await ids.clear();
                await ids.pick(item!.name);
                await submitAndWait(page, () => admin.submit(field.submit).click());
                await readKeyEventually(api, field.key, [item!.id]);
                await admin.load();
                await expect.poll(() => ids.selected()).toEqual([item!.name]);

                await api.setKey(field.key, undefined);
                await admin.load();
                await ids.pick(item!.name);
                await submitAndWait(page, () => admin.submit(field.submit).click());
                await readKeyEventually(api, field.key, [item!.id]);

                if (field.effect) await field.effect({ page, api });
            });
        });
    }

    test("`setup_dossierConfigComplete` becomes true when all checks pass", async ({
        admin,
        api,
    }) => {
        // The checks only pass with health services and the attribute of their codes
        skipWithoutHealthServiceAttribute();
        void fixtures.service.id;
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
