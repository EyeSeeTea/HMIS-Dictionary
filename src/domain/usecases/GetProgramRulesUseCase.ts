import { FutureData } from "$/domain/entities/generic/Future";
import { Program } from "$/domain/entities/Program";
import { ProgramRule } from "$/domain/entities/ProgramRule";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramRulesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program): FutureData<ProgramRule[]> {
        return this.programRepository.getRules(program.id);
    }
}
