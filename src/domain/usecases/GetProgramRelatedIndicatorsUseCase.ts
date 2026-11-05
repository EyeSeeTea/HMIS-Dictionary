import { AccessContext } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { Program } from "$/domain/entities/Program";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";

export class GetProgramRelatedIndicatorsUseCase {
    constructor(private indicatorRepository: IndicatorRepository) {}

    execute(
        program: Program,
        programIndicators: ProgramIndicator[],
        context: AccessContext
    ): FutureData<Indicator[]> {
        const { settings, user } = context;
        const programIndicatorIds = programIndicators.map(programIndicator => programIndicator.id);

        return this.indicatorRepository
            .getForPrograms()
            .map(indicators =>
                indicators.filter(
                    indicator =>
                        settings.isIndicatorVisible(indicator.groupIds, user) &&
                        indicator.referencesProgram(program.id, programIndicatorIds)
                )
            );
    }
}
