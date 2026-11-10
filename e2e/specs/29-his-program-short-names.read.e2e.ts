import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { headersOf, rowsOf, tableAfter } from "../support/pages";
import { readXlsx } from "../support/xlsx";

const { eventProgram, trackerProgram } = fixtures.programs;
const SHORT = t("dos_ShortNameElement");

async function expectCell(table: any, name: string, shortName: string) {
    const column = (await headersOf(table)).indexOf(SHORT);
    expect(column).toBeGreaterThan(-1);
    const row = rowsOf(table).filter({ hasText: name }).first();
    await expect(row.locator("td").nth(column)).toHaveText(shortName);
}

test.describe("HIS: short names on Programs", () => {
    test("Stage data elements show it", async ({ programs, api }) => {
        const { programStageDataElements } = (
            await api.get(`programs/${eventProgram.id}`, {
                fields: "programStages[programStageDataElements[dataElement[id]]]",
            })
        ).programStages[0];
        const element = await api.get(
            `dataElements/${programStageDataElements[0].dataElement.id}`,
            {
                fields: "displayName,displayShortName",
            }
        );

        await programs.load();
        await programs.select(eventProgram.name);
        await programs.waitIdle();
        const table = programs.stageContainer
            .locator("table")
            .filter({ hasText: element.displayName })
            .first();
        await expectCell(table, element.displayName, element.displayShortName);
    });

    test("Attributes show it", async ({ programs, api }) => {
        const { programTrackedEntityAttributes } = await api.get(`programs/${trackerProgram.id}`, {
            fields: "programTrackedEntityAttributes[trackedEntityAttribute[displayName,displayShortName]]",
        });
        const attribute = programTrackedEntityAttributes[0].trackedEntityAttribute;

        await programs.load();
        await programs.select(trackerProgram.name);
        await expectCell(
            tableAfter(programs.attributesHeading),
            attribute.displayName,
            attribute.displayShortName
        );
    });

    test("The export has it", async ({ programs }) => {
        await programs.load();
        await programs.select(trackerProgram.name);
        await programs.waitIdle();
        const file = await programs.download(() => programs.exportButton.click());
        const sheets = await readXlsx(file.path);
        expect(sheets["Data Elements"]!.headers).toContain(SHORT);
        expect(sheets["Tracked Entity Attributes"]!.headers).toContain(SHORT);
    });
});
