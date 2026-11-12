import { AppSettings } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorVisualization } from "$/domain/entities/IndicatorVisualization";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";
import { VisualizationRepository } from "$/domain/repositories/VisualizationRepository";

export class SaveIndicatorVisualizationUseCase {
    constructor(
        private userGroupRepository: UserGroupRepository,
        private visualizationRepository: VisualizationRepository
    ) {}

    execute(source: Indicator | ProgramIndicator, settings: AppSettings): FutureData<Id> {
        const groupId = settings.metadataIds.allUsersGroup;

        const groupExists = groupId
            ? this.userGroupRepository.exists(groupId)
            : Future.success<Error, boolean>(false);

        return groupExists.flatMap(exists =>
            this.visualizationRepository.save(
                IndicatorVisualization.build(source, exists ? groupId : undefined)
            )
        );
    }
}
