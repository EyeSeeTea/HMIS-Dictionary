import React from "react";
import { InputField } from "@dhis2/ui";
import { SearchCatalog } from "$/domain/entities/SearchCatalog";
import { SearchColumn, SearchFilter } from "$/domain/entities/SearchFilter";
import i18n from "$/utils/i18n";
import { DataTable, DataTableColumn } from "$/webapp/components/data-table/DataTable";
import { VisualizationLink } from "$/webapp/components/visualization-link/VisualizationLink";
import { FormulaDialog } from "$/webapp/pages/search/FormulaDialog";
import { FormulaView } from "$/webapp/pages/search/FormulaView";
import { HighlightedText } from "$/webapp/pages/search/HighlightedText";
import { searchPageSizes } from "$/webapp/pages/search/searchColumns";
import { SearchTableRow, toIndicator } from "$/webapp/pages/search/searchRows";
import { columnTexts, searchTexts } from "$/webapp/pages/search/searchTexts";
import { Maybe } from "$/utils/ts-utils";
import css from "./SearchTable.module.css";

export type SearchTableProps = {
    catalog: SearchCatalog;
    rows: SearchTableRow[];
    columns: SearchColumn[];
    filter: SearchFilter;
    columnFilters: Partial<Record<SearchColumn, string>>;
    onColumnFilterChange: (column: SearchColumn, value: string) => void;
    showFilters: boolean;
    getText: (row: SearchTableRow, column: SearchColumn) => string;
    onPageRowsChange: (rows: SearchTableRow[]) => void;
};

type OpenFormula = { item: SearchTableRow; type: "numerator" | "denominator" };

export const SearchTable: React.FC<SearchTableProps> = React.memo(props => {
    const {
        catalog,
        rows,
        columns,
        filter,
        columnFilters,
        onColumnFilterChange,
        showFilters,
        getText,
        onPageRowsChange,
    } = props;
    const [openFormula, setOpenFormula] = React.useState<Maybe<OpenFormula>>();

    const tableColumns: DataTableColumn<SearchTableRow>[] = columns.map(column => ({
        key: column,
        header: columnTexts[column].title(),
        helpText: columnTexts[column].help(),
        sortValue: item => getText(item, column).toLowerCase(),
        render: item => {
            const text = getText(item, column);
            const terms = filter.highlightTerms(column);
            const highlighted = <HighlightedText text={text} terms={terms} />;

            switch (column) {
                case "object_name": {
                    const indicator = toIndicator(item.object);
                    return (
                        <>
                            {highlighted}
                            {indicator && <VisualizationLink source={indicator} />}
                        </>
                    );
                }
                case "object_num_formula":
                case "object_den_formula": {
                    const { object } = item;
                    if (object.type !== "indicator") return highlighted;
                    const type = column === "object_num_formula" ? "numerator" : "denominator";
                    const formula = object[type];

                    return (
                        <>
                            <FormulaView
                                nodes={formula.resolve(catalog.lookup)}
                                tags={catalog.tags}
                            />
                            {formula.hasNestedIndicators() && (
                                <button
                                    type="button"
                                    className={css.expand}
                                    onClick={() => setOpenFormula({ item, type })}
                                >
                                    {searchTexts.srch_formula_modal_expand()}
                                </button>
                            )}
                        </>
                    );
                }
                default:
                    return highlighted;
            }
        },
    }));

    const dialogObject = openFormula?.item.object;

    return (
        <>
            <div className={css.table}>
                <DataTable
                    id="searchTable"
                    rows={rows}
                    columns={tableColumns}
                    getRowId={item => item.id}
                    pageSizes={searchPageSizes}
                    onPageRowsChange={onPageRowsChange}
                    emptyText={i18n.t("No results")}
                    filterRow={
                        showFilters
                            ? column => (
                                  <InputField
                                      dense
                                      value={columnFilters[column.key as SearchColumn] ?? ""}
                                      onChange={({ value }) =>
                                          onColumnFilterChange(
                                              column.key as SearchColumn,
                                              value ?? ""
                                          )
                                      }
                                      dataTest={`filter-${column.key}`}
                                  />
                              )
                            : undefined
                    }
                />
            </div>

            {openFormula && dialogObject?.type === "indicator" && (
                <FormulaDialog
                    title={`${dialogObject.name} - ${
                        openFormula.type === "numerator"
                            ? columnTexts.object_num_formula.title()
                            : columnTexts.object_den_formula.title()
                    }`}
                    indicatorId={dialogObject.id}
                    formula={dialogObject[openFormula.type]}
                    lookup={catalog.lookup}
                    tags={catalog.tags}
                    onClose={() => setOpenFormula(undefined)}
                />
            )}
        </>
    );
});
