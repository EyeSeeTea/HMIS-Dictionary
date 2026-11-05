import React from "react";
import i18n from "$/utils/i18n";
import css from "./Admin.module.css";

export type TextSettingProps = {
    /** Description of the field. */
    label: React.ReactNode;
    value: string;
    /** Returns an error text to show it and not submit. */
    validate?: (value: string) => string | undefined;
    onSubmit: (value: string) => void;
    disabled?: boolean;
    /** Name of the input and id of its button, as in the Angular app. */
    name: string;
    submitId: string;
};

/** A text field with its own Submit button: each setting is saved on its own. */
export const TextSetting: React.FC<TextSettingProps> = React.memo(props => {
    const { label, value, validate, onSubmit, disabled, name, submitId } = props;
    const [text, setText] = React.useState(value);
    const [error, setError] = React.useState<string>();

    const submit = () => {
        const validationError = validate?.(text);
        setError(validationError);
        if (!validationError) onSubmit(text);
    };

    return (
        <div className={css.setting}>
            <p>{label}</p>
            <div className={css.inline}>
                <input
                    type="text"
                    name={name}
                    className={`${css.input} ${error ? css.invalid : ""}`}
                    value={text}
                    aria-label={name}
                    onChange={event => {
                        setText(event.target.value);
                        setError(undefined);
                    }}
                />
                <button
                    type="button"
                    id={submitId}
                    className={css.submit}
                    disabled={disabled}
                    onClick={submit}
                >
                    {i18n.t("Submit")}
                </button>
            </div>
            {error && <p className={css.error}>{error}</p>}
        </div>
    );
});
