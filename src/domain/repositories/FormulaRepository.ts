import { FormulaReferences } from "$/domain/entities/FormulaBreakdown";
import { FutureData } from "$/domain/entities/generic/Future";
import { FormulaToken } from "$/domain/entities/IndicatorFormula";

export interface FormulaRepository {
    /** Names of every reference: #{}, I{}, N{}, G{}, C{}, A{}, and the two parts of D{}. */
    getReferences(tokens: FormulaToken[]): FutureData<FormulaReferences>;
}
