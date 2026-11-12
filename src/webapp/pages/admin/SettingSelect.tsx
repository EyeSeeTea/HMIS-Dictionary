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
    /** `undefined` when the setting is cleared. */
    onSubmit: (selected: Maybe<NamedRef>) => void;
    disabled?: boolean;
    /** Ids of the select and of its button, as in the Angular app. */
    selectId: string;
    submitId: string;
};

/**
 * A select with its Submit button, which only enables once there is a different selection.
 * "None" clears the setting. A saved id not on the instance is shown by id, so it can be cleared.
 */
export const SettingSelect: React.FC<SettingSelectProps> = React.memo(props => {
    const { label, options, savedId, onSubmit, disabled, selectId, submitId } = props;
    const [selectedId, setSelectedId] = React.useState<Maybe<Id>>(savedId);

    const sorted = React.useMemo(() => {
        const byName = [...options].sort((a, b) => compareNames(a.name, b.name));
        const isMissing = savedId && options.length > 0 && !options.some(o => o.id === savedId);
        const missing = isMissing
            ? [{ id: savedId, name: i18n.t("{{id}} (not found)", { id: savedId }) }]
            : [];
        return [...missing, ...byName];
    }, [options, savedId]);

    const selected = sorted.find(option => option.id === selectedId);
    const isDisabled = disabled || options.length === 0 || selectedId === savedId;

    return (
        <div className={css.inline}>
            <select
                id={selectId}
                className={css.select}
                aria-label={label}
                value={selected?.id ?? ""}
                onChange={event => setSelectedId(event.target.value || undefined)}
            >
                <option value="">{i18n.t("None")}</option>
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
                onClick={() => onSubmit(selected)}
            >
                {i18n.t("Submit")}
            </button>
        </div>
    );
});
