import { Struct } from "./generic/Struct";

export type ExpressionKind = "indicator" | "programIndicatorExpression" | "programIndicatorFilter";

export type ExpressionDescriptionAttrs = {
    result: { ok: true; text: string } | { ok: false; message: string; description: string };
};

export class ExpressionDescription extends Struct<ExpressionDescriptionAttrs>() {
    toDisplayText(kind: ExpressionKind, expression: string): string {
        const { result } = this;

        switch (kind) {
            case "indicator":
                return result.ok ? result.text : result.description;
            case "programIndicatorExpression":
                return result.ok
                    ? unescapeDots(result.text)
                    : `${result.message}: ${result.description} Expression: ${expression}`;
            case "programIndicatorFilter":
                if (!result.ok)
                    return `${result.message}: ${result.description}\n Filter: ${expression}`;
                // Stays as returned: bug P11, kept until the end
                return result.text.includes("Program stage id")
                    ? result.text
                    : unescapeDots(result.text);
        }
    }
}

function unescapeDots(text: string): string {
    return text.replaceAll("\\.", ".");
}
