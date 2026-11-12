import _ from "$/domain/entities/generic/Collection";
import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { AssignedOrgUnit } from "$/domain/entities/OrgUnitTree";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { OrgUnitOwner, OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";
import { D2Api } from "$/types/d2-api";
import { toNamedRef } from "./d2-mappers";

type D2OrgUnit = { id: string; displayName: string };

/** Keeps the URL of each request within what servers accept. */
const namesPerRequest = 100;

export class OrgUnitD2Repository implements OrgUnitRepository {
    constructor(private api: D2Api) {}

    getAssigned(owner: OrgUnitOwner): FutureData<AssignedOrgUnit[]> {
        return apiToFuture(
            this.api.get<{ organisationUnits: (D2OrgUnit & { path: string })[] }>(
                `/${owner.type}/${owner.id}`,
                { fields: "organisationUnits[id,displayName,path]" }
            )
        ).map(({ organisationUnits }) =>
            organisationUnits.map(orgUnit => ({ ...toNamedRef(orgUnit), path: orgUnit.path }))
        );
    }

    getNames(ids: Id[]): FutureData<NamedRef[]> {
        const requests = _(ids)
            .chunk(namesPerRequest)
            .map(chunk =>
                apiToFuture(
                    this.api.get<{ organisationUnits: D2OrgUnit[] }>("/organisationUnits", {
                        filter: `id:in:[${chunk.join(",")}]`,
                        fields: "id,displayName",
                        paging: false,
                    })
                ).map(({ organisationUnits }) => organisationUnits.map(toNamedRef))
            )
            .value();

        return Future.parallel(requests, { concurrency: 5 }).map(names => names.flat());
    }

    getUserRootIds(): FutureData<Id[]> {
        return apiToFuture(
            this.api.get<{ organisationUnits: { id: string }[] }>("/me", {
                fields: "organisationUnits[id]",
            })
        ).map(({ organisationUnits }) => organisationUnits.map(orgUnit => orgUnit.id));
    }
}
