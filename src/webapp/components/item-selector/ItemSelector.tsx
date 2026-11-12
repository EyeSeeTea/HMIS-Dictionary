import React from "react";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import css from "./ItemSelector.module.css";
import { compareNames } from "$/webapp/utils/compare";

export type ItemSelectorProps = {
    /** The placeholder, for example "Select a Data Set". */
    label: string;
    items: NamedRef[];
    selectedId: Maybe<Id>;
    onChange: (id: Maybe<Id>) => void;
    /** "N items" text, already translated by the page. */
    counterText?: string;
    loading?: boolean;
    children?: React.ReactNode;
};

/** A native select over a list sorted by name, with a counter. Used by every module but Search. */
export const ItemSelector: React.FC<ItemSelectorProps> = React.memo(props => {
    const { label, items, selectedId, onChange, counterText, children } = props;

    const sorted = React.useMemo(
        () => [...items].sort((a, b) => compareNames(a.name, b.name)),
        [items]
    );

    const selected = sorted.some(item => item.id === selectedId) ? selectedId : "";

    return (
        <div className={`${css.selector} no-print`} data-test="item-selector">
            <select
                id="drpBoxServices"
                className={css.select}
                aria-label={label}
                value={selected}
                onChange={event => onChange(event.target.value || undefined)}
            >
                <option value="" disabled>
                    {label}
                </option>
                {sorted.map(item => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </select>

            {counterText && <span className={css.counter}>{counterText}</span>}
            {children && <div className={css.extra}>{children}</div>}
        </div>
    );
});
