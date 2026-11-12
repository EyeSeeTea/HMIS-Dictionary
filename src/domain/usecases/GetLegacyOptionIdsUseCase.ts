import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetLegacyOptionIdsUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(settings: AppSettings): FutureData<Set<Id>> {
        return this.programRepository.getOptionIdsOfGroups(settings.legacy.optionGroupIds);
    }
}
