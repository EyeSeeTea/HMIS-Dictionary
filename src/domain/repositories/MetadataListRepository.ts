import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";

/** The metadata whose ids are listed in the Admin settings (blacklists, not in use, legacy). */
export type MetadataListModel =
    | "dataElementGroups"
    | "dataSets"
    | "programs"
    | "indicatorGroups"
    | "programIndicatorGroups"
    | "optionGroups";

export interface MetadataListRepository {
    getAll(model: MetadataListModel): FutureData<NamedRef[]>;
}
