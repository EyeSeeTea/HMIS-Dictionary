import { AppSettings, AppSettingsAttrs } from "$/domain/entities/AppSettings";
import { Indicator, IndicatorAttrs } from "$/domain/entities/Indicator";
import { IndicatorFormula } from "$/domain/entities/IndicatorFormula";
import { OptionSet } from "$/domain/entities/OptionSet";
import { ProgramExpression } from "$/domain/entities/ProgramExpression";
import { ProgramIndicator, ProgramIndicatorAttrs } from "$/domain/entities/ProgramIndicator";
import { ProgramRule, ProgramRuleAction, ProgramRuleAttrs } from "$/domain/entities/ProgramRule";
import { ProgramStage, ProgramStageAttrs, StageDataElement } from "$/domain/entities/ProgramStage";

export function createSettings(attrs: Partial<AppSettingsAttrs> = {}): AppSettings {
    return new AppSettings({
        adminGroup: { id: "adminGroupId", name: "Admins" },
        healthServiceGroupSet: { id: "groupSetId", name: "Services" },
        dossierConfigComplete: true,
        blacklist: {
            dataElementGroupIds: ["blacklistedDeg"],
            dataSetIds: ["blacklistedDs"],
            indicatorGroupIds: ["blacklistedIg"],
            tag: "Blacklisted",
        },
        notInUse: {
            indicatorGroupIds: ["notInUseIg"],
            programIndicatorGroupIds: ["notInUsePig"],
            tag: "Not in Use",
        },
        legacy: { dataElementGroupIds: ["legacyDeg"], optionGroupIds: ["legacyOg"] },
        ...attrs,
    });
}

export function createIndicator(attrs: Partial<IndicatorAttrs> = {}): Indicator {
    return new Indicator({
        id: "indicatorId",
        name: "Indicator",
        shortName: "Ind",
        formName: "Indicator",
        description: "",
        type: "Percent",
        numerator: IndicatorFormula.create({ expression: "1" }),
        denominator: IndicatorFormula.create({ expression: "1" }),
        numeratorDescription: "",
        denominatorDescription: "",
        numeratorText: "",
        denominatorText: "",
        groupIds: [],
        ...attrs,
    });
}

export function createProgramIndicator(
    attrs: Partial<ProgramIndicatorAttrs> = {}
): ProgramIndicator {
    return new ProgramIndicator({
        id: "programIndicatorId",
        name: "Program indicator",
        formName: "Program indicator",
        description: "",
        expression: ProgramExpression.create({ expression: "" }),
        filter: ProgramExpression.create({ expression: "" }),
        expressionText: "",
        filterText: "",
        aggregationType: "",
        analyticsType: "",
        boundaries: [],
        groupIds: [],
        ...attrs,
    });
}

export function createRule(attrs: Partial<ProgramRuleAttrs> = {}): ProgramRule {
    return new ProgramRule({
        name: "Rule",
        description: "",
        condition: "x > 1",
        stage: undefined,
        actions: [],
        ...attrs,
    });
}

export function createAction(attrs: Partial<ProgramRuleAction>): ProgramRuleAction {
    return {
        type: "ASSIGN",
        dataElement: undefined,
        attribute: undefined,
        option: undefined,
        optionGroup: undefined,
        stage: undefined,
        section: undefined,
        templateId: undefined,
        templateName: "",
        content: "",
        data: "",
        ...attrs,
    };
}

export function createStageDataElement(attrs: Partial<StageDataElement> = {}): StageDataElement {
    return {
        id: "de1",
        name: "Data element",
        formName: "Data element",
        description: "",
        valueType: "TEXT",
        optionSet: undefined,
        groupIds: [],
        compulsory: false,
        visibility: [],
        calculation: { type: "default" },
        ...attrs,
    };
}

export function createStage(attrs: Partial<ProgramStageAttrs> = {}): ProgramStage {
    return new ProgramStage({
        id: "stage1",
        name: "Stage 1",
        description: "",
        repeatable: false,
        sortOrder: 1,
        sections: [{ id: "section1", name: "Section", dataElements: [createStageDataElement()] }],
        hasRealSections: true,
        dataElementIds: ["de1"],
        ...attrs,
    });
}

export function createOptionSet(): OptionSet {
    return OptionSet.create({
        name: "Options",
        options: [
            { id: "o1", code: "1", name: "Yes" },
            { id: "o2", code: "22", name: "Twenty two" },
        ],
    });
}
