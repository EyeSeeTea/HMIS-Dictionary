import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import { ConstantRepository } from "$/domain/repositories/ConstantRepository";
import { D2Api } from "$/types/d2-api";

export class ConstantD2Repository implements ConstantRepository {
    constructor(private api: D2Api) {}

    getAll(): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.constants.get({ fields: { id: true, name: true }, paging: false })
        ).map(({ objects }) => objects);
    }
}
