import React from "react";
import {
    Button,
    ButtonStrip,
    Checkbox,
    DataTable,
    DataTableCell,
    DataTableColumnHeader,
    DataTableRow,
    Modal,
    TableBody,
    TableHead,
} from "@dhis2/ui";
import { InvalidAdvancedUserGroupsError } from "$/domain/usecases/SaveLayoutSettingsUseCase";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import {
    applyDraft,
    getDraft,
    isSameDraft,
    LayoutDraft,
    parseAdvancedGroups,
    stringifyAdvancedGroups,
} from "$/webapp/components/layout-settings/layoutDraft";
import css from "./LayoutSettingsDialog.module.css";

export type LayoutSettingsDialogProps = {
    settings: LayoutSettings;
    onClose: () => void;
    /** Called after the changes are applied. The pages reload to use the new settings. */
    onApplied: () => void;
};

type FieldError = "invalidFormat" | "invalidUserGroup" | "saveFailed";

export const LayoutSettingsDialog: React.FC<LayoutSettingsDialogProps> = React.memo(props => {
    const { settings, onClose, onApplied } = props;
    const { compositionRoot } = useAppContext();

    const initialDraft = React.useMemo(() => getDraft(settings), [settings]);
    const initialGroups = React.useMemo(
        () => stringifyAdvancedGroups(settings.advancedUserGroupIds),
        [settings]
    );

    const [draft, setDraft] = React.useState<LayoutDraft>(initialDraft);
    const [groups, setGroups] = React.useState(initialGroups);
    const [error, setError] = React.useState<FieldError>();
    const [saving, setSaving] = React.useState(false);

    const hasChanges = !isSameDraft(draft, initialDraft) || groups !== initialGroups;

    const restore = () => {
        setDraft(initialDraft);
        setGroups(initialGroups);
        setError(undefined);
    };

    const setRow = (key: string, changes: Partial<LayoutDraft[string]>) => {
        setDraft(prev => ({
            ...prev,
            [key]: { advanced: false, everyone: false, ...prev[key], ...changes },
        }));
    };

    const apply = () => {
        // Nothing changed: only reload, as the Angular app does.
        if (!hasChanges) return onApplied();

        const parsed = parseAdvancedGroups(groups);
        if (parsed.type === "invalidFormat") return setError("invalidFormat");

        setSaving(true);
        const updated = settings.update(applyDraft(settings.sections, draft), parsed.ids);

        compositionRoot.layout.save.execute(updated).run(
            () => onApplied(),
            err => {
                setSaving(false);
                setError(
                    err instanceof InvalidAdvancedUserGroupsError
                        ? "invalidUserGroup"
                        : "saveFailed"
                );
            }
        );
    };

    return (
        <Modal position="top" large onClose={onClose} dataTest="layout-settings-dialog">
            <div id="layoutSettingsModal" className={css.dialog}>
                <div className={`modal-header ${css.header}`}>
                    <h4>{i18n.t("Settings")}</h4>
                    <button
                        type="button"
                        className={css.x}
                        aria-label={i18n.t("Close")}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className={`modal-body ${css.body}`}>
                    <label htmlFor="advancedUserGroups">
                        {i18n.t(
                            'User group ids (JSON array) whose users are Advanced Users, for example ["abc"]'
                        )}
                    </label>
                    <input
                        id="advancedUserGroups"
                        name="advancedUserGroups"
                        type="text"
                        className={`${css.groups} ${error === "invalidFormat" || error === "invalidUserGroup" ? css.invalid : ""}`}
                        value={groups}
                        onFocus={() => setError(undefined)}
                        onChange={event => {
                            setGroups(event.target.value);
                            setError(undefined);
                        }}
                    />
                    {getErrorText(error) && <p className={css.error}>{getErrorText(error)}</p>}

                    <div className={css.table}>
                        <DataTable>
                            <TableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>{""}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t("Admin")}</DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t("Advanced User")}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t("Normal User")}
                                    </DataTableColumnHeader>
                                </DataTableRow>
                            </TableHead>
                            <TableBody>
                                {settings.sections.flatMap(section => [
                                    <AccessRow
                                        key={section.key}
                                        rowKey={section.key}
                                        label={getLayoutLabel(section.translationKey)}
                                        draft={draft}
                                        onChange={setRow}
                                    />,
                                    ...section.columns.map(column => (
                                        <AccessRow
                                            key={`${section.key}.${column.key}`}
                                            rowKey={`${section.key}.${column.key}`}
                                            label={getLayoutLabel(column.translationKey)}
                                            draft={draft}
                                            onChange={setRow}
                                            child
                                        />
                                    )),
                                ])}
                            </TableBody>
                        </DataTable>
                    </div>
                </div>

                <div className={`modal-footer ${css.footer}`}>
                    <ButtonStrip>
                        <Button onClick={onClose}>{i18n.t("Close")}</Button>
                        <Button destructive disabled={!hasChanges} onClick={restore}>
                            {i18n.t("Restore changes")}
                        </Button>
                        <Button primary disabled={saving} onClick={apply}>
                            {i18n.t("Apply changes")}
                        </Button>
                    </ButtonStrip>
                </div>
            </div>
        </Modal>
    );
});

type AccessRowProps = {
    rowKey: string;
    label: string;
    draft: LayoutDraft;
    onChange: (key: string, changes: Partial<LayoutDraft[string]>) => void;
    child?: boolean;
};

const AccessRow: React.FC<AccessRowProps> = ({ rowKey, label, draft, onChange, child }) => {
    const row = draft[rowKey] ?? { advanced: false, everyone: false };

    return (
        <DataTableRow>
            <DataTableCell>
                <span className={child ? css.child : css.section}>{label}</span>
            </DataTableCell>
            <DataTableCell>
                <Checkbox checked disabled dense name={`${rowKey}-admin`} />
            </DataTableCell>
            <DataTableCell>
                <Checkbox
                    dense
                    label={
                        <span
                            className={css.hidden}
                        >{`${label} - ${i18n.t("Advanced User")}`}</span>
                    }
                    name={`${rowKey}-advanced`}
                    checked={row.advanced}
                    onChange={({ checked }) => onChange(rowKey, { advanced: checked })}
                />
            </DataTableCell>
            <DataTableCell>
                <Checkbox
                    dense
                    label={
                        <span className={css.hidden}>{`${label} - ${i18n.t("Normal User")}`}</span>
                    }
                    name={`${rowKey}-everyone`}
                    checked={row.everyone}
                    onChange={({ checked }) => onChange(rowKey, { everyone: checked })}
                />
            </DataTableCell>
        </DataTableRow>
    );
};

function getErrorText(error: FieldError | undefined): string | undefined {
    switch (error) {
        case "invalidFormat":
            return i18n.t("Invalid array format");
        case "invalidUserGroup":
            return i18n.t("All UID's must be a valid userGroup");
        case "saveFailed":
            return i18n.t("The settings could not be saved");
        case undefined:
            return undefined;
    }
}
