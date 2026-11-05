import { FutureData } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { Id, NamedRef } from "$/domain/entities/Ref";

export interface HealthServiceRepository {
    getGroupSets(): FutureData<NamedRef[]>;
    getHealthServices(groupSetId: Id): FutureData<HealthService[]>;
}
