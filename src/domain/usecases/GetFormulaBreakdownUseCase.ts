import { FormulaBreakdown } from "$/domain/entities/FormulaBreakdown";
import { FutureData } from "$/domain/entities/generic/Future";
import { IndicatorFormula } from "$/domain/entities/IndicatorFormula";
import { FormulaRepository } from "$/domain/repositories/FormulaRepository";

export class GetFormulaBreakdownUseCase {
    constructor(private formulaRepository: FormulaRepository) {}

    execute(formula: IndicatorFormula): FutureData<FormulaBreakdown> {
        return this.formulaRepository
            .getReferences(formula.tokens())
            .map(references => FormulaBreakdown.build(formula, references));
    }
}
