import { FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { Program } from "$/domain/entities/Program";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramsUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(options: { name?: Maybe<string> } = {}): FutureData<Program[]> {
        return options.name
            ? this.programRepository.getByName(options.name)
            : this.programRepository.getAll();
    }
}
