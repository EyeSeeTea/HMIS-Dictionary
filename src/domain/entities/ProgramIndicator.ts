import { Struct } from "./generic/Struct";
import { ProgramExpression } from "./ProgramExpression";
import { Id, NamedRef } from "./Ref";

export type PeriodBoundaryAttrs = {
    target: string;
    type: string;
    offsetPeriods: number;
    offsetPeriodType: string;
};

export class PeriodBoundary extends Struct<PeriodBoundaryAttrs>() {
    targetLabel(stages: NamedRef[]): string {
        if (!this.target) return "CUSTOM";

        const [prefix, id] = this.target.split(":");
        if (prefix !== "PS_EVENTDATE" || id?.length !== 11) return this.target;

        const stageName = stages.find(stage => stage.id === id)?.name;
        return `${prefix} - ${stageName ?? id}`;
    }
}

export type ProgramIndicatorAttrs = {
    id: Id;
    name: string;
    formName: string;
    description: string;
    expression: ProgramExpression;
    filter: ProgramExpression;
    expressionText: string;
    filterText: string;
    aggregationType: string;
    analyticsType: string;
    boundaries: PeriodBoundary[];
    groupIds: Id[];
};

export class ProgramIndicator extends Struct<ProgramIndicatorAttrs>() {
    /** Stages referenced from the expression and the filter, known ones first. */
    stageNames(stages: NamedRef[]): string[] {
        const names = [this.expression, this.filter].flatMap(expression => [
            ...expression
                .stageIds()
                .flatMap(id => stages.find(stage => stage.id === id)?.name ?? []),
            ...expression.stageNames(),
        ]);

        return Array.from(new Set(names));
    }

    withTexts(expressionText: string, filterText: string): ProgramIndicator {
        return this._update({ expressionText, filterText });
    }
}
