import { Future, FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";

export type AdminOptions = { userGroups: NamedRef[]; groupSets: NamedRef[] };

export class GetAdminOptionsUseCase {
    constructor(
        private healthServiceRepository: HealthServiceRepository,
        private userGroupRepository: UserGroupRepository
    ) {}

    execute(): FutureData<AdminOptions> {
        return Future.joinObj({
            userGroups: this.userGroupRepository.getAll(),
            groupSets: this.healthServiceRepository.getGroupSets(),
        });
    }
}
