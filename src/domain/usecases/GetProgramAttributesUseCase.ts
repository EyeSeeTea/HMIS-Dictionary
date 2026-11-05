import { FutureData } from "$/domain/entities/generic/Future";
import { LegacyOptions } from "$/domain/entities/ProgramStage";
import { Program, ProgramAttribute } from "$/domain/entities/Program";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramAttributesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program, options: LegacyOptions): FutureData<ProgramAttribute[]> {
        const { showLegacy, legacyOptionIds } = options;

        return this.programRepository.getAttributes(program.id).map(attributes =>
            showLegacy
                ? attributes
                : attributes.map(attribute => ({
                      ...attribute,
                      optionSet: attribute.optionSet?.withoutOptions(legacyOptionIds),
                  }))
        );
    }
}
