import { Maybe } from "$/utils/ts-utils";
import { Struct } from "./generic/Struct";
import { Id, NamedRef } from "./Ref";

export type VisibilityRule = { type: "HIDEFIELD" | "HIDESECTION"; ruleName: string };

export type CalculationMode =
    | { type: "default" }
    | { type: "programRule"; ruleNames: string[] }
    | { type: "other" };

export type ProgramRuleAction = {
    type: string;
    dataElement: Maybe<NamedRef>;
    attribute: Maybe<NamedRef>;
    option: Maybe<NamedRef>;
    optionGroup: Maybe<NamedRef>;
    stage: Maybe<NamedRef>;
    section: Maybe<NamedRef>;
    templateId: Maybe<Id>;
    templateName: string;
    content: string;
    data: string;
    /** The widget where the action shows its value. */
    location: string;
};

export type ProgramRuleAttrs = {
    name: string;
    description: string;
    condition: string;
    /** No stage means all stages. */
    stage: Maybe<NamedRef>;
    actions: ProgramRuleAction[];
};

export class ProgramRule extends Struct<ProgramRuleAttrs>() {
    isAlwaysTrue(): boolean {
        return this.condition === "true";
    }

    assignsVariable(name: string): boolean {
        return this.actions.some(
            action => action.type === "ASSIGN" && action.content === `#{${name}}`
        );
    }

    appliesToStage(stageId: Id): boolean {
        return !this.stage || this.stage.id === stageId;
    }

    affects(type: string, predicate: (action: ProgramRuleAction) => boolean): boolean {
        return this.actions.some(action => action.type === type && predicate(action));
    }
}

export type ProgramRuleSetAttrs = { rules: ProgramRule[] };

export class ProgramRuleSet extends Struct<ProgramRuleSetAttrs>() {
    dataElementVisibility(dataElementId: Id, stageId: Id): VisibilityRule[] {
        return this.rules
            .filter(
                rule =>
                    rule.appliesToStage(stageId) &&
                    rule.affects("HIDEFIELD", action => action.dataElement?.id === dataElementId)
            )
            .map(rule => ({ type: "HIDEFIELD", ruleName: rule.name }));
    }

    /** Tracked entity attributes belong to the program, not to a stage: the rules of any stage. */
    attributeVisibility(attributeId: Id): VisibilityRule[] {
        return this.rules
            .filter(rule =>
                rule.affects("HIDEFIELD", action => action.attribute?.id === attributeId)
            )
            .map(rule => ({ type: "HIDEFIELD", ruleName: rule.name }));
    }

    sectionVisibility(sectionId: Id, stageId: Id): VisibilityRule[] {
        return this.rules
            .filter(
                rule =>
                    rule.appliesToStage(stageId) &&
                    rule.affects("HIDESECTION", action => action.section?.id === sectionId)
            )
            .map(rule => ({ type: "HIDESECTION", ruleName: rule.name }));
    }

    calculationMode(dataElementId: Id, sectionId: Maybe<Id>, stageId: Id): CalculationMode {
        const ruleNames = this.rules
            .filter(
                rule =>
                    rule.appliesToStage(stageId) &&
                    rule.affects("ASSIGN", action => action.dataElement?.id === dataElementId)
            )
            .map(rule => rule.name);

        if (ruleNames.length > 0) return { type: "programRule", ruleNames };

        const isSectionAlwaysHidden =
            sectionId !== undefined &&
            this.rules.some(
                rule =>
                    rule.appliesToStage(stageId) &&
                    rule.isAlwaysTrue() &&
                    rule.affects("HIDESECTION", action => action.section?.id === sectionId)
            );

        return isSectionAlwaysHidden ? { type: "other" } : { type: "default" };
    }
}

export type ProgramRuleVariableAttrs = {
    name: string;
    sourceType: string;
    stage: Maybe<NamedRef>;
    dataElement: Maybe<NamedRef>;
    attribute: Maybe<NamedRef>;
    associatedRuleNames: string[];
};

export class ProgramRuleVariable extends Struct<ProgramRuleVariableAttrs>() {
    withAssociatedRules(rules: ProgramRule[]): ProgramRuleVariable {
        return this._update({
            associatedRuleNames: rules
                .filter(rule => rule.assignsVariable(this.name))
                .map(rule => rule.name),
        });
    }
}
