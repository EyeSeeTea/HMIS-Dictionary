import { Maybe } from "$/utils/ts-utils";
import { Struct } from "./generic/Struct";
import { Id, NamedRef } from "./Ref";

export type FormulaToken =
    | { type: "dataElement"; dataElementId: Id; categoryOptionComboId: Maybe<Id> }
    | { type: "programDataElement"; programId: Id; dataElementId: Id }
    | { type: "programAttribute"; programId: Id; attributeId: Id }
    | { type: "programIndicator"; id: Id }
    | { type: "indicator"; id: Id }
    | { type: "orgUnitGroup"; id: Id }
    | { type: "constant"; id: Id }
    | { type: "number"; value: string }
    | { type: "operator"; value: "+" | "-" | "*" | "/" };

export type FormulaObject = NamedRef & {
    description: string;
    status: "active" | "blacklisted" | "notInUse";
};

export type FormulaIndicator = FormulaObject & {
    numerator: IndicatorFormula;
    denominator: IndicatorFormula;
};

export type FormulaLookup = {
    dataElements: Map<Id, FormulaObject>;
    programIndicators: Map<Id, FormulaObject>;
    indicators: Map<Id, FormulaIndicator>;
    categoryOptionCombos: Map<Id, NamedRef>;
};

export type FormulaOptions = {
    expandIndicators: boolean;
    maxDepth: number;
    /** Indicators that count as already visited, to detect cycles back to them. */
    visited: Set<Id>;
};

export type FormulaLegendItem = {
    id: Id;
    name: string;
    description: string;
    depth: number;
    order: number;
};

export type FormulaNode =
    | { type: "text"; value: string }
    | { type: "operator"; value: string }
    | {
          type: "object";
          object: FormulaObject;
          tag: Maybe<"programIndicator" | "indicator">;
          categoryOptionCombo: Maybe<string>;
      }
    | {
          type: "expanded";
          legend: FormulaLegendItem;
          numerator: FormulaNode[];
          denominator: FormulaNode[];
      }
    | { type: "cycle"; name: string };

export type FormulaTags = { blacklist: string; notInUse: string };

