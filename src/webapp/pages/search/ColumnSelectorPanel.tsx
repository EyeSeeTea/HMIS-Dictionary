import React from "react";
import { Checkbox } from "@dhis2/ui";
import { SearchColumn } from "$/domain/entities/SearchFilter";
import i18n from "$/utils/i18n";
import { HelpIcon } from "$/webapp/components/help-icon/HelpIcon";
import { columnGroups, searchColumnDefs } from "$/webapp/pages/search/searchColumns";
import { columnTexts } from "$/webapp/pages/search/searchTexts";
import css from "./ColumnSelectorPanel.module.css";

export type ColumnSelectorPanelProps = {
    /** Columns the user may choose from: layout permissions and services flag already applied. */
    available: Set<SearchColumn>;
    visible: Set<SearchColumn>;
    onToggle: (column: SearchColumn, show: boolean) => void;
    showAdvanced: boolean;
    onToggleAdvanced: () => void;
    /** The layout settings gear, for admins. */
    settingsButton: React.ReactNode;
};

export const ColumnSelectorPanel: React.FC<ColumnSelectorPanelProps> = React.memo(props => {
    const { available, visible, onToggle, showAdvanced, onToggleAdvanced, settingsButton } = props;

    const hasAdvanced = searchColumnDefs.some(
        column => column.advanced && available.has(column.key)
    );

    return (
        <div>
            <div className={css.settings}>{settingsButton}</div>

            <div className={css.groups}>
                {columnGroups.map(group => {
                    const columns = searchColumnDefs.filter(
                        column =>
                            column.section === group.key &&
                            available.has(column.key) &&
                            (!column.advanced || showAdvanced)
                    );
                    if (columns.length === 0) return null;

                    return (
                        <div key={group.key} className={css.group}>
                            <b>{group.title()}</b>
                            {columns.map(column => (
                                <div key={column.key} className={css.item}>
                                    <Checkbox
                                        dense
                                        label={
                                            <>
                                                {columnTexts[column.key].title()}
                                                <HelpIcon text={columnTexts[column.key].help()} />
                                            </>
                                        }
                                        name={column.key}
                                        checked={visible.has(column.key)}
                                        onChange={({ checked }) => onToggle(column.key, checked)}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {hasAdvanced && (
                <a
                    href="#advanced"
                    onClick={event => {
                        event.preventDefault();
                        onToggleAdvanced();
                    }}
                >
                    {i18n.t("Show / Hide advanced columns")}
                </a>
            )}
        </div>
    );
});
