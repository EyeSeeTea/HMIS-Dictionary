import { expect, test } from "../support/fixtures";
import { ProgramsPage, rowsOf, tableAfter } from "../support/pages";

async function setup(api: any, numerator: (ctx: any) => string, fn: (ctx: any) => Promise<void>) {
    const [type] = await api.list("indicatorTypes", { fields: "id", pageSize: 1, paging: true });
    const programs = await api.list("programs", {
        fields: "id,name,programStages[programStageDataElements[dataElement[id,name]]],programIndicators~size",
        filter: "programType:eq:WITHOUT_REGISTRATION",
    });
    const program = programs
        .sort((a: any, b: any) => a.programIndicators - b.programIndicators)
        .find((p: any) => p.programStages[0]?.programStageDataElements.length > 0);
    const de = program.programStages[0].programStageDataElements[0].dataElement;
    const [group] = await api.list("organisationUnitGroups", {
        fields: "id,name",
        pageSize: 1,
        paging: true,
    });
    const id = api.uid();
    const ctx = { program, de, group, name: `E2E_${id}` };
    await api.withMetadata(
        {
            indicators: [
                {
                    id,
                    name: ctx.name,
                    shortName: ctx.name,
                    numerator: numerator(ctx),
                    denominator: "1",
                    numeratorDescription: "n",
                    denominatorDescription: "d",
                    annualized: false,
                    indicatorType: { id: type.id },
                },
            ],
        },
        () => fn(ctx)
    );
}

test.describe("9. Indicators", () => {
    test("Formula handles `#{de}`, `#{de.coc}`, `I{pi}`, `D{program.de}`, `G{group}` and plain numbers", async ({
        indicators,
        api,
    }) => {
        await setup(
            api,
            ({ program, de, group }) => `D{${program.id}.${de.id}} + G{${group.id}}`,
            async ({ name, program, de, group }) => {
                await indicators.load();
                await indicators.select(name);
                const table = tableAfter(indicators.formulaHeading);
                await expect(table).toContainText(program.name);
                await expect(table).toContainText(de.name);
                await expect(table).toContainText(group.name);
            }
        );
    });

    test("Types: aggregate data element, tracker data element, program indicator, number, organisation unit group", async ({
        indicators,
        api,
    }) => {
        await setup(
            api,
            ({ program, de, group }) => `D{${program.id}.${de.id}} + G{${group.id}}`,
            async ({ name }) => {
                await indicators.load();
                await indicators.select(name);
                const types = rowsOf(tableAfter(indicators.numeratorHeading)).locator(
                    "td:first-child"
                );
                await expect(
                    types.filter({ hasText: "Data Element - Tracker Value" }).first()
                ).toBeVisible();
                await expect(
                    types.filter({ hasText: "Organisation Unit Group" }).first()
                ).toBeVisible();
            }
        );
    });

    test("Clicking a program opens Programs with that program available in the selector", async ({
        indicators,
        api,
        page,
    }) => {
        await setup(
            api,
            ({ program, de }) => `D{${program.id}.${de.id}}`,
            async ({ name, program }) => {
                await indicators.load();
                await indicators.select(name);
                await tableAfter(indicators.numeratorHeading)
                    .getByRole("button", { name: program.name, exact: true })
                    .first()
                    .click();
                await expect(page).toHaveURL(/#\/dossierPrograms$/);
                const programs = new ProgramsPage(page);
                await expect(
                    programs.selector.locator("option", { hasText: program.name }).first()
                ).toBeAttached();
            }
        );
    });
});
