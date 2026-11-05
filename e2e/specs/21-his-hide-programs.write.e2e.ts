import { expect, fixtures, test } from "../support/fixtures";
import { readKeyEventually } from "../support/pages";

const key = "blacklist_programs";

test.describe("HIS: hide programs from the selector", () => {
    test("Admin saves the list, and it takes effect in Programs", async ({
        admin,
        programs,
        api,
    }) => {
        const { ambulances } = fixtures.programs;
        const saved = await api.getKey(key);
        try {
            await admin.load();
            await admin.submitField(
                admin.input("PROGRAM_UIDs"),
                "submitPrograms",
                JSON.stringify([ambulances.id])
            );
            await readKeyEventually(api, key, [ambulances.id]);

            await programs.load();
            await expect.poll(() => programs.optionLabels()).not.toContain(ambulances.name);
        } finally {
            await api.setKey(key, saved);
        }
    });
});
