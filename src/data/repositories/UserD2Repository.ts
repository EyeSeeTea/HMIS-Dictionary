import { User } from "$/domain/entities/User";
import { UserRepository } from "$/domain/repositories/UserRepository";
import { D2Api, MetadataPick } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";

export class UserD2Repository implements UserRepository {
    constructor(private api: D2Api) {}

    getCurrent(): FutureData<User> {
        return apiToFuture(
            this.api.currentUser.get({
                fields: userFields,
            })
        ).map(d2User => this.buildUser(d2User));
    }

    private buildUser(d2User: D2User): User {
        return new User({
            id: d2User.id,
            name: d2User.name,
            username: d2User.username,
            userGroups: d2User.userGroups.map(({ id, name }) => ({ id, name })),
        });
    }
}

const userFields = {
    id: true,
    name: true,
    username: true,
    userGroups: { id: true, name: true },
} as const;

type D2User = MetadataPick<{ users: { fields: typeof userFields } }>["users"][number];
