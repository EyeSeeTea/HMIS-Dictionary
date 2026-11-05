import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import { D2Api } from "$/types/d2-api";
import { text } from "./d2-mappers";

export class HealthServiceD2Repository implements HealthServiceRepository {
    constructor(private api: D2Api) {}

    getGroupSets(): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.organisationUnitGroupSets.get({
                fields: { id: true, name: true },
                paging: false,
            })
        ).map(({ objects }) => objects);
    }

    getHealthServices(groupSetId: Id): FutureData<HealthService[]> {
        return apiToFuture(
            this.api.models.organisationUnitGroupSets.get({
                fields: {
                    organisationUnitGroups: { id: true, code: true, displayName: true },
                },
                filter: { id: { eq: groupSetId } },
                paging: false,
            })
        ).map(({ objects }) =>
            (objects[0]?.organisationUnitGroups ?? []).map(group =>
                HealthService.create({
                    id: group.id,
                    code: text(group.code),
                    name: group.displayName,
                })
            )
        );
    }
}
