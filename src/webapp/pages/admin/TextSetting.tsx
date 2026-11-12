import React from "react";
import i18n from "$/utils/i18n";
import css from "./Admin.module.css";

export type TextSettingProps = {
    /** Description of the field. */
    label: React.ReactNode;
    value: string;
    onSubmit: (value: string) => void;
    disabled?: boolean;
    /** Name of the input and id of its button, as in the Angular app. */
    name: string;
    submitId: string;
};

/** A text field with its own Submit button: each setting is saved on its own. */
export const TextSetting: React.FC<TextSettingProps> = React.memo(props => {
    const { label, value, onSubmit, disabled, name, submitId } = props;
    const [text, setText] = React.useState(value);

    return (
        <div className={css.setting}>
            <p>{label}</p>
            <div className={css.inline}>
                <input
                    type="text"
                    name={name}
                    className={css.input}
                    value={text}
                    aria-label={name}
                    onChange={event => setText(event.target.value)}
                />
                <button
                    type="button"
                    id={submitId}
                    className={css.submit}
                    disabled={disabled}
                    onClick={() => onSubmit(text)}
                >
                    {i18n.t("Submit")}
                </button>
            </div>
        </div>
    );
});
