import { Attribute } from "$/domain/entities/DossierConfigStatus";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import { AttributeRepository } from "$/domain/repositories/AttributeRepository";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import {
    MetadataListModel,
    MetadataListRepository,
} from "$/domain/repositories/MetadataListRepository";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";

export type AdminOptions = {
    userGroups: NamedRef[];
    groupSets: NamedRef[];
    attributes: Attribute[];
    lists: Record<MetadataListModel, NamedRef[]>;
};

export class GetAdminOptionsUseCase {
    constructor(
        private healthServiceRepository: HealthServiceRepository,
        private userGroupRepository: UserGroupRepository,
        private attributeRepository: AttributeRepository,
        private metadataListRepository: MetadataListRepository
    ) {}

    execute(): FutureData<AdminOptions> {
        const list = (model: MetadataListModel) => this.metadataListRepository.getAll(model);

        return Future.joinObj({
            userGroups: this.userGroupRepository.getAll(),
            groupSets: this.healthServiceRepository.getGroupSets(),
            attributes: this.attributeRepository.getAll(),
            lists: Future.joinObj({
                dataElementGroups: list("dataElementGroups"),
                dataSets: list("dataSets"),
                programs: list("programs"),
                indicatorGroups: list("indicatorGroups"),
                programIndicatorGroups: list("programIndicatorGroups"),
                optionGroups: list("optionGroups"),
            }),
        });
    }
}
