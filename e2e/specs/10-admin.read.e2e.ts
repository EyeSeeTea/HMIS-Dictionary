import { expect, test } from "../support/fixtures";
import { mockKeys } from "../support/pages";

test.describe("10. Admin", () => {
    test.describe("Page", () => {
        test("The full-access user can open the page @smoke", async ({ admin }) => {
            await admin.load();
            await expect(admin.check("divUG")).toBeVisible();
        });

        test("Information box shows the tested version, languages and a link to the repository", async ({
            admin,
        }) => {
            await admin.load();
            const box = admin.root.locator(".alert-info");
            await expect(box).toContainText(/dhis v?2\.\d+/i);
            await expect(box).toContainText("Spanish");
            await expect(box.getByRole("link")).toHaveAttribute("href", /github\.com\/.*HMIS/i);
        });

        test("Static help and information text is displayed", async ({ admin }) => {
            await admin.load();
            for (const text of [
                "Dossiers configuration check",
                "Details",
                "About dataElements and indicators",
            ]) {
                await expect(admin.root.getByRole("heading", { name: text })).toBeVisible();
            }
        });
    });

    test.describe("Configuration checks", () => {
        test("User group: success when set, with the selector showing the saved group; error when missing", async ({
            admin,
            api,
            page,
        }) => {
            const saved = await api.getKey<any>("setup_userGroup");
            await admin.load();
            await expect(admin.check("divUG")).toHaveClass(/alert-success/);
            await expect(admin.userGroup.locator("option:checked")).toHaveText(saved.object.name);
            await mockKeys(page, { setup_userGroup: undefined });
            await admin.load();
            await expect(admin.check("divUG")).toHaveClass(/alert-danger/);
        });

        test("Group set: success when set, with the selector showing the saved set; error when missing", async ({
            admin,
            api,
            page,
        }) => {
            const saved = await api.getKey<any>("setup_organisationUnitGroupSet");
            await admin.load();
            await expect(admin.check("divOUGS")).toHaveClass(/alert-success/);
            await expect(admin.groupSet.locator("option:checked")).toHaveText(saved.object.name);
            await mockKeys(page, { setup_organisationUnitGroupSet: undefined });
            await admin.load();
            await expect(admin.check("divOUGS")).toHaveClass(/alert-danger/);
        });

        test("Services: success when all have a code", async ({ admin }) => {
            await admin.load();
            await expect(admin.check("divOUG")).toHaveClass(/alert-success/);
        });

        test("Attribute: success with `serviceCode` on data sets and indicator groups", async ({
            admin,
        }) => {
            await admin.load();
            await expect(admin.check("divA")).toHaveClass(/alert-success/);
        });
    });

    test.describe("User group and group set", () => {
        const sorted = (labels: string[]) => {
            const clean = labels.map(label => label.trim().toLowerCase());
            return clean.every((v, i) => i === 0 || clean[i - 1]! <= v);
        };

        test("Both selectors list their options sorted by name", async ({ admin, api }) => {
            await admin.load();
            for (const [selector, resource] of [
                [admin.userGroup, "userGroups"],
                [admin.groupSet, "organisationUnitGroupSets"],
            ] as const) {
                const all = await api.list(resource, { fields: "id" });
                const options = selector.locator("option:not([disabled])");
                await expect(options).toHaveCount(all.length);
                expect(sorted(await options.allInnerTexts()), resource).toBe(true);
            }
        });

        test("Submit buttons are disabled until something is selected", async ({ admin, page }) => {
            await mockKeys(page, {
                setup_userGroup: undefined,
                setup_organisationUnitGroupSet: undefined,
            });
            await admin.load();
            await expect(admin.submit("submitUG")).toHaveClass(/disabled/);
            await expect(admin.submit("submitOUGS")).toHaveClass(/disabled/);
            await admin.userGroup.selectOption({ index: 1 });
            await expect(admin.submit("submitUG")).not.toHaveClass(/disabled/);
            await admin.groupSet.selectOption({ index: 1 });
            await expect(admin.submit("submitOUGS")).not.toHaveClass(/disabled/);
        });
    });
});
