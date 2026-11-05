import { Struct } from "./generic/Struct";
import { IndicatorFormula } from "./IndicatorFormula";
import { ProgramIndicator } from "./ProgramIndicator";
import { Id, NamedRef } from "./Ref";

export type StageWithDataElements = NamedRef & { dataElementIds: Id[] };

export type IndicatorAttrs = {
    id: Id;
    name: string;
    shortName: string;
    formName: string;
    description: string;
    type: string;
    numerator: IndicatorFormula;
    denominator: IndicatorFormula;
    numeratorDescription: string;
    denominatorDescription: string;
    numeratorText: string;
    denominatorText: string;
    groupIds: Id[];
};

export class Indicator extends Struct<IndicatorAttrs>() {
    withTexts(numeratorText: string, denominatorText: string): Indicator {
        return this._update({ numeratorText, denominatorText });
    }

    referencesAnyDataElement(ids: Id[]): boolean {
        return this.formulas().some(formula => formula.referencesAnyDataElement(ids));
    }

    referencesProgram(programId: Id, programIndicatorIds: Id[]): boolean {
        return this.formulas().some(formula =>
            formula.referencesProgram(programId, programIndicatorIds)
        );
    }

    /** Stages referenced through D{} and I{}. */
    stageNames(stages: StageWithDataElements[], programIndicators: ProgramIndicator[]): string[] {
        const names = this.formulas()
            .flatMap(formula => formula.tokens())
            .flatMap(token => {
                if (token.type === "programDataElement") {
                    const stage = stages.find(stage =>
                        stage.dataElementIds.includes(token.dataElementId)
                    );
                    return stage ? [stage.name] : [];
                } else if (token.type === "programIndicator") {
                    const programIndicator = programIndicators.find(pi => pi.id === token.id);
                    return programIndicator ? programIndicator.stageNames(stages) : [];
                } else {
                    return [];
                }
            });

        return Array.from(new Set(names));
    }

    private formulas(): IndicatorFormula[] {
        return [this.numerator, this.denominator];
    }
}
