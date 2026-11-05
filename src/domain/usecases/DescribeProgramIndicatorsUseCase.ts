import { DescribeExpressionsUseCase } from "$/domain/usecases/DescribeExpressionsUseCase";
import { FutureData } from "$/domain/entities/generic/Future";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { ProgramStage } from "$/domain/entities/ProgramStage";
import { Progress } from "$/domain/entities/Shared";

function unique(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

export class DescribeProgramIndicatorsUseCase {
    constructor(private describeExpressions: DescribeExpressionsUseCase) {}

    execute(
        programIndicators: ProgramIndicator[],
        stages: ProgramStage[],
        onProgress?: (progress: Progress) => void
    ): FutureData<ProgramIndicator[]> {
        const items = programIndicators.map(programIndicator => ({
            programIndicator: programIndicator,
            expression: programIndicator.expression.expression,
            // With the display stages, as today, so option names depend on showLegacy
            filter: programIndicator.filter.withOptionNames(stages).expression,
        }));

        const expressions = unique(items.map(item => item.expression));
        const filters = unique(items.map(item => item.filter));
        const total = expressions.length + filters.length;
        const report = (offset: number) => (progress: Progress) =>
            onProgress?.({ current: offset + progress.current, total });

        const { describeExpressions } = this;

        return describeExpressions
            .execute("programIndicatorExpression", expressions, report(0))
            .flatMap(expressionTexts =>
                describeExpressions
                    .execute("programIndicatorFilter", filters, report(expressions.length))
                    .map(filterTexts =>
                        items.map(item =>
                            item.programIndicator.withTexts(
                                expressionTexts.get(item.expression) ?? "",
                                filterTexts.get(item.filter) ?? ""
                            )
                        )
                    )
            );
    }
}
