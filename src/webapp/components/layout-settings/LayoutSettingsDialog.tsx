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
} from "$/webapp/components/layout-settings/layoutDraft";
import { IdsSelect, isSameIds } from "$/webapp/components/ids-select/IdsSelect";
import { useFuture } from "$/webapp/hooks/useFuture";
import { Id } from "$/domain/entities/Ref";
import css from "./LayoutSettingsDialog.module.css";

export type LayoutSettingsDialogProps = {
    settings: LayoutSettings;
    onClose: () => void;
    /** Called after the changes are applied. The pages reload to use the new settings. */
    onApplied: () => void;
};

type FieldError = "invalidUserGroup" | "saveFailed";

export const LayoutSettingsDialog: React.FC<LayoutSettingsDialogProps> = React.memo(props => {
    const { settings, onClose, onApplied } = props;
    const { compositionRoot } = useAppContext();

    const initialDraft = React.useMemo(() => getDraft(settings), [settings]);
    const initialGroups = settings.advancedUserGroupIds;
    const userGroups = useFuture(
        () => compositionRoot.userGroups.getAll.execute(),
        [compositionRoot]
    );

    const [draft, setDraft] = React.useState<LayoutDraft>(initialDraft);
    const [groups, setGroups] = React.useState<Id[]>(initialGroups);
    const [error, setError] = React.useState<FieldError>();
    const [saving, setSaving] = React.useState(false);

    const hasChanges = !isSameDraft(draft, initialDraft) || !isSameIds(groups, initialGroups);

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

        setSaving(true);
        const updated = settings.update(applyDraft(settings.sections, draft), groups);

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
                </div>

                <div className={`modal-body ${css.body}`}>
                    <p id="advancedUserGroupsLabel">
                        {i18n.t("User groups whose users are Advanced Users")}
                    </p>
                    <IdsSelect
                        options={userGroups?.type === "success" ? userGroups.data : []}
                        loading={!userGroups || userGroups.type === "loading"}
                        selected={groups}
                        onChange={ids => {
                            setGroups(ids);
                            setError(undefined);
                        }}
                        error={error === "invalidUserGroup"}
                        dataTest="advanced-user-groups"
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
        case "invalidUserGroup":
            return i18n.t("All UID's must be a valid userGroup");
        case "saveFailed":
            return i18n.t("The settings could not be saved");
        case undefined:
            return undefined;
    }
}
