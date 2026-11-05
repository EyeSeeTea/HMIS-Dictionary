import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { Program } from "$/domain/entities/Program";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramsUseCase {
    constructor(
        private programRepository: ProgramRepository,
        private orgUnitRepository: OrgUnitRepository
    ) {}

    execute(settings: AppSettings, options: { name?: Maybe<string> } = {}): FutureData<Program[]> {
        if (options.name) return this.programRepository.getByName(options.name);

        return settings.limitSelectorsToUserOrgUnits
            ? this.orgUnitRepository
                  .getUserRootIds()
                  .flatMap(rootIds => this.programRepository.getAllInOrgUnits(rootIds))
            : this.programRepository.getAll();
    }
}
