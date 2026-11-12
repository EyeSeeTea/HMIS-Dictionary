import React from "react";
import { Button, Modal } from "@dhis2/ui";
import {
    FormulaLookup,
    FormulaTags,
    getFormulaLegend,
    IndicatorFormula,
} from "$/domain/entities/IndicatorFormula";
import i18n from "$/utils/i18n";
import { FormulaView, getLegendColor } from "$/webapp/pages/search/FormulaView";
import { searchTexts } from "$/webapp/pages/search/searchTexts";
import css from "./FormulaDialog.module.css";

export type FormulaDialogProps = {
    title: string;
    indicatorId: string;
    formula: IndicatorFormula;
    lookup: FormulaLookup;
    tags: FormulaTags;
    onClose: () => void;
};

const minDepth = 1;
const maxDepthLimit = 10;
const defaultDepth = 3;

/** An indicator formula with its nested indicators expanded, up to a depth. */
export const FormulaDialog: React.FC<FormulaDialogProps> = React.memo(props => {
    const { title, indicatorId, formula, lookup, tags, onClose } = props;
    const [depth, setDepth] = React.useState(defaultDepth);

    const nodes = React.useMemo(
        () =>
            formula.resolve(lookup, {
                expandIndicators: true,
                maxDepth: depth,
                visited: new Set([indicatorId]),
            }),
        [formula, lookup, depth, indicatorId]
    );
    const legend = React.useMemo(() => getFormulaLegend(nodes), [nodes]);

    return (
        <Modal large position="top" onClose={onClose} dataTest="formula-dialog">
            <div id="indicatorFormulaModal" className={css.dialog}>
                <div className={`modal-header ${css.header}`}>
                    <h4>{title}</h4>
                </div>

                <div className={`modal-body ${css.content}`}>
                    <div className={css.depth}>
                        <label htmlFor="maxDepthInput">
                            {searchTexts.srch_formula_modal_max_depth()}
                        </label>
                        <input
                            id="maxDepthInput"
                            type="number"
                            min={minDepth}
                            max={maxDepthLimit}
                            value={depth}
                            onChange={event => {
                                const number = Number(event.target.value);
                                if (Number.isFinite(number) && event.target.value !== "") {
                                    setDepth(Math.min(maxDepthLimit, Math.max(minDepth, number)));
                                }
                            }}
                        />
                    </div>

                    {legend.length > 0 && (
                        <div className={`formula-legend ${css.legend}`}>
                            {legend.map(item => (
                                <div key={item.id} className={`formula-legend-item ${css.item}`}>
                                    <span
                                        className={`formula-legend-chip ${css.chip}`}
                                        style={{ background: getLegendColor(item.order) }}
                                    />
                                    <strong title={item.description || undefined}>
                                        {item.name}
                                    </strong>{" "}
                                    <span>({item.id})</span>
                                    {item.description && (
                                        <div className={css.description}>{item.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={css.body}>
                        <FormulaView nodes={nodes} tags={tags} />
                    </div>
                </div>

                <div className={`modal-footer ${css.footer}`}>
                    <Button onClick={onClose}>{i18n.t("Close")}</Button>
                </div>
            </div>
        </Modal>
    );
});
