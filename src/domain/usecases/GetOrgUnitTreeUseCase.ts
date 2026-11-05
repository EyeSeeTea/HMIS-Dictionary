import { FutureData } from "$/domain/entities/generic/Future";
import { OrgUnitTree } from "$/domain/entities/OrgUnitTree";
import { OrgUnitOwner, OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";

/** Starts from the item, as loading the whole hierarchy of a large instance is too slow. */
export class GetOrgUnitTreeUseCase {
    constructor(private orgUnitRepository: OrgUnitRepository) {}

    execute(owner: OrgUnitOwner): FutureData<OrgUnitTree> {
        return this.orgUnitRepository
            .getAssigned(owner)
            .flatMap(assigned =>
                this.orgUnitRepository
                    .getUserRootIds()
                    .flatMap(userRootIds =>
                        this.orgUnitRepository
                            .getNames(OrgUnitTree.getAncestorIds(assigned, userRootIds))
                            .map(ancestors =>
                                OrgUnitTree.build({ assigned, userRootIds, ancestors })
                            )
                    )
            );
    }
}
