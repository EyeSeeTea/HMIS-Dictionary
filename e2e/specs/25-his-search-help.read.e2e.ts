import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

test.describe("HIS: Search help", () => {
    test("It explains the operators and the DHIS2 terms", async ({ search }) => {
        await search.load();
        await search.togglePanel(t("srch_Help"));
        const help = search.helpPanel;

        for (const operator of ["a b", "a & b", "a | b"]) {
            await expect(help.locator("code", { hasText: operator })).toBeVisible();
        }
        for (const term of [
            "Data Element:",
            "Indicator:",
            "Program Indicator:",
            "Group:",
            "Data Set:",
            "Program:",
        ]) {
            await expect(help.locator("li b", { hasText: term }).first()).toBeVisible();
        }
    });
});
