import { FutureData } from "$/domain/entities/generic/Future";
import { Program, ProgramAttribute, ProgramResource } from "$/domain/entities/Program";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { ProgramRule, ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { ProgramStage } from "$/domain/entities/ProgramStage";
import { Id } from "$/domain/entities/Ref";

export interface ProgramRepository {
    getAll(): FutureData<Program[]>;
    getByName(name: string): FutureData<Program[]>;
    getStages(ids: Id[]): FutureData<ProgramStage[]>;
    getAttributes(programId: Id): FutureData<ProgramAttribute[]>;
    getIndicators(programId: Id): FutureData<ProgramIndicator[]>;
    getRules(programId: Id): FutureData<ProgramRule[]>;
    getRuleVariables(programId: Id): FutureData<ProgramRuleVariable[]>;
    getResources(ids: Id[]): FutureData<ProgramResource[]>;
    getOptionIdsOfGroups(ids: Id[]): FutureData<Set<Id>>;
}
