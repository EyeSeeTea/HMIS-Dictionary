import { AccessContext } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { usesRareTokens } from "$/domain/entities/IndicatorFormula";
import {
    SearchCatalog,
    SearchIndicatorSource,
    SearchSources,
} from "$/domain/entities/SearchCatalog";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import { SearchRepository } from "$/domain/repositories/SearchRepository";

export type SearchStep =
    | "dataElements"
    | "programs"
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
                step("programs", () => searchRepository.getPrograms()).flatMap(programs =>
                    step("categoryOptionCombos", () =>
                        searchRepository.getCategoryOptionCombos()
                    ).flatMap(categoryOptionCombos =>
                        step("programIndicators", () =>
                            searchRepository.getProgramIndicators()
                        ).flatMap(programIndicators =>
                            step("indicators", () => searchRepository.getIndicators()).flatMap(
                                indicators =>
                                    this.getRareTokenSources(indicators).map(rareTokenSources =>
                                        SearchCatalog.build(
                                            {
                                                dataElements,
                                                programs,
                                                categoryOptionCombos,
                                                programIndicators,
                                                indicators,
                                                ...rareTokenSources,
                                            },
                                            healthServices,
                                            context
                                        )
                                    )
                            )
                        )
                    )
                )
            )
        );
    }

    private getRareTokenSources(
        indicators: SearchIndicatorSource[]
    ): FutureData<Pick<SearchSources, "dataElementGroups" | "categoryOptions">> {
        const isUsed = indicators.some(
            indicator =>
                usesRareTokens(indicator.numerator) || usesRareTokens(indicator.denominator)
        );
        if (!isUsed) return Future.success({ dataElementGroups: [], categoryOptions: [] });

        return this.searchRepository
            .getDataElementGroups()
            .flatMap(dataElementGroups =>
                this.searchRepository
                    .getCategoryOptions()
                    .map(categoryOptions => ({ dataElementGroups, categoryOptions }))
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
