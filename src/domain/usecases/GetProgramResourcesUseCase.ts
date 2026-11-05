import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Program, ProgramResource } from "$/domain/entities/Program";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramResourcesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program): FutureData<ProgramResource[]> {
        return program.resourceIds.length > 0
            ? this.programRepository.getResources(program.resourceIds)
            : Future.success([]);
    }
}
