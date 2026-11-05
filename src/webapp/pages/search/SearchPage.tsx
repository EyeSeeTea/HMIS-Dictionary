import React from "react";
import { Button, NoticeBox } from "@dhis2/ui";
import { SearchColumn, SearchFilter } from "$/domain/entities/SearchFilter";
import { Future } from "$/domain/entities/generic/Future";
import { ExpressionKind } from "$/domain/entities/ExpressionDescription";
import { Progress } from "$/domain/entities/Shared";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { useLayoutPermissions } from "$/webapp/hooks/useLayoutPermissions";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";
import { LoadingBanner } from "$/webapp/components/loading-banner/LoadingBanner";
import { ProgressBar } from "$/webapp/components/progress-bar/ProgressBar";
import { HtmlContent } from "$/webapp/components/html-content/HtmlContent";
import { LayoutSettingsButton } from "$/webapp/components/layout-settings/LayoutSettingsButton";
import { downloadExcel } from "$/webapp/utils/excel";
import { CollapsiblePanel } from "$/webapp/components/collapsible-panel/CollapsiblePanel";
import { SearchPanel } from "$/webapp/pages/search/SearchPanel";
import { ColumnSelectorPanel } from "$/webapp/pages/search/ColumnSelectorPanel";
import { SearchTable } from "$/webapp/pages/search/SearchTable";
import { defaultVisibleColumns, searchColumnDefs } from "$/webapp/pages/search/searchColumns";
import { getTableRows, SearchTableRow } from "$/webapp/pages/search/searchRows";
import { columnTexts, searchHelpHtml, searchTexts } from "$/webapp/pages/search/searchTexts";

const steps = [
    "dataElements",
    "programs",
    "categoryOptionCombos",
    "programIndicators",
    "indicators",
] as const;

