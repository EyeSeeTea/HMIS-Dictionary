import { apiToFuture } from "$/data/api-futures";
import { ExpressionDescription, ExpressionKind } from "$/domain/entities/ExpressionDescription";
import { FutureData } from "$/domain/entities/generic/Future";
import { ExpressionRepository } from "$/domain/repositories/ExpressionRepository";
import { D2Api } from "$/types/d2-api";

const urls: Record<ExpressionKind, string> = {
    indicator: "/indicators/expression/description",
    programIndicatorExpression: "/programIndicators/expression/description",
    programIndicatorFilter: "/programIndicators/filter/description",
};

type D2Description = { status?: string; message?: string; description?: string };

export class ExpressionD2Repository implements ExpressionRepository {
    constructor(private api: D2Api) {}

    describe(kind: ExpressionKind, expression: string): FutureData<ExpressionDescription> {
        return apiToFuture(
            this.api.request<D2Description>({
                method: "post",
                url: urls[kind],
                data: expression,
                requestBodyType: "raw",
                headers: { "Content-Type": "text/plain" },
                // An invalid expression comes as a conflict, with the reason in the body
                validateStatus: status => status === 409 || (status >= 200 && status < 300),
            })
        ).map(response =>
            ExpressionDescription.create({
                result:
                    response.status === "ERROR"
                        ? {
                              ok: false,
                              message: response.message ?? "",
                              description: response.description ?? "",
                          }
                        : { ok: true, text: response.description ?? "" },
            })
        );
    }
}
