import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { NamedRef } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class GetDataSetsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(settings: AppSettings, options: { name?: Maybe<string> } = {}): FutureData<NamedRef[]> {
        return options.name
            ? this.dataSetRepository.getByName(options.name)
            : this.dataSetRepository.getAll(settings.blacklist.dataSetIds);
    }
}
