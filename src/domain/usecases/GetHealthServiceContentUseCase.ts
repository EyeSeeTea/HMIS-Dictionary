import { DossierCandidate, DossierDataSet, DossierIndicatorGroup } from "$/domain/entities/Dossier";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { DossierRepository } from "$/domain/repositories/DossierRepository";

export type HealthServiceContent = {
    dataSets: DossierDataSet[];
    indicatorGroups: DossierIndicatorGroup[];
};

export class GetHealthServiceContentUseCase {
    constructor(private dossierRepository: DossierRepository) {}

    execute(
        healthService: HealthService,
        excludedSectionName: string
    ): FutureData<HealthServiceContent> {
        const { dossierRepository } = this;

        const matching = (candidates: DossierCandidate[]) =>
            candidates.filter(candidate =>
                candidate.attributeValues.some(attribute =>
                    healthService.matchesAttributeValue(attribute.value)
                )
            );

        const dataSets = dossierRepository.getDataSets().flatMap(candidates =>
            Future.parallel(
                matching(candidates).map(({ id, name }) =>
                    dossierRepository.getSections(id).map(
                        (sections): DossierDataSet => ({
                            id: id,
                            name: name,
                            sections: sections.filter(
                                section => section.name !== excludedSectionName
                            ),
                        })
                    )
                ),
                { concurrency: 5 }
            )
        );

        const indicatorGroups = dossierRepository.getIndicatorGroups().flatMap(candidates =>
            Future.parallel(
                matching(candidates).map(({ id, name }) =>
                    dossierRepository
                        .getIndicators(id)
                        .map((indicators): DossierIndicatorGroup => ({ id, name, indicators }))
                ),
                { concurrency: 5 }
            )
        );

        return Future.joinObj({ dataSets, indicatorGroups });
    }
}
