import React from "react";
import { FormulaNode, FormulaTags } from "$/domain/entities/IndicatorFormula";
import i18n from "$/utils/i18n";
import css from "./FormulaView.module.css";

/** Colours of the expanded indicators, by the order of their legend entry. */
export const legendColors = ["#d6eaf8", "#fdebd0", "#d5f5e3", "#f5eef8", "#fadbd8", "#fcf3cf"];

export function getLegendColor(order: number): string {
    return legendColors[order % legendColors.length] ?? "#eee";
}

export type FormulaViewProps = { nodes: FormulaNode[]; tags: FormulaTags };

/** Operators go on a new line, objects show their description on hover, and tags flag hidden ones. */
export const FormulaView: React.FC<FormulaViewProps> = React.memo(({ nodes, tags }) => {
    return (
        <span className={css.formula}>
            {nodes.map((node, index) => (
                <FormulaNodeView key={index} node={node} tags={tags} />
            ))}
        </span>
    );
});

const FormulaNodeView: React.FC<{ node: FormulaNode; tags: FormulaTags }> = ({ node, tags }) => {
    switch (node.type) {
        case "text":
            return <>{node.value}</>;
        case "operator":
            return (
                <>
                    <br />
                    <b>{node.value}</b>{" "}
                </>
            );
        case "cycle":
            return <em>{i18n.t("[cyclic indicator reference: {{name}}]", { name: node.name })}</em>;
        case "object": {
            const { object } = node;
            const status =
                object.status === "notInUse"
                    ? tags.notInUse
                    : object.status === "blacklisted"
                      ? tags.blacklist
                      : undefined;

            return (
                <span className={`tooltipcontainer ${css.object}`}>
                    {status && <span className={css.status}>[{status}] </span>}
                    {object.name}
                    {node.tag && ` (${node.tag})`}
                    {node.categoryOptionCombo && ` (${node.categoryOptionCombo})`}
                    {object.description && (
                        <span className={`tooltiptext ${css.tooltip}`}>{object.description}</span>
                    )}
                </span>
            );
        }
        case "expanded":
            return (
                <span
                    className={css.expanded}
                    style={{ background: getLegendColor(node.legend.order) }}
                    title={node.legend.description || node.legend.name}
                >
                    [<FormulaView nodes={node.numerator} tags={tags} /> /{" "}
                    <FormulaView nodes={node.denominator} tags={tags} />]
                </span>
            );
    }
};
