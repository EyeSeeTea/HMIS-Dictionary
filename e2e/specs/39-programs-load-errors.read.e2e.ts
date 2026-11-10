import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";

const { otherProgram } = fixtures.programs;

test.describe("Programs: load errors", () => {
    test("A failed request is listed, instead of its sections disappearing", async ({
        programs,
        page,
    }) => {
        await page.route(/\/api(\/\d+)?\/programRules(\.json)?\?/, route =>
            route.fulfill({ status: 500, json: { message: "Broken on purpose" } })
        );

        await programs.load();
        await programs.select(otherProgram.name);

        const errors = page.locator('[data-test="load-errors"]');
        await expect(errors).toContainText(t("dos_ProgramRules"));
        await expect(programs.title).toBeVisible();
    });

    test("A response that cannot be mapped is listed, and the other sections still load", async ({
        programs,
        page,
    }) => {
        await page.route(/\/api(\/\d+)?\/programRuleVariables(\.json)?\?/, route =>
            route.fulfill({ json: { programRuleVariables: null } })
        );

        await programs.load();
        await programs.select(otherProgram.name);

        const errors = page.locator('[data-test="load-errors"]');
        await expect(errors).toContainText(t("dos_ProgramRuleVariables"));
        await expect(errors).not.toContainText(t("dos_ProgramRules") + ":");
        await expect(programs.stages.first()).toBeVisible();
    });
});
