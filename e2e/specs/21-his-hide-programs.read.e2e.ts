import { expect, fixtures, test } from "../support/fixtures";
import { mockKeys } from "../support/pages";

const { eventProgram, otherProgram } = fixtures.programs;

test.describe("HIS: hide programs from the selector", () => {
    test("A blacklisted program is not listed, and the others are", async ({ programs, page }) => {
        await mockKeys(page, { blacklist_programs: [eventProgram.id] });
        await programs.load();
        const labels = await programs.optionLabels();
        expect(labels).not.toContain(eventProgram.name);
        expect(labels).toContain(otherProgram.name);
    });

    test("Without the setting, every program is listed", async ({ programs, page }) => {
        await mockKeys(page, { blacklist_programs: undefined });
        await programs.load();
        expect(await programs.optionLabels()).toContain(eventProgram.name);
    });
});
