import { Future, FutureData } from "$/domain/entities/generic/Future";
import { AppSettings } from "$/domain/entities/AppSettings";
import { getResourceIds, Program, ProgramResource } from "$/domain/entities/Program";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

/** The resources chosen in the program's attribute first, then its event charts and reports. */
export class GetProgramResourcesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program, settings: AppSettings): FutureData<ProgramResource[]> {
        const ids = getResourceIds(program, settings.metadataIds.programResourcesAttribute);
        const chosen: FutureData<ProgramResource[]> =
            ids.length > 0 ? this.programRepository.getResources(ids) : Future.success([]);

        return chosen.flatMap(chosenResources =>
            this.programRepository.getEventResources(program.id).map(eventResources => {
                const chosenIds = new Set(chosenResources.map(resource => resource.id));

                return [
                    ...chosenResources,
                    ...eventResources.filter(resource => !chosenIds.has(resource.id)),
                ];
            })
        );
    }
}
