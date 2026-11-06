import { Locator } from "@playwright/test";
import { expect, fixtures, test } from "../support/fixtures";
import { allIndicators, config } from "../support/data";
import { t } from "../support/i18n";
import { headersOf, mockKeys, ProgramsPage, rowsOf, tableAfter } from "../support/pages";
import { readXlsx } from "../support/xlsx";

const { ambulances, boat, eCare, mentalGroup } = fixtures.programs;

const programFields =
    "id,displayName,displayDescription,programType,programStages[id,displayName,repeatable,sortOrder,description,programStageSections[id,displayName,dataElements[id]],programStageDataElements[compulsory,dataElement[id,displayName,optionSet[id],dataElementGroups[id]]]],programTrackedEntityAttributes~size";

const getProgram = (api: any, id: string) => api.get(`programs/${id}`, { fields: programFields });

async function select(programs: ProgramsPage, label: string) {
    await programs.load();
    await programs.select(label);
}

const tableHeaders = (keys: string[]) => keys.map(key => t(key));

async function rowWith(table: Locator, text: string) {
    return rowsOf(table).filter({ hasText: text }).first();
}

/** Programs with fewer program indicators load faster, so they are preferred. */
async function programsBySize(api: any) {
    const all = await api.list("programs", { fields: "id,displayName,programIndicators~size" });
    return all.sort((a: any, b: any) => a.programIndicators - b.programIndicators);
}

