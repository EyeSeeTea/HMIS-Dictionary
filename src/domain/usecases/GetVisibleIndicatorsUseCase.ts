import { AccessContext } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";

export class GetVisibleIndicatorsUseCase {
    constructor(private indicatorRepository: IndicatorRepository) {}

    execute(context: AccessContext): FutureData<Indicator[]> {
        const { settings, user } = context;

        return this.indicatorRepository
            .getForIndicatorsScreen()
            .map(indicators =>
                indicators.filter(indicator =>
                    settings.isIndicatorVisible(indicator.groupIds, user)
                )
            );
    }
}
