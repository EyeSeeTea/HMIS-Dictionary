import { PeriodBoundary } from "$/domain/entities/ProgramIndicator";
import { CalculationMode, VisibilityRule } from "$/domain/entities/ProgramRule";
import { NamedRef } from "$/domain/entities/Ref";
import { programTexts } from "$/webapp/pages/programs/programTexts";

export function calculationModeText(mode: CalculationMode): string {
    switch (mode.type) {
        case "programRule":
            return `${programTexts.dos_ProgramRule()}: ${mode.ruleNames.join(", ")}`;
        case "other":
            return programTexts.dos_Other();
        case "default":
            return programTexts.dos_DirectDataEntry();
    }
}

export function visibilityText(rule: VisibilityRule): string {
    return `${rule.type}: ${rule.ruleName}`;
}

/** The lines of a period boundary, as shown in the table. Empty values are left out. */
export function boundaryLines(boundary: PeriodBoundary, stages: NamedRef[]): string[] {
    const t = programTexts;

    return [
        `${t.dos_BoundaryTarget()}: ${boundary.targetLabel(stages)}`,
        boundary.type ? `${t.dos_AnalyticsBoundaryType()}: ${boundary.type}` : "",
        boundary.offsetPeriods ? `${t.dos_OffsetPeriod()}: ${boundary.offsetPeriods}` : "",
        boundary.offsetPeriodType ? `${t.dos_PeriodType()}: ${boundary.offsetPeriodType}` : "",
    ].filter(Boolean);
}
