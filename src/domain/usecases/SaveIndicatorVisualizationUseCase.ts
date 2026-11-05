import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorVisualization } from "$/domain/entities/IndicatorVisualization";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { hardcodedIds } from "$/domain/entities/HardcodedIds";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";
import { VisualizationRepository } from "$/domain/repositories/VisualizationRepository";

export class SaveIndicatorVisualizationUseCase {
    constructor(
        private userGroupRepository: UserGroupRepository,
        private visualizationRepository: VisualizationRepository
    ) {}

    execute(source: Indicator | ProgramIndicator): FutureData<Id> {
        return this.userGroupRepository
            .exists(hardcodedIds.allUsersGroup)
            .flatMap(allUsersGroupExists =>
                this.visualizationRepository.save(
                    IndicatorVisualization.build(source, allUsersGroupExists)
                )
            );
    }
}
