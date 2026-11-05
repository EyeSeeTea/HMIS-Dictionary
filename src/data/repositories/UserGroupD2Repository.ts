import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";
import { D2Api } from "$/types/d2-api";

export class UserGroupD2Repository implements UserGroupRepository {
    constructor(private api: D2Api) {}

    getAll(): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.userGroups.get({ fields: { id: true, name: true }, paging: false })
        ).map(({ objects }) => objects);
    }

    exists(id: Id): FutureData<boolean> {
        // A missing group answers 404, which is the answer and not a failure
        return apiToFuture(this.api.get<{ id: Id }>(`/userGroups/${id}`, { fields: "id" }))
            .map(group => group.id === id)
            .flatMapError(() => Future.success(false));
    }
}
