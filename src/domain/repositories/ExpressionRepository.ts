import { ExpressionDescription, ExpressionKind } from "$/domain/entities/ExpressionDescription";
import { FutureData } from "$/domain/entities/generic/Future";

export interface ExpressionRepository {
    describe(kind: ExpressionKind, expression: string): FutureData<ExpressionDescription>;
}
