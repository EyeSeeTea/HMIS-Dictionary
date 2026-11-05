import { AccessContext } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { SearchCatalog } from "$/domain/entities/SearchCatalog";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import { SearchRepository } from "$/domain/repositories/SearchRepository";

export type SearchStep =
    | "dataElements"
    | "categoryOptionCombos"
    | "programIndicators"
    | "indicators";

export class GetSearchCatalogUseCase {
    constructor(
        private healthServiceRepository: HealthServiceRepository,
        private searchRepository: SearchRepository
    ) {}

    execute(
        context: AccessContext,
        onStep?: (step: SearchStep) => void
    ): FutureData<SearchCatalog> {
        const { searchRepository } = this;

        const step = <T>(name: SearchStep, load: () => FutureData<T>): FutureData<T> =>
            Future.success<Error, undefined>(undefined).flatMap(() => {
                onStep?.(name);
                return load();
            });

        return this.getHealthServices(context).flatMap(healthServices =>
            step("dataElements", () => searchRepository.getDataElements()).flatMap(dataElements =>
                step("categoryOptionCombos", () =>
                    searchRepository.getCategoryOptionCombos()
                ).flatMap(categoryOptionCombos =>
                    step("programIndicators", () =>
                        searchRepository.getProgramIndicators()
                    ).flatMap(programIndicators =>
                        step("indicators", () => searchRepository.getIndicators()).map(indicators =>
                            SearchCatalog.build(
                                {
                                    dataElements,
                                    categoryOptionCombos,
                                    programIndicators,
                                    indicators,
                                },
                                healthServices,
                                context
                            )
                        )
                    )
                )
            )
        );
    }

    private getHealthServices(context: AccessContext): FutureData<HealthService[]> {
        const { settings } = context;
        const groupSet = settings.healthServiceGroupSet;

        return settings.showsHealthServiceColumns() && groupSet
            ? this.healthServiceRepository.getHealthServices(groupSet.id)
            : Future.success([]);
    }
}
