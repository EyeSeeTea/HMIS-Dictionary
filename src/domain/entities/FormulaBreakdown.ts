import { Struct } from "./generic/Struct";
import { FormulaToken, IndicatorFormula } from "./IndicatorFormula";
import { MetadataIds } from "./MetadataIds";
import { Id } from "./Ref";

export type FormulaComponent = {
    type:
        | "aggregateDataElement"
        | "trackerDataElement"
        | "programIndicator"
        | "orgUnitGroup"
        | "number";
    name: string;
    dataSetNames: string[];
    programNames: string[];
};

export type FormulaReferences = {
    names: Map<Id, string>;
    dataSetNames: Map<Id, string[]>;
};

/** The two constants the app knows, shown if the constants cannot be read. */
export type KnownConstants = Pick<MetadataIds, "constantZero" | "constantOne">;

type References = FormulaReferences & { constants: KnownConstants };

export type FormulaBreakdownAttrs = { text: string; components: FormulaComponent[] };

export class FormulaBreakdown extends Struct<FormulaBreakdownAttrs>() {
    static build(
        formula: IndicatorFormula,
        formulaReferences: FormulaReferences,
        constants: KnownConstants
    ): FormulaBreakdown {
        const references: References = { ...formulaReferences, constants };
        const tokens = formula.tokens();
        const operands = tokens.filter(token => token.type !== "operator");
        const operators = tokens.flatMap(token => (token.type === "operator" ? [token.value] : []));

        const text = operands
            .map((token, index) => {
                const operator = operators[index];
                const name = operandText(token, references);
                return operator ? `${name} ${operator}` : name;
            })
            .join(" ");

        return FormulaBreakdown.create({
            text: text,
            components: operands.flatMap(token => toComponents(token, references)),
        });
    }
}

function constantValue(id: Id, constants: KnownConstants): string | undefined {
    if (id === constants.constantZero) return "0";
    if (id === constants.constantOne) return "1";
    return undefined;
}

function nameOf(id: Id, references: FormulaReferences): string {
    return references.names.get(id) ?? id;
}

function operandText(token: FormulaToken, references: References): string {
    switch (token.type) {
        case "dataElement": {
            const name = nameOf(token.dataElementId, references);
            const combo = token.categoryOptionComboId;
            return combo ? `${name} ${nameOf(combo, references)}` : name;
        }
        case "programDataElement":
            return `${nameOf(token.programId, references)} ${nameOf(token.dataElementId, references)}`;
        case "programAttribute":
            return `${nameOf(token.programId, references)} ${nameOf(token.attributeId, references)}`;
        case "constant":
            return (
                references.names.get(token.id) ??
                constantValue(token.id, references.constants) ??
                token.id
            );
        case "number":
        case "operator":
            return token.value;
        default:
            return nameOf(token.id, references);
    }
}

function toComponents(token: FormulaToken, references: References): FormulaComponent[] {
    const base = { dataSetNames: [], programNames: [] };

    switch (token.type) {
        case "dataElement":
            return [
                {
                    ...base,
                    type: "aggregateDataElement",
                    name: nameOf(token.dataElementId, references),
                    dataSetNames: references.dataSetNames.get(token.dataElementId) ?? [],
                },
            ];
        case "programDataElement":
            return [
                {
                    ...base,
                    type: "trackerDataElement",
                    name: nameOf(token.dataElementId, references),
                    programNames: [nameOf(token.programId, references)],
                },
            ];
        case "programIndicator":
            return [{ ...base, type: "programIndicator", name: nameOf(token.id, references) }];
        case "orgUnitGroup":
            return [{ ...base, type: "orgUnitGroup", name: nameOf(token.id, references) }];
        case "number":
            return [{ ...base, type: "number", name: token.value }];
        case "constant": {
            // The value comes from the constants; the two known ones are the fallback
            const value =
                references.names.get(token.id) ?? constantValue(token.id, references.constants);
            return value ? [{ ...base, type: "number", name: value }] : [];
        }
        default:
            return [];
    }
}
