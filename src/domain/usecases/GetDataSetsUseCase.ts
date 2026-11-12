import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { NamedRef } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";

export class GetDataSetsUseCase {
    constructor(
        private dataSetRepository: DataSetRepository,
        private orgUnitRepository: OrgUnitRepository
    ) {}

    execute(settings: AppSettings, options: { name?: Maybe<string> } = {}): FutureData<NamedRef[]> {
        if (options.name) return this.dataSetRepository.getByName(options.name);
        const excludedIds = settings.blacklist.dataSetIds;

        return settings.limitSelectorsToUserOrgUnits
            ? this.orgUnitRepository
                  .getUserRootIds()
                  .flatMap(rootIds => this.dataSetRepository.getAllInOrgUnits(excludedIds, rootIds))
            : this.dataSetRepository.getAll(excludedIds);
    }
}
