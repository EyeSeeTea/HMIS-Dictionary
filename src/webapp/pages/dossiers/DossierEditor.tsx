import React from "react";
import { useHistory } from "react-router-dom";
import { CircularLoader, NoticeBox } from "@dhis2/ui";
import { IconEdit16 } from "@dhis2/ui-icons";
import { HealthService } from "$/domain/entities/HealthService";
import { Locale } from "$/domain/entities/Shared";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { appRoutes } from "$/webapp/routes";
import { supportedLocales } from "$/webapp/utils/locale";
import css from "./DossierEditor.module.css";

// TinyMCE is big and only the editor needs it: loaded when the editor opens
const RichTextEditor = React.lazy(() =>
    import("$/webapp/components/rich-text-editor/RichTextEditor").then(module => ({
        default: module.RichTextEditor,
    }))
);

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** The description of a health service, per language. Starts in English, as the Angular app does. */
export const DossierEditor: React.FC<{ service: HealthService }> = React.memo(({ service }) => {
    const { compositionRoot } = useAppContext();
    const history = useHistory();
    const [language, setLanguage] = React.useState<Locale>("en");
    const [html, setHtml] = React.useState<string>();
    const [saveState, setSaveState] = React.useState<SaveState>("idle");

    const editorKey = `${service.id}-${language}`;
    const text = useFuture(
        () =>
            compositionRoot.dossiers.getText
                .execute(service.id, language)
                .map(html => ({ key: editorKey, html })),
        [compositionRoot, service, language]
    );

    // A new text (other service or language) is the new starting point. Until the new one starts
    // loading, the result is still the previous one, which would load in the new editor.
    const loadedHtml =
        text?.type === "success" && text.data.key === editorKey ? text.data.html : undefined;
    React.useEffect(() => {
        setHtml(loadedHtml);
        setSaveState("idle");
    }, [loadedHtml, service, language]);

    const isLoading = text?.type === "loading";

    // The button stays disabled a moment after loading, as in the Angular app, so it cannot be
    // pressed before the editor shows the new text
    const [isSettling, setSettling] = React.useState(false);
    React.useEffect(() => {
        if (loadedHtml === undefined) return;
        setSettling(true);
        const timer = setTimeout(() => setSettling(false), 400);
        return () => clearTimeout(timer);
    }, [loadedHtml, service, language]);

    const save = () => {
        setSaveState("saving");

        compositionRoot.dossiers.saveText.execute(service.id, language, html ?? "").run(
            () => setSaveState("saved"),
            () => setSaveState("error")
        );
    };

    const saveClass = {
        idle: "btn-default",
        dirty: "btn-warning",
        saving: "btn-default",
        saved: "btn-success",
        error: "btn-danger",
    }[saveState];
    const saveDisabled = isLoading || isSettling || html === undefined || saveState === "saving";

    return (
        <div className={css.editor}>
            <div id="dossierDescription" className={css.text}>
                {isLoading && <CircularLoader small />}
                {text?.type === "error" && (
                    <NoticeBox error title={i18n.t("Save")}>
                        {text.error.message}
                    </NoticeBox>
                )}
                {loadedHtml !== undefined && (
                    <React.Suspense fallback={<CircularLoader small />}>
                        <RichTextEditor
                            key={editorKey}
                            initialValue={loadedHtml}
                            rtl={language === "ar"}
                            onChange={newHtml => {
                                setHtml(newHtml);
                                setSaveState("dirty");
                            }}
                        />
                    </React.Suspense>
                )}
            </div>

            <div className={css.tools}>
                <button
                    type="button"
                    className={css.tool}
                    onClick={() => history.push(appRoutes.dossiers.path)}
                    data-test="back-to-reader"
                    aria-label={i18n.t("Back to reader")}
                    title={i18n.t("Back to reader")}
                >
                    <IconEdit16 />
                </button>

                <select
                    id="drpBoxLanguage"
                    className={css.tool}
                    value={language}
                    onChange={event => setLanguage(event.target.value as Locale)}
                    data-test="editor-language"
                >
                    {supportedLocales.map(locale => (
                        <option key={locale} value={locale}>
                            {locale.toUpperCase()}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    id="saveButton"
                    className={`${css.save} ${css[saveState] ?? ""} ${saveClass}${saveDisabled ? " disabled" : ""}`}
                    disabled={saveDisabled}
                    onClick={save}
                    data-test="save-description"
                    data-state={saveState}
                >
                    {i18n.t("Save")}
                </button>
            </div>
        </div>
    );
});
