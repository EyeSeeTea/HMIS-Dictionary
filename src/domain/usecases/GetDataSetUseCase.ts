import { DataSet } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class GetDataSetUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(id: Id): FutureData<DataSet> {
        return this.dataSetRepository.get(id);
    }
}
