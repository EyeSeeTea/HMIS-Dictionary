import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { rowsOf, tableAfter } from "../support/pages";

const { eventProgram } = fixtures.programs;

async function eventResources(api: any, programId: string) {
    const filter = `program.id:eq:${programId}`;
    const fields = "id,displayName,displayDescription";
    return {
        charts: await api.list("eventCharts", { fields, filter }),
        reports: await api.list("eventReports", { fields, filter }),
    };
}

test.describe("HIS: event reports and charts by program", () => {
    test("A program lists its own, with count and table of contents entry", async ({
        programs,
        api,
    }) => {
        const { charts, reports } = await eventResources(api, eventProgram.id);
        const total = charts.length + reports.length;
        expect(total).toBeGreaterThan(0);

        await programs.load();
        await programs.select(eventProgram.name);
        await expect(programs.resourcesHeading).toBeVisible();
        await expect(programs.pageText).toContainText(`${t("dos_ResourcesNumber")}: ${total}`);
        await expect(rowsOf(tableAfter(programs.resourcesHeading))).toHaveCount(total);
        await expect(programs.tocLink("Program Resources")).toBeVisible();
    });

    test("Each one has its type, description and link to the right app", async ({
        programs,
        api,
    }) => {
        const { charts, reports } = await eventResources(api, eventProgram.id);
        await programs.load();
        await programs.select(eventProgram.name);
        const rows = rowsOf(tableAfter(programs.resourcesHeading));

        const cases: [any, string, string][] = [
            [charts[0], "Event Charts", "dhis-web-event-visualizer"],
            [reports[0], "Event Reports", "dhis-web-event-reports"],
        ];
        for (const [item, type, path] of cases) {
            const link = rows.locator(`a[href*="${item.id}"]`);
            const row = rows.filter({ has: programs.page.locator(`a[href*="${item.id}"]`) });
            await expect(row).toContainText(type);
            if (item.displayDescription) await expect(row).toContainText(item.displayDescription);
            expect(await link.getAttribute("href")).toContain(path);
        }
    });

    test("Another program lists only its own", async ({ programs, api }) => {
        const { otherProgram } = fixtures.programs;
        const { charts, reports } = await eventResources(api, otherProgram.id);
        const own = await eventResources(api, eventProgram.id);
        await programs.load();
        await programs.select(otherProgram.name);

        const rows = rowsOf(tableAfter(programs.resourcesHeading));
        await expect(rows).toHaveCount(charts.length + reports.length);
        await expect(rows.locator(`a[href*="${own.charts[0].id}"]`)).toHaveCount(0);
    });

    test("A long list scrolls on screen, and is printed in full", async ({ programs, page }) => {
        await programs.load();
        await programs.select(fixtures.programs.manyResourcesProgram.name);
        const scrollBox = programs.resourcesHeading
            .locator("xpath=following::table[1]/ancestor::div[contains(@class, 'scroll')]")
            .first();
        const height = () => scrollBox.evaluate(element => element.clientHeight);

        await expect(programs.resourcesHeading).toBeVisible();
        await expect.poll(height).toBeLessThanOrEqual(420);
        await page.emulateMedia({ media: "print" });
        await expect.poll(height).toBeGreaterThan(420);
    });
});
