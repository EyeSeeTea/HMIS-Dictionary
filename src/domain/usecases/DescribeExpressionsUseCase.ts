import { ExpressionKind } from "$/domain/entities/ExpressionDescription";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Progress } from "$/domain/entities/Shared";
import { ExpressionRepository } from "$/domain/repositories/ExpressionRepository";

/** One request per unique expression, in sequence. Returns display texts by raw expression. */

export class DescribeExpressionsUseCase {
    constructor(private expressionRepository: ExpressionRepository) {}

    execute(
        kind: ExpressionKind,
        expressions: string[],
        onProgress?: (progress: Progress) => void
    ): FutureData<Map<string, string>> {
        const unique = Array.from(new Set(expressions.filter(Boolean)));
        onProgress?.({ current: 0, total: unique.length });

        const describeAll = unique.map((expression, index) =>
            this.expressionRepository.describe(kind, expression).map(description => {
                onProgress?.({ current: index + 1, total: unique.length });
                return [expression, description.toDisplayText(kind, expression)] as const;
            })
        );

        return Future.sequential(describeAll).map(entries => new Map(entries));
    }
}
