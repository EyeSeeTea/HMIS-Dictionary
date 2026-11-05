import React from "react";
import { Checkbox } from "@dhis2/ui";
import i18n from "$/utils/i18n";
import { CollapsiblePanel } from "$/webapp/components/collapsible-panel/CollapsiblePanel";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { LayoutAccess } from "$/webapp/hooks/useLayoutPermissions";
import css from "./PrintSelection.module.css";

/** What goes on paper. The screen does not change. Everything is printed by default. */
export type PrintSelection = {
    isSectionPrinted: (section: string) => boolean;
    isColumnPrinted: (table: string, column: string) => boolean;
    toggleSection: (section: string) => void;
    toggleColumn: (table: string, column: string) => void;
};

const printEverything: PrintSelection = {
    isSectionPrinted: () => true,
    isColumnPrinted: () => true,
    toggleSection: () => {},
    toggleColumn: () => {},
};

const PrintSelectionContext = React.createContext<PrintSelection>(printEverything);

export const PrintSelectionProvider = PrintSelectionContext.Provider;

export function usePrintSelection(): PrintSelection {
    return React.useContext(PrintSelectionContext);
}

/** The state of a page. It goes back to printing everything when the selected item changes. */
export function useNewPrintSelection(itemId: string | undefined): PrintSelection {
    const [excluded, setExcluded] = React.useState<Set<string>>(new Set());

    React.useEffect(() => setExcluded(new Set()), [itemId]);

    return React.useMemo(() => {
        const toggle = (key: string) =>
            setExcluded(prev => {
                const next = new Set(prev);
                if (!next.delete(key)) next.add(key);
                return next;
            });

        return {
            isSectionPrinted: section => !excluded.has(sectionKey(section)),
            isColumnPrinted: (table, column) => !excluded.has(columnKey(table, column)),
            toggleSection: section => toggle(sectionKey(section)),
            toggleColumn: (table, column) => toggle(columnKey(table, column)),
        };
    }, [excluded]);
}

function sectionKey(section: string): string {
    return `section:${section}`;
}

function columnKey(table: string, column: string): string {
    return `column:${table}.${column}`;
}

export type PrintOption = { key: string; label: string };

export type PrintSectionGroup = { title: string; options: PrintOption[] };

export type PrintColumnGroup = { table: string; title: string; options: PrintOption[] };

/** The columns of some tables that the user can see, from the layout of the screen. */
export function getColumnGroups(
    layout: LayoutAccess,
    tables: { table: string; title: string }[]
): PrintColumnGroup[] {
    const sections = layout.loader?.type === "success" ? layout.loader.data.sections : [];

    return tables.flatMap(({ table, title }) => {
        const section = sections.find(section => section.key === table);
        if (!section || !layout.canSeeSection(table)) return [];

        const options = section.columns
            .filter(column => layout.canSeeColumn(table, column.key))
            .map(column => ({ key: column.key, label: getLayoutLabel(column.translationKey) }));

        return options.length > 0 ? [{ table, title, options }] : [];
    });
}

/** Without any section to print, there is nothing to send to the printer. */
export function hasPrintedSection(
    selection: PrintSelection,
    sectionGroups: PrintSectionGroup[]
): boolean {
    return sectionGroups.some(group =>
        group.options.some(option => selection.isSectionPrinted(option.key))
    );
}

type PrintSelectionPanelProps = {
    selection: PrintSelection;
    sectionGroups: PrintSectionGroup[];
    columnGroups: PrintColumnGroup[];
};

export const PrintSelectionPanel: React.FC<PrintSelectionPanelProps> = React.memo(props => {
    const { selection, sectionGroups, columnGroups } = props;

    return (
        <div className="no-print" data-test="print-selection">
            <CollapsiblePanel title={i18n.t("Print selection")}>
                <div className={css.groups}>
                    <div className={css.group}>
                        <h4>{i18n.t("Sections")}</h4>
                        {sectionGroups.map(group => (
                            <fieldset key={group.title} className={css.fieldset}>
                                {group.title && <legend>{group.title}</legend>}
                                {group.options.map(option => (
                                    <Checkbox
                                        key={option.key}
                                        dense
                                        label={option.label}
                                        checked={selection.isSectionPrinted(option.key)}
                                        onChange={() => selection.toggleSection(option.key)}
                                    />
                                ))}
                            </fieldset>
                        ))}
                    </div>

                    {columnGroups.map(group => (
                        <div key={group.table} className={css.group}>
                            <h4>{group.title}</h4>
                            {group.options.map(option => (
                                <Checkbox
                                    key={option.key}
                                    dense
                                    label={option.label}
                                    checked={selection.isColumnPrinted(group.table, option.key)}
                                    onChange={() => selection.toggleColumn(group.table, option.key)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </CollapsiblePanel>
        </div>
    );
});

/** A block of the page that stays on screen, but only goes on paper when it is selected. */
export const PrintableBlock: React.FC<{ section: string; children: React.ReactNode }> = props => {
    const { section, children } = props;
    const { isSectionPrinted } = usePrintSelection();

    return (
        <div data-print-section={section} className={isSectionPrinted(section) ? "" : "no-print"}>
            {children}
        </div>
    );
};
