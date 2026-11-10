import { Attribute } from "$/domain/entities/DossierConfigStatus";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import { AttributeRepository } from "$/domain/repositories/AttributeRepository";
import { ConstantRepository } from "$/domain/repositories/ConstantRepository";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";

export type AdminOptions = {
    userGroups: NamedRef[];
    groupSets: NamedRef[];
    attributes: Attribute[];
    constants: NamedRef[];
};

export class GetAdminOptionsUseCase {
    constructor(
        private healthServiceRepository: HealthServiceRepository,
        private userGroupRepository: UserGroupRepository,
        private attributeRepository: AttributeRepository,
        private constantRepository: ConstantRepository
    ) {}

    execute(): FutureData<AdminOptions> {
        return Future.joinObj({
            userGroups: this.userGroupRepository.getAll(),
            groupSets: this.healthServiceRepository.getGroupSets(),
            attributes: this.attributeRepository.getAll(),
            constants: this.constantRepository.getAll(),
        });
    }
}
