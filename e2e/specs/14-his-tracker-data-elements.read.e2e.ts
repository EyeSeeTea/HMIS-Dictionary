import { expect, test } from "../support/fixtures";
import { config } from "../support/data";
import { t } from "../support/i18n";

const COLUMNS = { type: t("object_type"), group: t("objectGroup_name") };

/** A tracker data element used by a program, in no blacklisted group. */
async function trackerElement(api: any) {
    const { blacklistDEG } = await config(api);
    const elements = await api.list("dataElements", {
        fields: "id,displayName,dataElementGroups[id]",
        filter: "domainType:eq:TRACKER",
    });
    const programs = await api.list("programs", {
        fields: "displayName,programStages[programStageDataElements[dataElement[id]]]",
    });
    const programsOf = (id: string): string[] =>
        programs
            .filter((program: any) =>
                program.programStages.some((stage: any) =>
                    stage.programStageDataElements.some((e: any) => e.dataElement.id === id)
                )
            )
            .map((program: any) => program.displayName);
    const element = elements.find(
        (e: any) =>
            programsOf(e.id).length > 0 &&
            !e.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id))
    );

    return { element, programs: programsOf(element.id) };
}

test.describe("HIS: tracker data elements in Search", () => {
    test("They are found, with their own type and their programs as the group", async ({
        search,
        api,
    }) => {
        const { element, programs } = await trackerElement(api);
        await search.load();
        await search.showColumn(COLUMNS.group);
        await search.filterById(element.id);

        await expect(search.table.rows).toHaveCount(1);
        await expect(await search.table.cell(0, COLUMNS.type)).toHaveText("dataElement (tracker)");
        const group = await search.table.cell(0, COLUMNS.group);
        for (const program of programs) await expect(group).toContainText(program);
    });

    test("The type filter tells them apart from aggregate ones", async ({ search }) => {
        await search.load();
        await search.table.filter(COLUMNS.type, "tracker");
        await expect(search.table.rows.first()).toContainText("dataElement (tracker)");
    });

    test("Aggregate data elements keep their type", async ({ search, api }) => {
        const { blacklistDEG } = await config(api);
        const aggregate = await api.list("dataElements", {
            fields: "id,dataElementGroups[id]",
            filter: "domainType:eq:AGGREGATE",
        });
        const element = aggregate.find(
            (e: any) => !e.dataElementGroups.some((g: any) => blacklistDEG.includes(g.id))
        );
        await search.load();
        await search.filterById(element.id);
        await expect(await search.table.cell(0, COLUMNS.type)).toHaveText("dataElement");
    });
});
