import { Maybe } from "$/utils/ts-utils";
import { AppSettings } from "./AppSettings";
import { Struct } from "./generic/Struct";
import { OptionSet } from "./OptionSet";
import { CalculationMode, ProgramRuleSet, VisibilityRule } from "./ProgramRule";
import { Id, NamedRef } from "./Ref";

export type StageDataElement = NamedRef & {
    shortName: string;
    formName: string;
    description: string;
    valueType: string;
    optionSet: Maybe<OptionSet>;
    groupIds: Id[];
    compulsory: boolean;
    visibility: VisibilityRule[];
    calculation: CalculationMode;
};

export type StageSection = NamedRef & { dataElements: StageDataElement[] };

export type LegacyOptions = { showLegacy: boolean; legacyOptionIds: Set<Id> };

export type ProgramStageAttrs = {
    id: Id;
    name: string;
    description: string;
    repeatable: boolean;
    sortOrder: number;
    /** If there are none, one virtual section with id "DataElements". */
    sections: StageSection[];
    hasRealSections: boolean;
    /** All of them, not affected by forDisplay. Used by Indicator.stageNames. */
    dataElementIds: Id[];
};

export class ProgramStage extends Struct<ProgramStageAttrs>() {
    withRules(ruleSet: ProgramRuleSet): ProgramStage {
        return this.mapSections(section => {
            const sectionId = this.hasRealSections ? section.id : undefined;
            const sectionVisibility = sectionId
                ? ruleSet.sectionVisibility(sectionId, this.id)
                : [];

            return {
                ...section,
                dataElements: section.dataElements.map(dataElement => ({
                    ...dataElement,
                    visibility: [
                        ...ruleSet.dataElementVisibility(dataElement.id, this.id),
                        ...sectionVisibility,
                    ],
                    calculation: ruleSet.calculationMode(dataElement.id, sectionId, this.id),
                })),
            };
        });
    }

    forDisplay(settings: AppSettings, options: LegacyOptions): ProgramStage {
        const { showLegacy, legacyOptionIds } = options;

        return this.mapSections(section => ({
            ...section,
            dataElements: section.dataElements
                .filter(dataElement =>
                    settings.isDataElementVisibleInProgram(dataElement.groupIds, showLegacy)
                )
                .map(dataElement => ({
                    ...dataElement,
                    optionSet: showLegacy
                        ? dataElement.optionSet
                        : dataElement.optionSet?.withoutOptions(legacyOptionIds),
                })),
        }));
    }

    optionName(dataElementId: Id, code: string): Maybe<string> {
        const dataElement = this.sections
            .flatMap(section => section.dataElements)
            .find(dataElement => dataElement.id === dataElementId);

        return dataElement?.optionSet?.options.find(option => option.code === code)?.name;
    }

    private mapSections(fn: (section: StageSection) => StageSection): ProgramStage {
        return this._update({ sections: this.sections.map(fn) });
    }
}