test.describe("7. Programs", () => {
    test.describe("Selector and general", () => {
        test("Counter shows the number of programs, sorted by name in the selector @smoke", async ({
            programs,
            api,
        }) => {
            const all = await api.list("programs", { fields: "displayName" });
            await programs.load();
            await expect(programs.pageText).toContainText(
                `${t("dos_NumberOfPrograms")}: ${all.length}`
            );
            const labels = await programs.optionLabels();
            expect(new Set(labels)).toEqual(new Set(all.map((p: any) => p.displayName)));
            expect(labels).toEqual(
                [...labels].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
            );
        });

        test("Nothing is displayed before selecting a program", async ({ programs }) => {
            await programs.load();
            await expect(programs.title).toHaveCount(0);
            await expect(programs.toc).toHaveCount(0);
            await expect(programs.exportButton).toHaveCount(0);
        });

        test("Selecting a program shows its title, export button and table of contents", async ({
            programs,
        }) => {
            await select(programs, ambulances.name);
            await expect(programs.title).toHaveText(ambulances.name);
            await expect(programs.exportButton).toBeVisible();
            await expect(programs.toc.locator("a").first()).toBeVisible();
        });

        test("HTML description is rendered, with its table of contents entry", async ({
            programs,
            api,
        }) => {
            const program = await getProgram(api, ambulances.id);
            await select(programs, ambulances.name);
            await expect(programs.tocLink(t("dos_DescriptionOfProgram"))).toBeVisible();
            const start = program.displayDescription
                .replace(/<[^>]+>/g, " ")
                .trim()
                .split("&")[0]
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .join(" ");
            const block = programs.root.locator("#DossierTextTitleContainer");
            await expect(block).toContainText(start);
            await expect(block).not.toContainText("</");
        });

        test("Program with no description has no description block or entry", async ({
            programs,
        }) => {
            await select(programs, boat.name);
            await expect(programs.tocLink(t("dos_DescriptionOfProgram"))).toHaveCount(0);
            await expect(programs.heading(t("dos_DescriptionOfProgram"))).toHaveCount(0);
        });

        test("Table of contents order: description, attributes, stages, program indicators, indicators, rules, resources", async ({
            programs,
            api,
        }) => {
            const program = await getProgram(api, mentalGroup.id);
            await select(programs, mentalGroup.name);
            const stageEntry = `Stage: ${program.programStages[0].displayName}`;
            await expect.poll(() => programs.tocEntries()).toContain(t("dos_ProgramRules"));
            const entries = await programs.tocEntries();
            const order = [
                t("dos_DescriptionOfProgram"),
                "Tracked Entity Attributes",
                stageEntry,
                "Program indicators",
                "Program Rules",
            ]
                .map(name => entries.findIndex(e => e.startsWith(name)))
                .filter(i => i >= 0);
            expect(order.length).toBeGreaterThanOrEqual(4);
            expect(order).toEqual([...order].sort((a, b) => a - b));
        });

        test("Each table of contents link scrolls to its target", async ({ programs, api }) => {
            const program = await getProgram(api, ambulances.id);
            await select(programs, ambulances.name);
            const stage = program.programStages[0];
            const section = stage.programStageSections[0];
            await programs.expectTocScrolls([
                [t("dos_ProgramRules"), programs.rulesHeading],
                [section.displayName, programs.root.locator(`h3[id="${section.id}"]`)],
                [
                    new RegExp(`Stage: ${stage.displayName}`),
                    programs.root.locator(`h2[id="${stage.id}"]`),
                ],
                [
                    t("dos_DescriptionOfProgram"),
                    programs.root.locator("#DossierTextTitleContainer"),
                ],
            ]);
        });

        test('"Go to index" links scroll to the top', async ({ programs }) => {
            await select(programs, ambulances.name);
            await programs.expectGoToIndexScrolls();
        });

        test("Switching program replaces all content, with no duplicated table of contents entries", async ({
            programs,
            api,
        }) => {
            const second = await getProgram(api, boat.id);
            await select(programs, ambulances.name);
            await programs.select(boat.name);
            await expect(programs.stages).toHaveCount(second.programStages.length);
            await expect(programs.rulesHeading).toBeHidden();
            await expect(programs.tocLink(t("dos_ProgramRules"))).toHaveCount(0);
            const entries = await programs.tocEntries();
            expect(entries.length).toBe(new Set(entries).size);
        });

        test("Switching program quickly shows only the last selected program's data", async ({
            programs,
            api,
        }) => {
            const last = await getProgram(api, boat.id);
            await programs.load();
            await programs.selector.selectOption({ label: mentalGroup.name });
            await programs.selector.selectOption({ label: ambulances.name });
            await programs.selector.selectOption({ label: boat.name });
            await expect(programs.title).toHaveText(boat.name);
            await programs.waitIdle();
            await expect(programs.stages).toHaveCount(last.programStages.length);
            await expect(programs.stages.first()).toContainText(last.programStages[0].displayName);
            await expect(programs.rulesHeading).toBeHidden();
        });

        test("Leaving the module while loading does not break the next module", async ({
            programs,
            page,
        }) => {
            await programs.load();
            await programs.selector.selectOption({ label: ambulances.name });
            await programs.tabLink("datasets").click();
            await expect(page).toHaveURL(/#\/datasets$/);
            await expect(programs.selector.locator("option").nth(2)).toBeAttached();
            await programs.waitIdle();
        });
    });

    test.describe("Stages", () => {
        test("Stages follow `sortOrder`", async ({ programs, api }) => {
            const [program] = (await programsBySize(api)).filter(
                (p: any) => p.programIndicators < 200
            );
            const all = await Promise.all(
                (await programsBySize(api)).map((p: any) => getProgram(api, p.id))
            );
            const multi = all.find(
                (p: any) => p.programStages.length > 1 && p.programStages.length < 4
            );
            expect(program).toBeTruthy();
            await select(programs, multi.displayName);
            const expected = [...multi.programStages]
                .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                .map((s: any) => s.displayName);
            await expect(programs.stages).toHaveCount(expected.length);
            const titles = (await programs.stages.allInnerTexts()).map(x => x.trim());
            expected.forEach((name, i) => expect(titles[i]).toContain(name));
        });

        test('Table of contents shows "Stage: X", plus "(Repeatable)" for repeatable stages, with sections as children', async ({
            programs,
            api,
        }) => {
            const program = await getProgram(api, mentalGroup.id);
            const stage = program.programStages[0];
            expect(stage.repeatable).toBe(true);
            await select(programs, mentalGroup.name);
            await expect(
                programs.tocLink(`Stage: ${stage.displayName} (Repeatable)`)
            ).toBeVisible();
            await expect(programs.tocLink(stage.programStageSections[0].displayName)).toBeVisible();
            await select(programs, ambulances.name);
            const other = (await getProgram(api, ambulances.id)).programStages[0];
            await expect(programs.tocLink(`Stage: ${other.displayName}`)).toBeVisible();
        });

        test("Stage descriptions are displayed", async ({ programs, api }) => {
            const all = await api.list<any>("programStages", {
                fields: "displayName,displayDescription,program[displayName],programStageSections[displayDescription]",
            });
            const stage = all.find(
                s => s.displayDescription && !/Patient Register|PMTCT/.test(s.program.displayName)
            );
            test.skip(!stage, "No stage with a description");
            await select(programs, stage.program.displayName);
            await expect(programs.stageContainer).toContainText(
                stage.displayDescription.trim().slice(0, 30)
            );
        });

        test("Stage with sections shows each section, with element count", async ({
            programs,
            api,
        }) => {
            const { programStages } = await getProgram(api, ambulances.id);
            await select(programs, ambulances.name);
            for (const section of programStages[0].programStageSections) {
                const heading = programs.root.locator(`h3[id="${section.id}"]`);
                await expect(heading).toHaveText(section.displayName);
            }
            await expect(programs.stageContainer).toContainText(t("dos_NumberElementsSection"));
        });

        test('Stage with no sections falls back to a "Data Elements" table', async ({
            programs,
        }) => {
            await select(programs, eCare.name);
            const heading = programs.stageContainer.getByRole("heading", {
                name: "Data Elements",
                exact: true,
            });
            await expect(heading).toBeVisible();
            await expect(rowsOf(tableAfter(heading)).first()).toBeVisible();
        });

        test("Columns: name, form name, description, value type, calculation mode, mandatory, visibility, option set", async ({
            programs,
        }) => {
            await select(programs, ambulances.name);
            const table = programs.stageContainer.locator("table").first();
            expect(await headersOf(table)).toEqual(
                tableHeaders([
                    "dos_NameElement",
                    "dos_ShortNameElement",
                    "dos_FormNameElement",
                    "dos_DescriptionElement",
                    "dos_ValueType",
                    "dos_CalculationMode",
                    "dos_Mandatory",
                    "dos_Visibility",
                    "dos_OptionSet",
                ])
            );
        });

        test("Mandatory comes from the stage's data element, with and without sections", async ({
            programs,
            api,
        }) => {
            for (const { id, name } of [ambulances, eCare]) {
                const { programStages } = await getProgram(api, id);
                const element =
                    programStages[0].programStageDataElements.find((e: any) => e.compulsory) ??
                    programStages[0].programStageDataElements[0];
                await select(programs, name);
                const row = await rowWith(programs.stageContainer, element.dataElement.displayName);
                await expect(row.locator("td").nth(6)).toHaveText(String(element.compulsory));
            }
        });

        test("Calculation mode shows default, the program rules that assign the value, or other", async ({
            programs,
            api,
        }) => {
            const rules = await api.list<any>("programRules", {
                fields: "name,program[id,displayName],programRuleActions[programRuleActionType,dataElement[id,displayName]]",
            });
            const sizes = await programsBySize(api);
            const small = new Set(
                sizes.filter((p: any) => p.programIndicators < 200).map((p: any) => p.id)
            );
            const rule = rules.find(
                r =>
                    small.has(r.program.id) &&
                    r.programRuleActions.some(
                        (a: any) => a.programRuleActionType === "ASSIGN" && a.dataElement
                    )
            );
            test.skip(!rule, "No ASSIGN rule on a data element");
            const action = rule.programRuleActions.find(
                (a: any) => a.programRuleActionType === "ASSIGN" && a.dataElement
            );
            await select(programs, rule.program.displayName);
            const row = await rowWith(programs.stageContainer, action.dataElement.displayName);
            await expect(row.locator("td").nth(5)).toContainText(rule.name);
            await expect(
                programs.stageContainer.locator("tbody tr td:nth-child(5)").first()
            ).not.toBeEmpty();
        });

        test("Attributes: Visibility shows the rules hiding the attribute (P10)", async ({
            programs,
            api,
        }) => {
            const rules = await api.list<any>("programRules", {
                fields: "name,program[displayName],programRuleActions[programRuleActionType,trackedEntityAttribute[displayName]]",
            });
            const rule = rules.find(r =>
                r.programRuleActions.some(
                    (a: any) => a.programRuleActionType === "HIDEFIELD" && a.trackedEntityAttribute
                )
            );
            test.skip(!rule, "No HIDEFIELD rule on an attribute");
            const { displayName } = rule.programRuleActions.find(
                (a: any) => a.programRuleActionType === "HIDEFIELD" && a.trackedEntityAttribute
            ).trackedEntityAttribute;
            await select(programs, rule.program.displayName);
            const row = rowsOf(tableAfter(programs.attributesHeading))
                .filter({
                    has: programs.page.getByRole("cell", { name: displayName, exact: true }),
                })
                .first();
            await expect(row).toContainText(`HIDEFIELD: ${rule.name}`);
        });

        test("Program indicators and indicators have different ids (P9)", async ({ programs }) => {
            await select(programs, ambulances.name);
            await expect(programs.page.locator("#programIndicators")).toHaveCount(1);
            expect(await programs.page.locator("[id='indicators']").count()).toBeLessThan(2);
        });

        test("Visibility shows the rules hiding the field or section", async ({
            programs,
            api,
        }) => {
            const rules = await api.list<any>("programRules", {
                fields: "name,program[id,displayName],programRuleActions[programRuleActionType,dataElement[id,displayName]]",
                filter: `program.id:eq:${ambulances.id}`,
            });
            const rule = rules.find(r =>
                r.programRuleActions.some(
                    (a: any) => a.programRuleActionType === "HIDEFIELD" && a.dataElement
                )
            );
            test.skip(!rule, "No HIDEFIELD rule on this program");
            const action = rule.programRuleActions.find(
                (a: any) => a.programRuleActionType === "HIDEFIELD" && a.dataElement
            );
            await select(programs, ambulances.name);
            const row = await rowWith(programs.stageContainer, action.dataElement.displayName);
            await expect(row.locator("td").nth(7)).toContainText(rule.name);
        });

        test("Option set selector lists the options, and is absent when there is none", async ({
            programs,
            api,
        }) => {
            const { programStages } = await getProgram(api, ambulances.id);
            const elements = programStages[0].programStageDataElements;
            const withOptions = elements.find((e: any) => e.dataElement.optionSet);
            const without = elements.find((e: any) => !e.dataElement.optionSet);
            await select(programs, ambulances.name);
            const row = await rowWith(programs.stageContainer, withOptions.dataElement.displayName);
            const options = await api.get(`optionSets/${withOptions.dataElement.optionSet.id}`, {
                fields: "options~size",
            });
            expect(options.options).toBeGreaterThan(0);
            await expect(row.locator("select option").nth(1)).toBeAttached();
            const plain = await rowWith(programs.stageContainer, without.dataElement.displayName);
            await expect(plain.locator("select")).toHaveCount(0);
        });
    });

    test.describe("Legacy elements toggle and blacklist", () => {
        test("Data elements in a blacklisted group are never displayed", async ({
            programs,
            api,
            page,
        }) => {
            const sizes = (await programsBySize(api)).filter((p: any) => p.programIndicators < 200);
            const target = { program: undefined as any, element: undefined as any };
            for (const size of sizes) {
                const program = await getProgram(api, size.id);
                const element = program.programStages
                    .flatMap((s: any) => s.programStageDataElements)
                    .find((e: any) => e.dataElement.dataElementGroups.length > 0);
                if (element) {
                    target.program = program;
                    target.element = element;
                    break;
                }
            }
            test.skip(!target.element, "No program data element in any group");
            // Blacklist a group of this data element, so the scenario does not depend on the real list.
            await mockKeys(page, {
                blacklist_dataElementGroups: [target.element.dataElement.dataElementGroups[0].id],
                legacy_dataElementGroups: [],
            });
            await select(programs, target.program.displayName);
            await expect(programs.stageContainer.locator("table").first()).toBeVisible();
            await expect(
                programs.stageContainer.getByRole("cell", {
                    name: target.element.dataElement.displayName,
                    exact: true,
                })
            ).toHaveCount(0);
            await programs.legacyToggle.check();
            await programs.loadRoute("dossierPrograms");
            await programs.select(target.program.displayName);
            await expect(
                programs.stageContainer.getByRole("cell", {
                    name: target.element.dataElement.displayName,
                    exact: true,
                })
            ).toHaveCount(0);
        });

        test("Data elements in a legacy group are hidden by default, and shown with the toggle", async ({
            programs,
            api,
            page,
        }) => {
            const sizes = (await programsBySize(api)).filter((p: any) => p.programIndicators < 200);
            let target: any;
            for (const size of sizes) {
                const program = await getProgram(api, size.id);
                const element = program.programStages
                    .flatMap((s: any) => s.programStageDataElements)
                    .find((e: any) => e.dataElement.dataElementGroups.length > 0);
                if (element) {
                    target = { program, element };
                    break;
                }
            }
            test.skip(!target, "No program data element in any group");
            await mockKeys(page, {
                blacklist_dataElementGroups: [],
                legacy_dataElementGroups: target.element.dataElement.dataElementGroups.map(
                    (g: any) => g.id
                ),
            });
            const name = target.element.dataElement.displayName;
            await select(programs, target.program.displayName);
            await expect(programs.stageContainer.locator("table").first()).toBeVisible();
            await expect(
                programs.stageContainer.getByRole("cell", { name, exact: true })
            ).toHaveCount(0);
            await programs.legacyToggle.check();
            await programs.loadRoute("dossierPrograms");
            await programs.select(target.program.displayName);
            await expect(
                programs.stageContainer.getByRole("cell", { name, exact: true }).first()
            ).toBeVisible();
        });

        test("Options in a legacy group are hidden by default, and shown with the toggle", async ({
            programs,
            api,
            page,
        }) => {
            const groups = await api.list<any>("optionGroups", {
                fields: "id,options[id,displayName]",
            });
            const sizes = (await programsBySize(api)).filter((p: any) => p.programIndicators < 200);
            let target: any;
            for (const size of sizes) {
                const { displayName, programStages } = await api.get(`programs/${size.id}`, {
                    fields: "displayName,programStages[programStageDataElements[dataElement[displayName,optionSet[id,options[id,displayName]]]]]",
                });
                for (const { dataElement } of programStages.flatMap(
                    (s: any) => s.programStageDataElements
                )) {
                    const ids = (dataElement.optionSet?.options ?? []).map((o: any) => o.id);
                    const group = groups.find(g => g.options.some((o: any) => ids.includes(o.id)));
                    if (ids.length > 1 && group) {
                        target = { displayName, dataElement, group, ids };
                        break;
                    }
                }
                if (target) break;
            }
            test.skip(!target, "No option group with options of a small program");
            const { dataElement: element, group, ids, displayName: programName } = target;
            const option = group.options.find((o: any) => ids.includes(o.id));
            await mockKeys(page, { legacy_optionGroups: [group.id] });
            await select(programs, programName);
            const row = await rowWith(programs.stageContainer, element.displayName);
            await expect(
                row.locator("option", { hasText: new RegExp(`^${option.displayName}$`) })
            ).toHaveCount(0);
            await programs.legacyToggle.check();
            await programs.loadRoute("dossierPrograms");
            await programs.select(programName);
            const again = await rowWith(programs.stageContainer, element.displayName);
            await expect(
                again.locator("option", { hasText: option.displayName }).first()
            ).toBeAttached();
        });

        test("Turning on the toggle with a program selected applies it", async ({
            programs,
            page,
        }) => {
            await select(programs, ambulances.name);
            await programs.legacyToggle.check();
            await page.waitForLoadState("load");
            await expect(programs.legacyToggle).toBeChecked();
        });

        test("The toggle stays on after a reload in the same session", async ({
            programs,
            page,
        }) => {
            await programs.load();
            await programs.legacyToggle.check();
            await page.reload();
            await expect(programs.legacyToggle).toBeChecked();
        });

        test("The toggle is off in a new session", async ({ programs, page }) => {
            await programs.load();
            await programs.legacyToggle.check();
            await page.close();
            const fresh = new ProgramsPage(await page.context().newPage());
            await fresh.load();
            await expect(fresh.legacyToggle).not.toBeChecked();
        });
    });

    test.describe("Tracked entity attributes", () => {
        test("Table is displayed for tracker programs, with its count, and absent for event programs", async ({
            programs,
            api,
        }) => {
            const program = await getProgram(api, mentalGroup.id);
            await select(programs, mentalGroup.name);
            await expect(programs.attributesHeading).toBeVisible();
            await expect(programs.pageText).toContainText(
                `${t("dos_TrackedEntityAttributesNumber")}: ${program.programTrackedEntityAttributes}`
            );
            await expect(rowsOf(tableAfter(programs.attributesHeading))).toHaveCount(
                program.programTrackedEntityAttributes
            );
            await select(programs, ambulances.name);
            await expect(programs.attributesHeading).toBeHidden();
        });

        test("Columns: name, short name, form name, description, value type, aggregation type, mandatory, visibility, option set", async ({
            programs,
        }) => {
            await select(programs, mentalGroup.name);
            expect(await headersOf(tableAfter(programs.attributesHeading))).toEqual(
                tableHeaders([
                    "dos_NameElement",
                    "dos_ShortNameElement",
                    "dos_FormNameElement",
                    "dos_DescriptionElement",
                    "dos_ValueType",
                    "dos_AggregationType",
                    "dos_Mandatory",
                    "dos_Visibility",
                    "dos_OptionSet",
                ])
            );
        });

        test("Legacy options are hidden unless the toggle is on", async ({
            programs,
            api,
            page,
        }) => {
            const all = await api.list<any>("programs", {
                fields: "id,displayName,programIndicators~size,programTrackedEntityAttributes[trackedEntityAttribute[displayName,optionSet[options[id,displayName]]]]",
            });
            const program = all
                .filter(p => p.programIndicators < 200)
                .find(p =>
                    p.programTrackedEntityAttributes.some(
                        (a: any) => a.trackedEntityAttribute.optionSet?.options.length > 1
                    )
                );
            test.skip(!program, "No attribute with options");
            const attribute = program.programTrackedEntityAttributes.find(
                (a: any) => a.trackedEntityAttribute.optionSet?.options.length > 1
            ).trackedEntityAttribute;
            const groups = await api.list<any>("optionGroups", {
                fields: "id,options[id,displayName]",
            });
            const ids = attribute.optionSet.options.map((o: any) => o.id);
            const group = groups.find(g => g.options.some((o: any) => ids.includes(o.id)));
            test.skip(!group, "No option group with these options");
            const option = group.options.find((o: any) => ids.includes(o.id));
            await mockKeys(page, { legacy_optionGroups: [group.id] });
            await select(programs, program.displayName);
            const table = tableAfter(programs.attributesHeading);
            const row = await rowWith(table, attribute.displayName);
            await expect(
                row.locator("option", { hasText: new RegExp(`^${option.displayName}$`) })
            ).toHaveCount(0);
            await programs.legacyToggle.check();
            await programs.loadRoute("dossierPrograms");
            await programs.select(program.displayName);
            const again = await rowWith(
                tableAfter(programs.attributesHeading),
                attribute.displayName
            );
            await expect(
                again.locator("option", { hasText: option.displayName }).first()
            ).toBeAttached();
        });
    });

    test.describe("Program indicators", () => {
        const piFields =
            "programIndicators[id,displayName,expression,filter,programIndicatorGroups[id]]";

        test("Table lists the program's indicators, sorted by name, with its count", async ({
            programs,
            api,
        }) => {
            const { programIndicators } = await api.get(`programs/${ambulances.id}`, {
                fields: piFields,
            });
            await select(programs, ambulances.name);
            await expect(programs.programIndicatorsHeading).toBeVisible();
            await expect(programs.pageText).toContainText(
                `${t("dos_NumberOfProgramIndicators")}: ${programIndicators.length}`
            );
            const table = tableAfter(programs.programIndicatorsHeading);
            await expect(rowsOf(table)).toHaveCount(programIndicators.length);
            const names = (await rowsOf(table).locator("td:first-child").allInnerTexts()).map(x =>
                x.trim()
            );
            expect(new Set(names)).toEqual(
                new Set(programIndicators.map((p: any) => p.displayName))
            );
            expect(names).toEqual(
                [...names].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
            );
        });

        test("Calculation shows a readable description", async ({ programs, api }) => {
            const { programIndicators } = await api.get(`programs/${ambulances.id}`, {
                fields: piFields,
            });
            const pi = programIndicators.find((p: any) => /#\{/.test(p.expression));
            test.skip(!pi, "No program indicator using data elements");
            await select(programs, ambulances.name);
            const row = await rowWith(
                tableAfter(programs.programIndicatorsHeading),
                pi.displayName
            );
            await expect(row.locator("td").nth(3)).not.toContainText("#{");
            await expect(row.locator("td").nth(3)).not.toBeEmpty();
        });

        test("Columns: name, description, filter, calculation, aggregation type, type, stages referenced, boundaries, visualization", async ({
            programs,
        }) => {
            await select(programs, ambulances.name);
            expect(await headersOf(tableAfter(programs.programIndicatorsHeading))).toEqual(
                tableHeaders([
                    "dos_NameElement",
                    "dos_DescriptionElement",
                    "dos_Filter",
                    "dos_Calculation",
                    "dos_AggregationType",
                    "dos_TypeOfProgramIndicator",
                    "dos_StagesReferenced",
                    "dos_Boundaries",
                    "dos_Visualization",
                ])
            );
        });

        test("Stages referenced lists the right stages, for the expression and for the filter", async ({
            programs,
            api,
        }) => {
            const program = await getProgram(api, ambulances.id);
            const stage = program.programStages[0];
            const { programIndicators } = await api.get(`programs/${ambulances.id}`, {
                fields: piFields,
            });
            const pi = programIndicators.find((p: any) =>
                `${p.expression} ${p.filter}`.includes(`#{${stage.id}`)
            );
            test.skip(!pi, "No program indicator referencing a stage");
            await select(programs, ambulances.name);
            const row = await rowWith(
                tableAfter(programs.programIndicatorsHeading),
                pi.displayName
            );
            await expect(row.locator("td").nth(6)).toContainText(stage.displayName);
        });

        test("Analytics period boundaries are listed", async ({ programs, api }) => {
            const { programIndicators } = await api.get(`programs/${ambulances.id}`, {
                fields: "programIndicators[displayName,analyticsPeriodBoundaries[boundaryTarget,analyticsPeriodBoundaryType]]",
            });
            const pi = programIndicators.find((p: any) => p.analyticsPeriodBoundaries.length > 0);
            test.skip(!pi, "No program indicator with boundaries");
            await select(programs, ambulances.name);
            const row = await rowWith(
                tableAfter(programs.programIndicatorsHeading),
                pi.displayName
            );
            await expect(row.locator("td").nth(7).locator("li").first()).toBeVisible();
        });

        test("Not-in-use program indicators are visible to the full-access user", async ({
            programs,
            api,
        }) => {
            const { notInUsePIG } = await config(api);
            const all = await api.list<any>("programIndicators", {
                fields: "displayName,program[id,displayName],programIndicatorGroups[id]",
                filter: `programIndicatorGroups.id:in:[${notInUsePIG.join(",")}]`,
            });
            const sizes = (await programsBySize(api)).filter((p: any) => p.programIndicators < 200);
            const ids = new Set(sizes.map((p: any) => p.id));
            const pi = all.find(p => ids.has(p.program.id));
            test.skip(!pi, "No not-in-use program indicator on a small program");
            await select(programs, pi.program.displayName);
            await expect(
                rowsOf(tableAfter(programs.programIndicatorsHeading))
                    .filter({ hasText: pi.displayName })
                    .first()
            ).toBeVisible();
        });

        test("Program with no program indicators has no block or entry", async ({ programs }) => {
            await select(programs, boat.name);
            await expect(programs.programIndicatorsHeading).toBeHidden();
            await expect(
                programs.toc.locator("a").filter({ hasText: /Program indicators/i })
            ).toHaveCount(0);
        });
    });

    test.describe("Indicators", () => {
        async function indicatorForProgram(api: any) {
            const indicators = await allIndicators(api);
            const { blacklistIG } = await config(api);
            const visible = indicators.filter(
                i => !i.indicatorGroups.some(g => blacklistIG.includes(g.id))
            );
            const pis = await api.list("programIndicators", {
                fields: "id,program[id,displayName]",
            });
            const sizes = (await programsBySize(api)).filter((p: any) => p.programIndicators < 200);
            const small = new Set(sizes.map((p: any) => p.id));
            for (const pi of pis.filter((p: any) => small.has(p.program.id))) {
                const indicator = visible.find(i =>
                    `${i.numerator}${i.denominator}`.includes(`I{${pi.id}}`)
                );
                if (indicator) return { indicator, program: pi.program };
            }
            return undefined;
        }

        test("Table lists indicators referencing this program through `D{}`, `A{}` or `I{}`, sorted by name", async ({
            programs,
            api,
        }) => {
            const found = await indicatorForProgram(api);
            test.skip(!found, "No indicator referencing a small program");
            await select(programs, found!.program.displayName);
            await expect(programs.indicatorsHeading).toBeVisible();
            const table = tableAfter(programs.indicatorsHeading);
            await expect(
                rowsOf(table).filter({ hasText: found!.indicator.displayName }).first()
            ).toBeVisible();
            const names = (await rowsOf(table).locator("td:first-child").allInnerTexts()).map(x =>
                x.trim()
            );
            expect(names).toEqual(
                [...names].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
            );
        });

        test("Indicators table: blacklisted indicators are excluded, and not-in-use ones are visible", async ({
            programs,
            api,
            page,
        }) => {
            const found = await indicatorForProgram(api);
            test.skip(
                !found || found.indicator.indicatorGroups.length === 0,
                "No grouped indicator referencing a program"
            );
            const group = found!.indicator.indicatorGroups[0]!.id;
            await mockKeys(page, {
                notInUse_indicatorGroups: [group],
                blacklist_indicatorGroups: [],
            });
            await select(programs, found!.program.displayName);
            const rows = rowsOf(tableAfter(programs.indicatorsHeading));
            await expect(
                rows.filter({ hasText: found!.indicator.displayName }).first()
            ).toBeVisible();
            await page.unrouteAll();
            await mockKeys(page, {
                notInUse_indicatorGroups: [],
                blacklist_indicatorGroups: [group],
            });
            await select(programs, found!.program.displayName);
            await expect(
                programs.root
                    .locator("h3#indicators ~ * tbody tr, #indicatorContainer tbody tr")
                    .filter({
                        hasText: found!.indicator.displayName,
                    })
            ).toHaveCount(0);
        });

        test("Columns: name, description, type, numerator, denominator, stages referenced, visualization", async ({
            programs,
            api,
        }) => {
            const found = await indicatorForProgram(api);
            test.skip(!found, "No indicator referencing a small program");
            await select(programs, found!.program.displayName);
            expect(await headersOf(tableAfter(programs.indicatorsHeading))).toEqual(
                tableHeaders([
                    "dos_NameElement",
                    "dos_ShortNameIndicator",
                    "dos_DescriptionElement",
                    "dos_Type",
                    "dos_NumeratorIndicator",
                    "dos_NumeratorIndicatorDescription",
                    "dos_DenominatorIndicator",
                    "dos_DenominatorIndicatorDescription",
                    "dos_StagesReferenced",
                    "dos_Visualization",
                ])
            );
        });

        test("Numerator and denominator show readable descriptions", async ({ programs, api }) => {
            const found = await indicatorForProgram(api);
            test.skip(!found, "No indicator referencing a small program");
            await select(programs, found!.program.displayName);
            const row = rowsOf(tableAfter(programs.indicatorsHeading))
                .filter({ hasText: found!.indicator.displayName })
                .first();
            await expect(row.locator("td").nth(4)).not.toContainText("I{");
            await expect(row.locator("td").nth(6)).not.toContainText("I{");
            await expect(row.locator("td").nth(4)).not.toBeEmpty();
        });

        test("Program with no indicators has no block or entry", async ({ programs }) => {
            await select(programs, boat.name);
            await expect(programs.indicatorsHeading).toBeHidden();
            await expect(
                programs.toc.locator("a").filter({ hasText: /^\s*Indicators\s*$/ })
            ).toHaveCount(0);
        });
    });

    test.describe("Program rules", () => {
        test("Rules table: name, description, stage, condition and actions, with its count", async ({
            programs,
            api,
        }) => {
            const rules = await api.list("programRules", {
                fields: "name",
                filter: `program.id:eq:${ambulances.id}`,
            });
            await select(programs, ambulances.name);
            await expect(programs.rulesHeading).toBeVisible();
            const table = tableAfter(programs.rulesHeading);
            await expect(rowsOf(table)).toHaveCount(rules.length);
            expect(await headersOf(table)).toEqual(
                tableHeaders([
                    "dos_NameElement",
                    "dos_DescriptionElement",
                    "dos_ProgramStage",
                    "dos_Condition",
                    "dos_ProgramRuleActions",
                ])
            );
            await expect(programs.rulesHeading.locator("xpath=following::p[1]")).toContainText(
                String(rules.length)
            );
        });

        const labels = (keys: string[]) => keys.map(key => t(key));
        /** Action type, the property the action must have, and the label that property shows. */
        const scenarios: Array<[string, string, string[]]> = [
            ["ASSIGN", "content", labels(["dos_ProgramRuleVariableAssign"])],
            ["DISPLAYTEXT", "content", labels(["dos_StaticText"])],
            ["DISPLAYTEXT", "location", ["Display Widget"]],
            ["ERRORONCOMPLETE", "content", labels(["dos_StaticText"])],
            ["SHOWERROR", "content", labels(["dos_StaticText"])],
            ["SHOWWARNING", "content", labels(["dos_StaticText"])],
            ["HIDEFIELD", "dataElement", labels(["dos_DataElement"])],
            ["HIDEOPTION", "option", labels(["dos_OptionToHide"])],
            ["HIDEOPTIONGROUP", "optionGroup", labels(["dos_OptionGroupToHide"])],
            ["HIDEPROGRAMSTAGE", "programStage", labels(["dos_OptionstageToHide"])],
            ["HIDESECTION", "programStageSection", labels(["dos_OptionstageSectionToHide"])],
        ];

        async function expectActions(
            programs: ProgramsPage,
            api: any,
            types: Array<[string, string, string[]]>
        ) {
            const rules = await api.list("programRules", {
                fields: "name,program[id,displayName],programRuleActions[programRuleActionType,content,location,dataElement[id],option[id],optionGroup[id],programStage[id],programStageSection[id]]",
            });
            const sizes = await programsBySize(api);
            const order = new Map<string, number>(sizes.map((p: any, i: number) => [p.id, i]));
            for (const [type, property, fields] of types) {
                const rule = rules
                    .filter((r: any) =>
                        r.programRuleActions.some(
                            (a: any) => a.programRuleActionType === type && a[property]
                        )
                    )
                    .sort(
                        (a: any, b: any) => order.get(a.program.id)! - order.get(b.program.id)!
                    )[0];
                test.skip(!rule, `The instance has no rule with a ${type} action`);
                await select(programs, rule.program.displayName);
                const row = rowsOf(tableAfter(programs.rulesHeading))
                    .filter({ hasText: rule.name })
                    .first();
                await expect(row, type).toContainText(`${t("dos_Type")}: ${type}`);
                for (const field of fields)
                    await expect(row, `${type} ${field}`).toContainText(field);
            }
        }

        test("`ASSIGN`, `DISPLAYKEYVALUEPAIR`, `DISPLAYTEXT`", async ({ programs, api }) => {
            // DISPLAYKEYVALUEPAIR is not on the instance, so the write spec covers it.
            await expectActions(
                programs,
                api,
                scenarios.filter(([k]) => ["ASSIGN", "DISPLAYTEXT"].includes(k))
            );
        });

        test("`ERRORONCOMPLETE`, `WARNINGONCOMPLETE`, `SHOWERROR`, `SHOWWARNING`", async ({
            programs,
            api,
        }) => {
            // WARNINGONCOMPLETE is not on the instance, so the write spec covers it.
            await expectActions(
                programs,
                api,
                scenarios.filter(([k]) =>
                    ["ERRORONCOMPLETE", "SHOWERROR", "SHOWWARNING"].includes(k)
                )
            );
        });

        test("`HIDEFIELD`, `HIDEOPTION`, `HIDEOPTIONGROUP`, `HIDEPROGRAMSTAGE`, `HIDESECTION`", async ({
            programs,
            api,
        }) => {
            await expectActions(
                programs,
                api,
                scenarios.filter(([k]) => k.startsWith("HIDE"))
            );
        });

        test("Program with no rules has no block or entry", async ({ programs }) => {
            await select(programs, boat.name);
            await expect(programs.rulesHeading).toBeHidden();
            await expect(programs.tocLink(t("dos_ProgramRules"))).toHaveCount(0);
        });
    });

    test.describe("Program rule variables", () => {
        test("Variables table: name, source type, stage, data element, attribute, associated rules, with its count", async ({
            programs,
            api,
        }) => {
            const variables = await api.list("programRuleVariables", {
                fields: "name",
                filter: `program.id:eq:${ambulances.id}`,
            });
            await select(programs, ambulances.name);
            await expect(programs.variablesHeading).toBeVisible();
            const table = tableAfter(programs.variablesHeading);
            await expect(rowsOf(table)).toHaveCount(variables.length);
            expect(await headersOf(table)).toEqual(
                tableHeaders([
                    "dos_NameElement",
                    "dos_SourceType",
                    "dos_ProgramStage",
                    "dos_DataElement",
                    "dos_TrackedEntityAttributes",
                    "dos_AssociatedProgramRules",
                ])
            );
            await expect(programs.pageText).toContainText(
                `${t("dos_ProgramRuleVariablesNumber")}: ${variables.length}`
            );
        });

        test("Associated rules lists the rules using each variable", async ({ programs, api }) => {
            const sizes = await programsBySize(api);
            const rules = await api.list<any>("programRules", {
                fields: "name,program[id,displayName],programRuleActions[programRuleActionType,content]",
            });
            const order = new Map<string, number>(sizes.map((p: any, i: number) => [p.id, i]));
            const rule = rules
                .filter(r =>
                    r.programRuleActions.some(
                        (a: any) =>
                            a.programRuleActionType === "ASSIGN" &&
                            /^#\{.+\}$/.test(a.content ?? "")
                    )
                )
                .sort((x, y) => order.get(x.program.id)! - order.get(y.program.id)!)[0];
            test.skip(!rule, "No ASSIGN action that sets a variable");
            const action = rule.programRuleActions.find(
                (a: any) =>
                    a.programRuleActionType === "ASSIGN" && /^#\{.+\}$/.test(a.content ?? "")
            );
            const variable = action.content.slice(2, -1);
            await select(programs, rule.program.displayName);
            const row = rowsOf(tableAfter(programs.variablesHeading))
                .filter({ has: programs.root.getByRole("cell", { name: variable, exact: true }) })
                .first();
            await expect(row.locator("td").nth(5)).toContainText(rule.name);
        });

        test("Program with none has no block", async ({ programs }) => {
            await select(programs, boat.name);
            await expect(programs.variablesHeading).toBeHidden();
        });
    });

    test.describe("Resources", () => {
        test("Program with no attribute value and no event charts or reports has no block or entry", async ({
            programs,
            page,
        }) => {
            await page.route(/\/api(\/\d+)?\/event(Charts|Reports)(\.json)?\?/, route =>
                route.fulfill({ json: { eventCharts: [], eventReports: [] } })
            );
            await select(programs, ambulances.name);
            await expect(programs.resourcesHeading).toHaveCount(0);
            await expect(programs.tocLink("Program Resources")).toHaveCount(0);
        });
    });

    test.describe("Export", () => {
        async function exportProgram(programs: ProgramsPage, label: string) {
            await select(programs, label);
            const file = await programs.download(() => programs.exportButton.click());
            return { file, sheets: await readXlsx(file.path) };
        }

        test("Export downloads `<program>-<date>.xlsx`, with unsafe filename characters replaced", async ({
            programs,
        }) => {
            const { file } = await exportProgram(programs, ambulances.name);
            expect(file.name).toMatch(
                new RegExp(`^${ambulances.name}-\\d{2}-\\d{2}-\\d{2}_\\d{1,2}-\\d{2}\\.xlsx$`)
            );
        });

        test("Sheets: Data Elements, Tracked Entity Attributes, Indicators, Program Indicators, Program Rules, Program Rules Actions, Program Rules Variables", async ({
            programs,
        }) => {
            const { sheets } = await exportProgram(programs, mentalGroup.name);
            for (const name of [
                "Data Elements",
                "Tracked Entity Attributes",
                "Program Indicators",
                "Program Rules",
                "Program Rules Actions",
                "Program Rules Variables",
            ]) {
                expect(Object.keys(sheets), name).toContain(name);
            }
        });

        test("Data Elements sheet includes stage, section, option set name and options", async ({
            programs,
        }) => {
            const { sheets } = await exportProgram(programs, ambulances.name);
            const { headers } = sheets["Data Elements"]!;
            for (const key of [
                "dos_Stage",
                "dos_Section",
                "dos_NameElement",
                "dos_OptionSetName",
                "dos_OptionSetOptions",
            ]) {
                expect(headers, key).toContain(t(key));
            }
        });

        test("Program Rules Actions sheet lists the actions", async ({ programs }) => {
            const { sheets } = await exportProgram(programs, ambulances.name);
            const sheet = sheets["Program Rules Actions"]!;
            expect(sheet.rows.length).toBeGreaterThan(0);
            expect(sheet.headers.length).toBeGreaterThan(1);
        });

        test("Sheet row counts match the tables on screen", async ({ programs, api }) => {
            const { sheets } = await exportProgram(programs, ambulances.name);
            const rules = await api.list("programRules", {
                fields: "name",
                filter: `program.id:eq:${ambulances.id}`,
            });
            expect(sheets["Program Rules"]!.rows).toHaveLength(rules.length);
            const { programIndicators } = await api.get(`programs/${ambulances.id}`, {
                fields: "programIndicators[id]",
            });
            expect(sheets["Program Indicators"]!.rows).toHaveLength(programIndicators.length);
            const shown = await programs.stageContainer.locator("tbody > tr").count();
            expect(sheets["Data Elements"]!.rows).toHaveLength(shown);
        });

        test("Export follows the legacy elements toggle", async ({ programs, page, api }) => {
            const sizes = (await programsBySize(api)).filter((p: any) => p.programIndicators < 200);
            const inGroup = (e: any, id: string) =>
                e.dataElementGroups.some((g: any) => g.id === id);
            let target: any;
            for (const size of sizes) {
                const { displayName, programStages } = await api.get(`programs/${size.id}`, {
                    fields: "displayName,programStages[programStageDataElements[dataElement[displayName,dataElementGroups[id]]]]",
                });
                const elements = programStages
                    .flatMap((s: any) => s.programStageDataElements)
                    .map((e: any) => e.dataElement);
                const element = elements.find((e: any) =>
                    e.dataElementGroups.some((g: any) =>
                        elements.some((o: any) => !inGroup(o, g.id))
                    )
                );
                if (element) {
                    const group = element.dataElementGroups.find((g: any) =>
                        elements.some((o: any) => !inGroup(o, g.id))
                    );
                    target = { displayName, element, group };
                    break;
                }
            }
            test.skip(!target, "No data element in a group that leaves others visible");
            const { element, group, displayName: label } = target;
            await mockKeys(page, {
                blacklist_dataElementGroups: [],
                legacy_dataElementGroups: [group.id],
            });
            const hidden = await exportProgram(programs, label);
            const names = (s: any) =>
                s["Data Elements"].rows.map((r: any) => r[t("dos_NameElement")]);
            expect(names(hidden.sheets)).not.toContain(element.displayName);
            await programs.legacyToggle.check();
            const shown = await exportProgram(programs, label);
            expect(names(shown.sheets)).toContain(element.displayName);
        });

        test("Export works on a program with no rules, variables or indicators (`Rs4W7I3twdy`)", async ({
            programs,
        }) => {
            const { sheets } = await exportProgram(programs, boat.name);
            expect(Object.keys(sheets)).toContain("Data Elements");
        });

        test("Export works on an event program, with no attributes sheet", async ({ programs }) => {
            const { sheets } = await exportProgram(programs, ambulances.name);
            expect(Object.keys(sheets)).not.toContain("Tracked Entity Attributes");
        });

        test("Export can be repeated, and after switching program it has the new program's data", async ({
            programs,
            api,
        }) => {
            const first = await exportProgram(programs, ambulances.name);
            const again = await programs.download(() => programs.exportButton.click());
            expect(again.name).toContain(ambulances.name);
            await programs.select(boat.name);
            const second = await programs.download(() => programs.exportButton.click());
            expect(second.name).toContain(boat.name);
            const sheets = await readXlsx(second.path);
            const stage = (await getProgram(api, boat.id)).programStages[0];
            expect(sheets["Data Elements"]!.rows[0]![t("dos_Stage")]).toBe(stage.displayName);
            expect(first.sheets["Data Elements"]!.rows[0]![t("dos_Stage")]).not.toBe(
                stage.displayName
            );
        });
    });
});
