import { describe, expect, it } from "vitest";
import { ProgramRuleSet, ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { ProgramStage } from "$/domain/entities/ProgramStage";
import { assertValue } from "$/utils/assert";
import {
    createAction,
    createOptionSet,
    createRule,
    createSettings,
    createStage,
    createStageDataElement,
} from "./fixtures";

const de1 = { id: "de1", name: "DE" };
const section1 = { id: "section1", name: "Section" };
const otherStage = { id: "other", name: "Other" };

const assign = createRule({
    name: "Assign",
    actions: [createAction({ type: "ASSIGN", dataElement: de1, content: "#{var}" })],
});
const hideField = createRule({
    name: "HideField",
    actions: [createAction({ type: "HIDEFIELD", dataElement: de1 })],
});
const hideSection = createRule({
    name: "HideSection",
    condition: "true",
    actions: [createAction({ type: "HIDESECTION", section: section1 })],
});

const firstDataElement = (stage: ProgramStage) => assertValue(stage.sections[0]?.dataElements[0]);

const ruleSet = (...rules: ReturnType<typeof createRule>[]) => ProgramRuleSet.create({ rules });

describe("ProgramRuleSet", () => {
    it("visibility applies only to the rule's stage, or all when it has none", () => {
        const scoped = createRule({ ...hideField, stage: otherStage, actions: hideField.actions });
        const set = ruleSet(hideField, scoped);

        expect(set.dataElementVisibility("de1", "stage1")).toEqual([
            { type: "HIDEFIELD", ruleName: "HideField" },
        ]);
        expect(set.dataElementVisibility("de1", "other")).toHaveLength(2);
    });

    it("attributeVisibility finds the rules hiding the attribute, in any stage", () => {
        const hideAttribute = createRule({
            name: "HideAttribute",
            stage: otherStage,
            actions: [createAction({ type: "HIDEFIELD", attribute: { id: "tea1", name: "TEA" } })],
        });

        expect(ruleSet(hideAttribute, hideField).attributeVisibility("tea1")).toEqual([
            { type: "HIDEFIELD", ruleName: "HideAttribute" },
        ]);
        expect(ruleSet(hideAttribute).attributeVisibility("other")).toEqual([]);
    });

    it("sectionVisibility finds HIDESECTION rules, whatever the condition", () => {
        const conditional = createRule({ name: "If", actions: hideSection.actions });

        expect(ruleSet(conditional).sectionVisibility("section1", "stage1")).toEqual([
            { type: "HIDESECTION", ruleName: "If" },
        ]);
    });

    describe("calculationMode", () => {
        it("is the program rules assigning it", () => {
            expect(
                ruleSet(assign, hideSection).calculationMode("de1", "section1", "stage1")
            ).toEqual({ type: "programRule", ruleNames: ["Assign"] });
        });

        it("is other when its section is hidden by an always-true rule", () => {
            expect(ruleSet(hideSection).calculationMode("de1", "section1", "stage1")).toEqual({
                type: "other",
            });
        });

        it("is default when the hiding rule has a condition, or without a section", () => {
            const conditional = createRule({ actions: hideSection.actions });

            expect(ruleSet(conditional).calculationMode("de1", "section1", "stage1")).toEqual({
                type: "default",
            });
            expect(ruleSet(hideSection).calculationMode("de1", undefined, "stage1")).toEqual({
                type: "default",
            });
        });
    });
});

describe("ProgramStage", () => {
    it("withRules fills visibility and calculation", () => {
        const stage = createStage().withRules(ruleSet(hideField, hideSection));
        const dataElement = firstDataElement(stage);

        expect(dataElement.visibility).toEqual([
            { type: "HIDEFIELD", ruleName: "HideField" },
            { type: "HIDESECTION", ruleName: "HideSection" },
        ]);
        expect(dataElement.calculation).toEqual({ type: "other" });
    });

    it("withRules ignores section rules on a virtual section", () => {
        const stage = createStage({ hasRealSections: false }).withRules(ruleSet(hideSection));
        const dataElement = firstDataElement(stage);

        expect(dataElement.visibility).toEqual([]);
        expect(dataElement.calculation).toEqual({ type: "default" });
    });

    describe("forDisplay", () => {
        const stage = createStage({
            sections: [
                {
                    id: "s",
                    name: "S",
                    dataElements: [
                        createStageDataElement({ id: "ok", optionSet: createOptionSet() }),
                        createStageDataElement({ id: "legacy", groupIds: ["legacyDeg"] }),
                        createStageDataElement({ id: "bad", groupIds: ["blacklistedDeg"] }),
                    ],
                },
            ],
            dataElementIds: ["ok", "legacy", "bad"],
        });
        const settings = createSettings();
        const legacyOptionIds = new Set(["o1"]);

        it("removes hidden elements and legacy options, keeping dataElementIds", () => {
            const result = stage.forDisplay(settings, { showLegacy: false, legacyOptionIds });
            const elements = result.sections[0]?.dataElements ?? [];

            expect(elements.map(de => de.id)).toEqual(["ok"]);
            expect(elements[0]?.optionSet?.options.map(o => o.id)).toEqual(["o2"]);
            expect(result.dataElementIds).toEqual(["ok", "legacy", "bad"]);
        });

        it("keeps legacy elements and options when asked", () => {
            const result = stage.forDisplay(settings, { showLegacy: true, legacyOptionIds });
            const elements = result.sections[0]?.dataElements ?? [];

            expect(elements.map(de => de.id)).toEqual(["ok", "legacy"]);
            expect(elements[0]?.optionSet?.options).toHaveLength(2);
        });
    });
});

describe("ProgramRuleVariable", () => {
    it("finds the rules that assign it", () => {
        const variable = ProgramRuleVariable.create({
            name: "var",
            sourceType: "DATAELEMENT_CURRENT_EVENT",
            stage: undefined,
            dataElement: undefined,
            attribute: undefined,
            associatedRuleNames: [],
        });

        expect(variable.withAssociatedRules([assign, hideField]).associatedRuleNames).toEqual([
            "Assign",
        ]);
    });
});
