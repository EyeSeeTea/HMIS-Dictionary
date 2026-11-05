import React from "react";
import {
    DataTable as D2DataTable,
    DataTableCell,
    DataTableColumnHeader,
    DataTableRow,
    TableBody,
    TableHead,
} from "@dhis2/ui";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";
import { TablePagination } from "$/webapp/components/table-pagination/TablePagination";
import { HelpIcon } from "$/webapp/components/help-icon/HelpIcon";
import css from "./DataTable.module.css";
import { compareNames } from "$/webapp/utils/compare";

export type DataTableColumn<Row> = {
    key: string;
    header: string;
    render: (row: Row) => React.ReactNode;
    /** Makes the column sortable. */
    sortValue?: (row: Row) => string | number;
    helpText?: string;
    /** Columns hidden by layout permissions or the column selector. Default: true. */
    visible?: boolean;
    /** The column stays on screen, but it does not go on paper. */
    hiddenOnPrint?: boolean;
};

export type DataTableProps<Row> = {
    rows: Row[];
    columns: DataTableColumn<Row>[];
    getRowId: (row: Row) => string;
    /** Page sizes. Without it, the table shows every row. */
    pageSizes?: number[];
    emptyText?: string;
    /** Id of the table (it wraps it), for the Search table. */
    id?: string;
    /** Class of the table element. */
    tableClassName?: string;
    /** Called with the rows of the current page, when they change. */
    onPageRowsChange?: (rows: Row[]) => void;
    /** Rows that go on top, whatever the sorting of the columns. */
    isPriorityRow?: (row: Row) => boolean;
    /** Extra cells above the header, for filters. */
    filterRow?: (column: DataTableColumn<Row>) => React.ReactNode;
};

/** Hides the columns the user may not see, by layout permissions. */
export function withColumnAccess<Row>(
    columns: DataTableColumn<Row>[],
    canSeeColumn: (key: string) => boolean,
    isPrinted: (key: string) => boolean = () => true
): DataTableColumn<Row>[] {
    return columns.map(column => ({
        ...column,
        visible: canSeeColumn(column.key),
        hiddenOnPrint: !isPrinted(column.key),
    }));
}

type Sorting = { key: string; direction: "asc" | "desc" };

export function DataTable<Row>(props: DataTableProps<Row>): React.ReactElement {
    const {
        rows,
        columns,
        getRowId,
        pageSizes,
        emptyText,
        filterRow,
        onPageRowsChange,
        isPriorityRow,
        id,
        tableClassName,
    } = props;
    const [sorting, setSorting] = React.useState<Maybe<Sorting>>();
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(pageSizes?.[0] ?? rows.length);

    const visibleColumns = columns.filter(column => column.visible !== false);

    const sortedRows = React.useMemo(() => {
        const column = columns.find(column => column.key === sorting?.key);
        const getValue = sorting && column?.sortValue;
        const factor = sorting?.direction === "asc" ? 1 : -1;

        // Empty values go last in both directions, so a sorted page shows values first
        const byColumn = getValue
            ? [...rows].sort((a, b) => {
                  const [x, y] = [getValue(a), getValue(b)];
                  if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1;
                  return compare(x, y) * factor;
              })
            : rows;
        if (!isPriorityRow) return byColumn;

        return [
            ...byColumn.filter(row => isPriorityRow(row)),
            ...byColumn.filter(row => !isPriorityRow(row)),
        ];
    }, [rows, columns, sorting, isPriorityRow]);

    const pageCount = pageSizes ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
    const currentPage = Math.min(page, pageCount);
    const pageRows = pageSizes
        ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : sortedRows;

    // A new list of rows (for example after filtering) starts again from the first page
    React.useEffect(() => setPage(1), [rows]);

    useOnListChange(pageRows, onPageRowsChange);

    const toggleSort = (key: string) => {
        setSorting(prev =>
            prev?.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    };

    return (
        <div id={id} className={css.wrapper} data-test="data-table">
            <D2DataTable className={tableClassName}>
                <TableHead>
                    <DataTableRow>
                        {visibleColumns.map(column => (
                            <DataTableColumnHeader
                                key={column.key}
                                className={printClass(column)}
                                name={column.key}
                                sortDirection={
                                    column.sortValue
                                        ? sorting?.key === column.key
                                            ? sorting.direction
                                            : "default"
                                        : undefined
                                }
                                onSortIconClick={
                                    column.sortValue ? () => toggleSort(column.key) : undefined
                                }
                                dataTest={`column-${column.key}`}
                            >
                                {column.header}
                                {column.helpText && <HelpIcon text={column.helpText} />}
                            </DataTableColumnHeader>
                        ))}
                    </DataTableRow>
                    {filterRow && (
                        <DataTableRow>
                            {visibleColumns.map(column => (
                                <DataTableColumnHeader
                                    key={column.key}
                                    className={printClass(column)}
                                >
                                    {filterRow(column)}
                                </DataTableColumnHeader>
                            ))}
                        </DataTableRow>
                    )}
                </TableHead>
                <TableBody>
                    {pageRows.map(row => (
                        <DataTableRow key={getRowId(row)}>
                            {visibleColumns.map(column => (
                                <DataTableCell key={column.key} className={printClass(column)}>
                                    {column.render(row)}
                                </DataTableCell>
                            ))}
                        </DataTableRow>
                    ))}
                </TableBody>
            </D2DataTable>

            {pageRows.length === 0 && <p className={css.empty}>{emptyText ?? i18n.t("No data")}</p>}

            {pageSizes && (
                <TablePagination
                    page={currentPage}
                    pageCount={pageCount}
                    pageSize={pageSize}
                    pageSizes={pageSizes}
                    total={sortedRows.length}
                    onPageChange={setPage}
                    onPageSizeChange={size => {
                        setPageSize(size);
                        setPage(1);
                    }}
                />
            )}
        </div>
    );
}

/**
 * Tells about a list only when its items change. The columns of a table are usually a new array on
 * each render, and that recalculates the rows: telling about them every time would make whoever
 * listens render again, and cancel what it was loading for them.
 */
function useOnListChange<Item>(list: Item[], onChange: Maybe<(list: Item[]) => void>): void {
    const previous = React.useRef<Maybe<Item[]>>(undefined);

    React.useEffect(() => {
        const last = previous.current;
        const isSame =
            last?.length === list.length && last.every((item, index) => item === list[index]);
        if (isSame) return;

        previous.current = list;
        onChange?.(list);
    });
}

function printClass<Row>(column: DataTableColumn<Row>): string | undefined {
    return column.hiddenOnPrint ? "no-print" : undefined;
}

function compare(a: string | number, b: string | number): number {
    return typeof a === "number" && typeof b === "number"
        ? a - b
        : compareNames(String(a), String(b));
}
