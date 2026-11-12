import { AppSettings } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";

export class GetHealthServicesUseCase {
    constructor(private healthServiceRepository: HealthServiceRepository) {}

    execute(settings: AppSettings): FutureData<HealthService[]> {
        const { healthServiceGroupSet } = settings;

        return healthServiceGroupSet
            ? this.healthServiceRepository.getHealthServices(healthServiceGroupSet.id)
            : Future.success([]);
    }
}
