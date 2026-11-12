import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";

export class GetUserGroupsUseCase {
    constructor(private userGroupRepository: UserGroupRepository) {}

    execute(): FutureData<NamedRef[]> {
        return this.userGroupRepository.getAll();
    }
}
