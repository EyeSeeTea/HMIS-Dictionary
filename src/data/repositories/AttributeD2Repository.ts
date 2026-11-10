import { apiToFuture } from "$/data/api-futures";
import { Attribute } from "$/domain/entities/DossierConfigStatus";
import { FutureData } from "$/domain/entities/generic/Future";
import { AttributeRepository } from "$/domain/repositories/AttributeRepository";
import { D2Api } from "$/types/d2-api";

export class AttributeD2Repository implements AttributeRepository {
    constructor(private api: D2Api) {}

    getAll(): FutureData<Attribute[]> {
        return apiToFuture(
            this.api.models.attributes.get({
                fields: {
                    id: true,
                    name: true,
                    dataSetAttribute: true,
                    indicatorGroupAttribute: true,
                    dataElementAttribute: true,
                    programAttribute: true,
                },
                paging: false,
            })
        ).map(({ objects }) => objects);
    }
}
