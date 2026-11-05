import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Program, ProgramResource } from "$/domain/entities/Program";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

/** The resources chosen in the program's attribute first, then its event charts and reports. */
export class GetProgramResourcesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program): FutureData<ProgramResource[]> {
        const chosen: FutureData<ProgramResource[]> =
            program.resourceIds.length > 0
                ? this.programRepository.getResources(program.resourceIds)
                : Future.success([]);

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
