import { Future, FutureData } from "$/domain/entities/generic/Future";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import { LayoutSettingsRepository } from "$/domain/repositories/LayoutSettingsRepository";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";

export class InvalidAdvancedUserGroupsError extends Error {
    constructor() {
        super("Some advanced user groups do not exist");
    }
}

export class SaveLayoutSettingsUseCase {
    constructor(
        private layoutSettingsRepository: LayoutSettingsRepository,
        private userGroupRepository: UserGroupRepository
    ) {}

    execute(settings: LayoutSettings): FutureData<void> {
        return this.userGroupRepository.getAll().flatMap(userGroups => {
            const isValid = settings.advancedUserGroupIds.every(id =>
                userGroups.some(userGroup => userGroup.id === id)
            );

            return isValid
                ? this.layoutSettingsRepository.save(settings)
                : Future.error(new InvalidAdvancedUserGroupsError());
        });
    }
}