const tokenRegex = /([#IDAGCN])\{([^}]*)\}|(\d+(?:\.\d+)?)|([+\-*/])/g;

/**
 * Only #{}, I{} and N{} are replaced. An operator is only recognised after a closing brace and
 * before #, I or N. All the rest, as parentheses or D{}, stays as raw text.
 */
const resolveRegex =
    /(?<=\})\s*([+\-*])\s*(?=[#IN])|#\{(\w*)\}|#\{(\w*)\.(\w*)\}|I\{(\w*)\}|N\{(\w*)\}/g;

export type IndicatorFormulaAttrs = { expression: string };

export class IndicatorFormula extends Struct<IndicatorFormulaAttrs>() {
    tokens(): FormulaToken[] {
        return Array.from(this.expression.matchAll(tokenRegex)).flatMap(
            ([, letter, content = "", numberValue, operator]): FormulaToken[] => {
                if (numberValue) return [{ type: "number", value: numberValue }];
                if (operator) {
                    const value = operator as "+" | "-" | "*" | "/";
                    return [{ type: "operator", value }];
                }
                const [first = "", second] = content.split(".");

                switch (letter) {
                    case "#":
                        return [
                            {
                                type: "dataElement",
                                dataElementId: first,
                                categoryOptionComboId: second,
                            },
                        ];
                    case "D":
                        return [
                            {
                                type: "programDataElement",
                                programId: first,
                                dataElementId: second ?? "",
                            },
                        ];
                    case "A":
                        return [
                            {
                                type: "programAttribute",
                                programId: first,
                                attributeId: second ?? "",
                            },
                        ];
                    case "I":
                        return [{ type: "programIndicator", id: first }];
                    case "N":
                        return [{ type: "indicator", id: first }];
                    case "G":
                        return [{ type: "orgUnitGroup", id: first }];
                    case "C":
                        return [{ type: "constant", id: first }];
                    default:
                        return [];
                }
            }
        );
    }

    dataElementIds(): Id[] {
        return this.tokens().flatMap(token =>
            token.type === "dataElement" ? [token.dataElementId] : []
        );
    }

    hasNestedIndicators(): boolean {
        return /N\{\w+\}/.test(this.expression);
    }

    /** Only through #{de.coc}, not #{de}: the "Missed indicators" bug, kept until the end. */
    referencesAnyDataElement(ids: Id[]): boolean {
        return this.tokens().some(
            token =>
                token.type === "dataElement" &&
                token.categoryOptionComboId !== undefined &&
                ids.includes(token.dataElementId)
        );
    }

    referencesProgram(programId: Id, programIndicatorIds: Id[]): boolean {
        return this.tokens().some(token => {
            switch (token.type) {
                case "programDataElement":
                case "programAttribute":
                    return token.programId === programId;
                case "programIndicator":
                    return programIndicatorIds.includes(token.id);
                default:
                    return false;
            }
        });
    }

    visualizationItemIds(): Id[] {
        return Array.from(this.expression.matchAll(/[#IN]\{([^}]*)\}/g)).flatMap(([, id]) =>
            id ? [id] : []
        );
    }

    resolve(lookup: FormulaLookup, options: Partial<FormulaOptions> = {}): FormulaNode[] {
        return resolveExpression(this.expression, lookup, {
            expandIndicators: options.expandIndicators ?? false,
            maxDepth: options.maxDepth ?? 8,
            depth: 0,
            visited: options.visited ?? new Set(),
            legendById: new Map(),
        });
    }
}

type ResolveContext = FormulaOptions & {
    depth: number;
    visited: Set<Id>;
    legendById: Map<Id, FormulaLegendItem>;
};

function resolveExpression(
    expression: string,
    lookup: FormulaLookup,
    context: ResolveContext
): FormulaNode[] {
    const nodes: FormulaNode[] = [];
    let position = 0;

    for (const match of expression.matchAll(resolveRegex)) {
        const before = expression.slice(position, match.index);
        if (before) nodes.push({ type: "text", value: before });

        const [full, operator, dataElementId, comboDataElementId, comboId, piId, indicatorId] =
            match;

        if (operator !== undefined) {
            nodes.push({ type: "operator", value: operator });
        } else if (dataElementId !== undefined) {
            nodes.push(objectNode(lookup.dataElements.get(dataElementId), dataElementId));
        } else if (comboDataElementId !== undefined) {
            nodes.push(comboNode(comboDataElementId, comboId ?? "", lookup));
        } else if (piId !== undefined) {
            nodes.push(objectNode(lookup.programIndicators.get(piId), piId, "programIndicator"));
        } else if (indicatorId !== undefined) {
            nodes.push(indicatorNode(indicatorId, lookup, context));
        }

        position = match.index + full.length;
    }

    const after = expression.slice(position);
    if (after) nodes.push({ type: "text", value: after });

    return nodes;
}

function objectNode(
    object: Maybe<FormulaObject>,
    id: Id,
    tag?: "programIndicator" | "indicator"
): FormulaNode {
    return object
        ? { type: "object", object, tag, categoryOptionCombo: undefined }
        : { type: "text", value: id };
}

function comboNode(dataElementId: Id, comboId: Id, lookup: FormulaLookup): FormulaNode {
    const comboName = lookup.categoryOptionCombos.get(comboId)?.name ?? comboId;
    const object = lookup.dataElements.get(dataElementId);

    return object
        ? { type: "object", object, tag: undefined, categoryOptionCombo: comboName }
        : { type: "text", value: `${dataElementId} (${comboName})` };
}

function indicatorNode(id: Id, lookup: FormulaLookup, context: ResolveContext): FormulaNode {
    const indicator = lookup.indicators.get(id);

    if (context.expandIndicators && context.visited.has(id))
        return { type: "cycle", name: indicator?.name ?? id };

    if (!indicator || !context.expandIndicators || context.depth >= context.maxDepth)
        return objectNode(indicator, id, "indicator");

    const legend = getLegendItem(indicator, context);

    const nested: ResolveContext = {
        ...context,
        depth: context.depth + 1,
        visited: new Set([...context.visited, id]),
    };

    return {
        type: "expanded",
        legend: legend,
        numerator: resolveExpression(indicator.numerator.expression, lookup, nested),
        denominator: resolveExpression(indicator.denominator.expression, lookup, nested),
    };
}

function getLegendItem(indicator: FormulaIndicator, context: ResolveContext): FormulaLegendItem {
    const existing = context.legendById.get(indicator.id);
    if (existing) return existing;

    const legend: FormulaLegendItem = {
        id: indicator.id,
        name: indicator.name,
        description: indicator.description,
        depth: context.depth + 1,
        order: context.legendById.size,
    };

    context.legendById.set(indicator.id, legend);
    return legend;
}

/** The indicators expanded in these nodes, in the order they were first found. */
export function getFormulaLegend(nodes: FormulaNode[]): FormulaLegendItem[] {
    const items = new Map<Id, FormulaLegendItem>();

    const visit = (node: FormulaNode): void => {
        if (node.type !== "expanded") return;
        items.set(node.legend.id, node.legend);
        node.numerator.forEach(visit);
        node.denominator.forEach(visit);
    };

    nodes.forEach(visit);

    return Array.from(items.values()).sort((a, b) => a.order - b.order);
}

/** The text of the nodes, for filters and for Excel: tags included, no tooltips. */
export function formulaToPlainText(nodes: FormulaNode[], tags: FormulaTags): string {
    return nodes.map(node => nodeToPlainText(node, tags)).join("");
}

function nodeToPlainText(node: FormulaNode, tags: FormulaTags): string {
    switch (node.type) {
        case "text":
            return node.value;
        case "operator":
            return `\n${node.value} `;
        case "cycle":
            return `[cyclic indicator reference: ${node.name}]`;
        case "expanded": {
            const numerator = formulaToPlainText(node.numerator, tags);
            const denominator = formulaToPlainText(node.denominator, tags);
            return `[${numerator} / ${denominator}]`;
        }
        case "object": {
            const status = statusTag(node.object, tags);
            const tag = node.tag ? ` (${node.tag}) ` : "";
            const combo = node.categoryOptionCombo ? ` (${node.categoryOptionCombo})` : "";
            return `${status}${node.object.name}${tag}${combo}`;
        }
    }
}

function statusTag(object: FormulaObject, tags: FormulaTags): string {
    switch (object.status) {
        case "notInUse":
            return ` [${tags.notInUse}] `;
        case "blacklisted":
            return ` [${tags.blacklist}] `;
        case "active":
            return "";
    }
}
