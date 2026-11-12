import { FutureData } from "$/domain/entities/generic/Future";
import { Program } from "$/domain/entities/Program";
import { ProgramRule, ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";

export class GetProgramRuleVariablesUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(program: Program, rules: ProgramRule[]): FutureData<ProgramRuleVariable[]> {
        return this.programRepository
            .getRuleVariables(program.id)
            .map(variables => variables.map(variable => variable.withAssociatedRules(rules)));
    }
}
