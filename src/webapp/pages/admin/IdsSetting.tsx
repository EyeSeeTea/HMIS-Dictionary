import React from "react";
import { Id, NamedRef } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { IdsSelect, isSameIds } from "$/webapp/components/ids-select/IdsSelect";
import css from "./Admin.module.css";

export type IdsSettingProps = {
    /** Description of the field. */
    label: React.ReactNode;
    options: NamedRef[];
    /** What is stored now. */
    savedIds: Id[];
    onSubmit: (ids: Id[]) => void;
    disabled?: boolean;
    loading?: boolean;
    /** Id of the button, as in the Angular app, also used for the select (`ids-<submitId>`). */
    submitId: string;
};

/** A list of metadata ids, chosen by name, with its own Submit button. */
export const IdsSetting: React.FC<IdsSettingProps> = React.memo(props => {
    const { label, options, savedIds, onSubmit, disabled, loading, submitId } = props;
    const [ids, setIds] = React.useState<Id[]>(savedIds);
    const isDisabled = disabled || loading || isSameIds(ids, savedIds);

    return (
        <div className={css.setting}>
            <p>{label}</p>
            <div className={css.inline}>
                <div className={css.grow}>
                    <IdsSelect
                        options={options}
                        selected={ids}
                        onChange={setIds}
                        disabled={disabled}
                        loading={loading}
                        dataTest={`ids-${submitId}`}
                    />
                </div>
                <button
                    type="button"
                    id={submitId}
                    className={css.submit}
                    disabled={isDisabled}
                    onClick={() => onSubmit(ids)}
                >
                    {i18n.t("Submit")}
                </button>
            </div>
        </div>
    );
});
