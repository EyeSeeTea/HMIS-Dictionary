import { AccessContext } from "$/domain/entities/AppSettings";
import { DataSet } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";

export class GetDataSetIndicatorsUseCase {
    constructor(private indicatorRepository: IndicatorRepository) {}

    execute(dataSet: DataSet, context: AccessContext): FutureData<Indicator[]> {
        const { settings, user } = context;

        return this.indicatorRepository
            .getForDataSets()
            .map(indicators =>
                indicators.filter(
                    indicator =>
                        settings.isIndicatorVisible(indicator.groupIds, user) &&
                        (dataSet.assignedIndicatorIds.includes(indicator.id) ||
                            indicator.referencesAnyDataElement(dataSet.dataElementIds))
                )
            );
    }
}
