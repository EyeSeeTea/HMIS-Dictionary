import { describe, expect, it } from "vitest";
import {
    createAction,
    createIndicator,
    createProgramIndicator,
    createRule,
    createStage,
    createStageDataElement,
    createOptionSet,
} from "$/domain/entities/__tests__/fixtures";
import { ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { getResourceUrl } from "$/webapp/pages/programs/ResourcesSection";
import { buildProgramSheets, getProgramFilename } from "$/webapp/pages/programs/programExport";
import { boundaryLines, calculationModeText } from "$/webapp/pages/programs/programFormat";
import { getActionFields } from "$/webapp/pages/programs/ruleActionFields";
import { PeriodBoundary } from "$/domain/entities/ProgramIndicator";

const labels = (fields: ReturnType<typeof getActionFields>) => fields.map(field => field.label);

describe("getActionFields", () => {
    it("shows the target, the variable and the expression of an ASSIGN", () => {
        const fields = getActionFields(
            createAction({
                type: "ASSIGN",
                dataElement: { id: "de", name: "Weight" },
                content: "#{var}",
                data: "1 + 1",
            })
        );

        expect(fields).toEqual([
            { label: "Data Element", value: "Weight" },
            { label: "Program Rule Variable to Assign to", value: "#{var}" },
            { label: "Expression", value: "1 + 1" },
        ]);
    });

    it("shows the template name of messages", () => {
        const fields = getActionFields(
            createAction({ type: "SENDMESSAGE", templateName: "Welcome" })
        );

        expect(fields).toEqual([{ label: "Message Template", value: "Welcome" }]);
    });

    it("never shows the display widget (bug P12 kept)", () => {
        const fields = getActionFields(
            createAction({ type: "DISPLAYKEYVALUEPAIR", content: "Key", data: "x" })
        );

        expect(labels(fields)).not.toContain("Display Widget");
    });

    it("has nothing for unknown types and for actions without values", () => {
        expect(getActionFields(createAction({ type: "SOMETHINGNEW", content: "x" }))).toEqual([]);
        expect(getActionFields(createAction({ type: "SHOWERROR" }))).toEqual([]);
    });
});

describe("programFormat", () => {
    it("describes the calculation modes", () => {
        expect(calculationModeText({ type: "default" })).toBe("Direct Data Entry");
        expect(calculationModeText({ type: "other" })).toBe("Other");
        expect(calculationModeText({ type: "programRule", ruleNames: ["A", "B"] })).toBe(
            "Program Rule: A, B"
        );
    });

    it("lists the parts of a boundary that have a value", () => {
        const boundary = PeriodBoundary.create({
            target: "",
            type: "AFTER_START_OF_REPORTING_PERIOD",
            offsetPeriods: 0,
            offsetPeriodType: "",
        });

        expect(boundaryLines(boundary, [])).toEqual([
            "Boundary target: CUSTOM",
            "Analytics period boundary type: AFTER_START_OF_REPORTING_PERIOD",
        ]);
    });
});

describe("getResourceUrl", () => {
    it("opens each type in its own app", () => {
        const resource = { id: "abc", name: "R", description: "" };

        expect(getResourceUrl("/dhis2", { ...resource, type: "dashboards" })).toBe(
            "/dhis2/dhis-web-dashboard/index.html#/abc"
        );
        expect(getResourceUrl("/dhis2", { ...resource, type: "eventCharts" })).toBe(
            "/dhis2/dhis-web-event-visualizer/index.html?id=abc"
        );
    });
});

describe("buildProgramSheets", () => {
    const allowAll = { canSeeSection: () => true, canSeeColumn: () => true };
    const empty = {
        stages: [],
        attributes: [],
        programIndicators: [],
        indicators: [],
        rules: [],
        ruleVariables: [],
    };

    it("leaves out the sheets without rows", () => {
        expect(buildProgramSheets(empty, allowAll)).toEqual([]);
    });

    it("writes the stage and the section, and an empty section for the virtual one", () => {
        const stage = createStage({
            hasRealSections: false,
            sections: [
                {
                    id: "DataElements",
                    name: "Data Elements",
                    dataElements: [createStageDataElement({ optionSet: createOptionSet() })],
                },
            ],
        });

        const [sheet] = buildProgramSheets({ ...empty, stages: [stage] }, allowAll);

        expect(sheet?.name).toBe("Data Elements");
        expect(sheet?.header.slice(0, 3)).toEqual(["Stage", "Section", "Name"]);
        expect(sheet?.rows[0]?.slice(0, 3)).toEqual(["Stage 1", "", "Data element"]);
        expect(sheet?.rows[0]).toContain("Yes\nTwenty two");
    });

    it("writes the rules sheet and one row per action in the actions sheet", () => {
        const rule = createRule({
            name: "R1",
            actions: [
                createAction({ type: "SHOWERROR", content: "Bad" }),
                createAction({ type: "HIDEFIELD", dataElement: { id: "d", name: "DE" } }),
            ],
        });

        const sheets = buildProgramSheets({ ...empty, rules: [rule] }, allowAll);

        expect(sheets.map(sheet => sheet.name)).toEqual(["Program Rules", "Program Rules Actions"]);
        expect(sheets[1]?.rows).toHaveLength(2);
        expect(sheets[0]?.rows[0]).toContain("SHOWERROR\nHIDEFIELD");
    });

    it("follows the user's permissions", () => {
        const sheets = buildProgramSheets(
            {
                ...empty,
                indicators: [createIndicator()],
                programIndicators: [createProgramIndicator()],
                ruleVariables: [
                    ProgramRuleVariable.create({
                        name: "v",
                        sourceType: "S",
                        stage: undefined,
                        dataElement: undefined,
                        attribute: undefined,
                        associatedRuleNames: [],
                    }),
                ],
            },
            {
                canSeeSection: section => section !== "indicators",
                canSeeColumn: (section, column) =>
                    !(section === "programIndicators" && column === "filter"),
            }
        );

        expect(sheets.map(sheet => sheet.name)).toEqual([
            "Program Indicators",
            "Program Rules Variables",
        ]);
        expect(sheets[0]?.header).not.toContain("Filter");
    });
});

describe("getProgramFilename", () => {
    it("replaces unsafe characters and adds the date", () => {
        expect(getProgramFilename("A/B: C", new Date(2026, 10, 5, 9, 7))).toBe(
            "A_B_ C-05-11-26_9-07.xlsx"
        );
    });
});
