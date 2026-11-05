import React from "react";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";
import css from "./Admin.module.css";
import { compareNames } from "$/webapp/utils/compare";

export type SettingSelectProps = {
    label: string;
    options: NamedRef[];
    /** What is stored now. */
    savedId: Maybe<Id>;
    onSubmit: (selected: NamedRef) => void;
    disabled?: boolean;
    /** Ids of the select and of its button, as in the Angular app. */
    selectId: string;
    submitId: string;
};

/** A select with its Submit button, which only enables once there is a different selection. */
export const SettingSelect: React.FC<SettingSelectProps> = React.memo(props => {
    const { label, options, savedId, onSubmit, disabled, selectId, submitId } = props;
    const [selectedId, setSelectedId] = React.useState<Maybe<Id>>(savedId);

    const sorted = React.useMemo(
        () => [...options].sort((a, b) => compareNames(a.name, b.name)),
        [options]
    );
    const selected = sorted.find(option => option.id === selectedId);
    const isDisabled = disabled || !selected || selected.id === savedId;

    return (
        <div className={css.inline}>
            <select
                id={selectId}
                className={css.select}
                aria-label={label}
                value={selected?.id ?? ""}
                onChange={event => setSelectedId(event.target.value || undefined)}
            >
                <option value="" disabled>
                    {i18n.t("Select...")}
                </option>
                {sorted.map(option => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                id={submitId}
                className={`${css.submit}${isDisabled ? " disabled" : ""}`}
                disabled={isDisabled}
                onClick={() => selected && onSubmit(selected)}
            >
                {i18n.t("Submit")}
            </button>
        </div>
    );
});
