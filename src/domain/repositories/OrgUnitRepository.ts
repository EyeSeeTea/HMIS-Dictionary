import { FutureData } from "$/domain/entities/generic/Future";
import { AssignedOrgUnit } from "$/domain/entities/OrgUnitTree";
import { Id, NamedRef } from "$/domain/entities/Ref";

export type OrgUnitOwner = { type: "dataSets" | "programs"; id: Id };

export interface OrgUnitRepository {
    getAssigned(owner: OrgUnitOwner): FutureData<AssignedOrgUnit[]>;
    getNames(ids: Id[]): FutureData<NamedRef[]>;
    getUserRootIds(): FutureData<Id[]>;
}