export const SearchPage: React.FC = React.memo(() => {
    const { compositionRoot, settings, currentUser } = useAppContext();
    const layout = useLayoutPermissions("search");

    const [progress, setProgress] = React.useState<Maybe<Progress>>();
    const [globalTerm, setGlobalTerm] = React.useState("");
    const [columnFilters, setColumnFilters] = React.useState<Partial<Record<SearchColumn, string>>>(
        {}
    );
    const [showFilters, setShowFilters] = React.useState(true);
    const [visible, setVisible] = React.useState(
        () => new Set<SearchColumn>(defaultVisibleColumns)
    );
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [pageRows, setPageRows] = React.useState<SearchTableRow[]>([]);
    const [described, setDescribed] = React.useState<Map<string, string>>(new Map());

    const catalogLoader = useFuture(() => {
        setProgress({ current: 0, total: steps.length });
        return compositionRoot.search.getCatalog.execute({ user: currentUser, settings }, step =>
            setProgress({ current: steps.indexOf(step), total: steps.length })
        );
    }, [compositionRoot, currentUser, settings]);

    const catalog = catalogLoader?.type === "success" ? catalogLoader.data : undefined;
    const tableRows = React.useMemo(() => (catalog ? getTableRows(catalog) : []), [catalog]);

    const filter = React.useMemo(
        () => SearchFilter.create({ global: globalTerm, columns: columnFilters }),
        [globalTerm, columnFilters]
    );
    const filteredRows = React.useMemo(
        () => tableRows.filter(item => filter.matches(item.row)),
        [tableRows, filter]
    );

    const hasFilters =
        globalTerm !== "" || Object.values(columnFilters).some(value => Boolean(value));

    // Columns that exist for this user: layout permissions, and services only when configured
    const available = React.useMemo(() => {
        const showServices = settings.showsHealthServiceColumns();

        return new Set(
            searchColumnDefs
                .filter(
                    column =>
                        layout.canSeeColumn(column.section, column.layoutColumn) &&
                        (column.section !== "servicesBasics" || showServices)
                )
                .map(column => column.key)
        );
    }, [layout, settings]);

    const shownColumns = searchColumnDefs
        .map(column => column.key)
        .filter(key => available.has(key) && visible.has(key));

    // Expression and filter texts come from the API, only for the rows on the current page
    React.useEffect(() => {
        const requests = (["programIndicatorExpression", "programIndicatorFilter"] as const).map(
            kind => ({
                kind,
                expressions: pageRows
                    .flatMap(({ object }) =>
                        object.type === "programIndicator"
                            ? [
                                  kind === "programIndicatorExpression"
                                      ? object.expression
                                      : object.filter,
                              ]
                            : []
                    )
                    .map(expression => expression.expression)
                    .filter(
                        expression => expression && !described.has(describeKey(kind, expression))
                    ),
            })
        );

        const pending = requests.filter(request => request.expressions.length > 0);
        if (pending.length === 0) return;

        return Future.sequential(
            pending.map(({ kind, expressions }) =>
                compositionRoot.expressions.describe
                    .execute(kind, expressions)
                    .flatMapError(error =>
                        Future.success<Error, Map<string, string>>(
                            new Map(
                                expressions.map(
                                    expression =>
                                        [
                                            expression,
                                            `${error.message} Expression: ${expression}`,
                                        ] as const
                                )
                            )
                        )
                    )
                    .map(texts => ({ kind, texts }))
            )
        ).run(
            results =>
                setDescribed(prev => {
                    const next = new Map(prev);
                    results.forEach(({ kind, texts }) =>
                        texts.forEach((text, expression) =>
                            next.set(describeKey(kind, expression), text)
                        )
                    );
                    return next;
                }),
            () => {}
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageRows, compositionRoot]);

    const getText = React.useCallback(
        (item: SearchTableRow, column: SearchColumn): string => {
            const raw = item.row.columns[column];
            if (column === "object_exp_formula")
                return described.get(describeKey("programIndicatorExpression", raw)) ?? raw;
            if (column === "object_flt_formula")
                return described.get(describeKey("programIndicatorFilter", raw)) ?? raw;
            return raw;
        },
        [described]
    );

    const exportToExcel = () => {
        downloadExcel("search_export.xlsx", [
            {
                name: "Search Data",
                header: shownColumns.map(column => columnTexts[column].title()),
                rows: filteredRows.map(item => shownColumns.map(column => getText(item, column))),
            },
        ]);
    };

    const toggleColumn = (column: SearchColumn, show: boolean) =>
        setVisible(prev => {
            const next = new Set(prev);
            if (show) next.add(column);
            else next.delete(column);
            return next;
        });

    const clear = () => {
        setGlobalTerm("");
        setColumnFilters({});
    };

    const isLoading = catalogLoader?.type === "loading" || layout.loader?.type === "loading";

    return (
        <>
            <PageHeader title={i18n.t("Search")} />

            <div id="accordion">
                <CollapsiblePanel
                    title={searchTexts.srch_SearchAll()}
                    defaultOpen
                    bodyId="collapseOne"
                >
                    <SearchPanel
                        globalTerm={globalTerm}
                        onGlobalTermChange={setGlobalTerm}
                        showFilters={showFilters}
                        onShowFiltersChange={setShowFilters}
                        hasFilters={hasFilters}
                        onClear={clear}
                    />
                </CollapsiblePanel>

                <CollapsiblePanel title={searchTexts.srch_SelectColumns()} bodyId="collapseTwo">
                    <ColumnSelectorPanel
                        available={available}
                        visible={visible}
                        onToggle={toggleColumn}
                        showAdvanced={showAdvanced}
                        onToggleAdvanced={() => setShowAdvanced(prev => !prev)}
                        settingsButton={
                            <LayoutSettingsButton view="search" layout={layout.loader} />
                        }
                    />
                </CollapsiblePanel>

                <CollapsiblePanel title={searchTexts.srch_Help()} bodyId="collapseThree">
                    <HtmlContent html={searchHelpHtml()} />
                </CollapsiblePanel>
            </div>

            <LoadingBanner visible={isLoading} />
            <ProgressBar
                progress={isLoading ? progress : undefined}
                label={i18n.t("Loading search data")}
            />

            {catalogLoader?.type === "error" && (
                <NoticeBox error title={i18n.t("Search")}>
                    {catalogLoader.error.message}
                </NoticeBox>
            )}

            {catalog && (
                <>
                    <SearchTable
                        catalog={catalog}
                        rows={filteredRows}
                        columns={shownColumns}
                        filter={filter}
                        columnFilters={columnFilters}
                        onColumnFilterChange={(column, value) =>
                            setColumnFilters(prev => ({ ...prev, [column]: value }))
                        }
                        showFilters={showFilters}
                        getText={getText}
                        onPageRowsChange={setPageRows}
                    />

                    <Button small secondary onClick={exportToExcel} dataTest="export-excel">
                        {searchTexts.srch_exportToExcel()}
                    </Button>
                </>
            )}
        </>
    );
});

function describeKey(kind: ExpressionKind, expression: string): string {
    return `${kind}:${expression}`;
}
