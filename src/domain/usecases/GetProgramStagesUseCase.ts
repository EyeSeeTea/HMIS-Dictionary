import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { LegacyOptions, ProgramStage } from "$/domain/entities/ProgramStage";
import { Program } from "$/domain/entities/Program";
import { ProgramRule, ProgramRuleSet } from "$/domain/entities/ProgramRule";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramStagesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(
        program: Program,
        rules: ProgramRule[],
        settings: AppSettings,
        options: LegacyOptions
    ): FutureData<ProgramStage[]> {
        const ruleSet = ProgramRuleSet.create({ rules });

        return this.programRepository
            .getStages(program.stageIds)
            .map(stages =>
                stages.map(stage => stage.withRules(ruleSet).forDisplay(settings, options))
            );
    }
}
