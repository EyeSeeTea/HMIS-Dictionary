import { FutureData } from "$/domain/entities/generic/Future";
import { Id, NamedRef } from "$/domain/entities/Ref";

export interface UserGroupRepository {
    getAll(): FutureData<NamedRef[]>;
    exists(id: Id): FutureData<boolean>;
}
