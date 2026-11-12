import { DescribeExpressionsUseCase } from "$/domain/usecases/DescribeExpressionsUseCase";
import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { Progress } from "$/domain/entities/Shared";

export class DescribeIndicatorsUseCase {
    constructor(private describeExpressions: DescribeExpressionsUseCase) {}

    execute(
        indicators: Indicator[],
        onProgress?: (progress: Progress) => void
    ): FutureData<Indicator[]> {
        const expressions = indicators.flatMap(indicator => [
            indicator.numerator.expression,
            indicator.denominator.expression,
        ]);

        return this.describeExpressions
            .execute("indicator", expressions, onProgress)
            .map(texts =>
                indicators.map(indicator =>
                    indicator.withTexts(
                        texts.get(indicator.numerator.expression) ?? "",
                        texts.get(indicator.denominator.expression) ?? ""
                    )
                )
            );
    }
}
