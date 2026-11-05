import { CategoryCombo, DataSet } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";
import { Id, NamedRef } from "$/domain/entities/Ref";

export interface DataSetRepository {
    getAll(excludedIds: Id[]): FutureData<NamedRef[]>;
    /** Only those assigned to one of these org units or to their descendants. */
    getAllInOrgUnits(excludedIds: Id[], orgUnitIds: Id[]): FutureData<NamedRef[]>;
    getByName(name: string): FutureData<NamedRef[]>;
    get(id: Id): FutureData<DataSet>;
    getCategoryCombos(ids: Id[]): FutureData<CategoryCombo[]>;
}
