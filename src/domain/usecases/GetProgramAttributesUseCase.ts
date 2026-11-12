import { FutureData } from "$/domain/entities/generic/Future";
import { LegacyOptions } from "$/domain/entities/ProgramStage";
import { Program, ProgramAttribute } from "$/domain/entities/Program";
import { ProgramRule, ProgramRuleSet } from "$/domain/entities/ProgramRule";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramAttributesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(
        program: Program,
        rules: ProgramRule[],
        options: LegacyOptions
    ): FutureData<ProgramAttribute[]> {
        const { showLegacy, legacyOptionIds } = options;
        const ruleSet = ProgramRuleSet.create({ rules });

        return this.programRepository.getAttributes(program.id).map(attributes =>
            attributes.map(attribute => ({
                ...attribute,
                visibility: ruleSet.attributeVisibility(attribute.id),
                optionSet: showLegacy
                    ? attribute.optionSet
                    : attribute.optionSet?.withoutOptions(legacyOptionIds),
            }))
        );
    }
}
