import { expect, test } from "../support/fixtures";
import { readKeyEventually } from "../support/pages";

const key = "selector_limitToUserOrgUnits";

test.describe("HIS: limit the selectors to the org units of the user", () => {
    test("Admin can turn it on and off", async ({ admin, api }) => {
        const saved = await api.getKey(key);
        try {
            await admin.load();
            const box = admin.root.locator('[data-test="limit-org-units"] input');
            await expect(box).not.toBeChecked();

            await box.click({ force: true });
            await readKeyEventually(api, key, { value: true });
            await admin.load();
            await expect(box).toBeChecked();

            await box.click({ force: true });
            await readKeyEventually(api, key, { value: false });
        } finally {
            await api.setKey(key, saved);
        }
    });
});
