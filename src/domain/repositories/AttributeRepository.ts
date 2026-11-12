import { Attribute } from "$/domain/entities/DossierConfigStatus";
import { FutureData } from "$/domain/entities/generic/Future";

export interface AttributeRepository {
    getAll(): FutureData<Attribute[]>;
}
