import { config } from "../support/data";
import { expect, test } from "../support/fixtures";

const DE_GROUPS = "Data Element Groups";
const PROGRAM = "Program";

test.describe("HIS: data element group and program columns", () => {
    test("A data element shows its groups", async ({ search, api }) => {
        const { blacklistDEG } = await config(api);
        const elements = await api.list("dataElements", {
            fields: "id,dataElementGroups[id,displayName]",
            filter: "domainType:eq:AGGREGATE",
        });
        const element = elements.find(
            (e: any) =>
                e.dataElementGroups.length > 0 &&
                !e.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id))
        );
        await search.load();
        await search.showColumn(DE_GROUPS);
        await search.filterById(element.id);

        const cell = await search.table.cell(0, DE_GROUPS);
        for (const group of element.dataElementGroups) {
            await expect(cell).toContainText(group.displayName);
        }
    });

    test("A program indicator shows its program", async ({ search, api }) => {
        const [programIndicator] = await api.list("programIndicators", {
            fields: "id,program[displayName]",
            pageSize: 1,
            paging: true,
        });
        await search.load();
        await search.showColumn(PROGRAM);
        await search.filterById(programIndicator.id);
        await expect(await search.table.cell(0, PROGRAM)).toHaveText(
            programIndicator.program.displayName
        );
    });

    test("The new columns are hidden by default, and the group column stays", async ({
        search,
    }) => {
        await search.load();
        const headers = await search.table.headers();
        expect(headers).not.toContain(DE_GROUPS);
        expect(headers).not.toContain(PROGRAM);

        await search.openColumns();
        await expect(search.columnCheckbox(DE_GROUPS)).toBeVisible();
        await expect(search.columnCheckbox(PROGRAM)).toBeVisible();
    });

    test("A column filter works on them", async ({ search, api }) => {
        const [programIndicator] = await api.list("programIndicators", {
            fields: "program[displayName]",
            pageSize: 1,
            paging: true,
        });
        const name = programIndicator.program.displayName;
        await search.load();
        await search.showColumn(PROGRAM);
        await search.table.filter(PROGRAM, name);
        await expect(await search.table.cell(0, PROGRAM)).toContainText(name);
    });
});
