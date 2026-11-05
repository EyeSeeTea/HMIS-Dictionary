import { AccessContext } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Program } from "$/domain/entities/Program";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramIndicatorsUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program, context: AccessContext): FutureData<ProgramIndicator[]> {
        const { settings, user } = context;

        return this.programRepository
            .getIndicators(program.id)
            .map(programIndicators =>
                programIndicators.filter(programIndicator =>
                    settings.isProgramIndicatorVisible(programIndicator.groupIds, user)
                )
            );
    }
}
