import { User } from "$/domain/entities/User";
import { createUser } from "$/domain/entities/__tests__/userFixtures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { UserRepository } from "$/domain/repositories/UserRepository";

export class UserTestRepository implements UserRepository {
    getCurrent(): FutureData<User> {
        return Future.success(createUser());
    }
}
