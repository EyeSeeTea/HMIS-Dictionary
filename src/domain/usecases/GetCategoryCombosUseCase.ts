import { CategoryCombo, DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class GetCategoryCombosUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(dataSet: DataSet): FutureData<CategoryCombo[]> {
        const ids = dataSet.categoryComboIds();

        return ids.length > 0 ? this.dataSetRepository.getCategoryCombos(ids) : Future.success([]);
    }
}
