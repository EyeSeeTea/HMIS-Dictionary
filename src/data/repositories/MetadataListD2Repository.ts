import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import {
    MetadataListModel,
    MetadataListRepository,
} from "$/domain/repositories/MetadataListRepository";
import { D2Api } from "$/types/d2-api";

export class MetadataListD2Repository implements MetadataListRepository {
    constructor(private api: D2Api) {}

    getAll(model: MetadataListModel): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.get<Record<string, NamedRef[]>>(`/${model}`, {
                fields: "id,name",
                paging: false,
            })
        ).map(response => response[model] ?? []);
    }
}
