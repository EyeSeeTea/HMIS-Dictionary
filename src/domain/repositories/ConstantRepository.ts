import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";

export interface ConstantRepository {
    getAll(): FutureData<NamedRef[]>;
}
