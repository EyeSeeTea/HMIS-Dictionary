import { AppSettings } from "$/domain/entities/AppSettings";
import { HealthService } from "$/domain/entities/HealthService";
import { DossierConfigStatus } from "$/domain/entities/DossierConfigStatus";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";
import { AttributeRepository } from "$/domain/repositories/AttributeRepository";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";

export type DossierConfigStatusResult = { status: DossierConfigStatus; changed: boolean };

export class RefreshDossierConfigStatusUseCase {
    constructor(
        private appSettingsRepository: AppSettingsRepository,
        private attributeRepository: AttributeRepository,
        private healthServiceRepository: HealthServiceRepository
    ) {}

    execute(settings: AppSettings): FutureData<DossierConfigStatusResult> {
        const groupSet = settings.healthServiceGroupSet;

        return Future.joinObj({
            attributes: this.attributeRepository.getAll(),
            healthServices: groupSet
                ? this.healthServiceRepository.getHealthServices(groupSet.id)
                : Future.success<Error, HealthService[]>([]),
        }).flatMap(({ attributes, healthServices }) => {
            const status = DossierConfigStatus.build(settings, healthServices, attributes);
            const isComplete = status.isComplete();

            // No write if the attribute check does not pass, so the flag can stay true (decision 6)
            if (!status.healthServiceAttribute || isComplete === settings.dossierConfigComplete)
                return Future.success<Error, DossierConfigStatusResult>({ status, changed: false });

            return this.appSettingsRepository
                .update({ dossierConfigComplete: isComplete })
                .map(() => ({ status, changed: true }));
        });
    }
}
