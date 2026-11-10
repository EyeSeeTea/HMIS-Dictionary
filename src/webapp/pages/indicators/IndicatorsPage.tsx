import React from "react";
import { Id } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { useLayoutPermissions } from "$/webapp/hooks/useLayoutPermissions";
import { isSelectionLoading, useSectionLoading } from "$/webapp/hooks/useSectionLoading";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";
import { PrintButton } from "$/webapp/components/print-button/PrintButton";
import { ItemSelector } from "$/webapp/components/item-selector/ItemSelector";
import { LoadingBanner } from "$/webapp/components/loading-banner/LoadingBanner";
import { LayoutSettingsButton } from "$/webapp/components/layout-settings/LayoutSettingsButton";
import { TableOfContents, TocItem } from "$/webapp/components/table-of-contents/TableOfContents";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable } from "$/webapp/components/data-table/DataTable";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { FormulaComponentsSection } from "$/webapp/pages/indicators/FormulaComponentsSection";
import { Loader } from "$/webapp/utils/Loader";
import { helpTexts } from "$/webapp/pages/indicators/helpTexts";

export const IndicatorsPage: React.FC = React.memo(() => {
    const { compositionRoot, settings, currentUser } = useAppContext();
    const [selectedId, setSelectedId] = React.useState<Maybe<Id>>();
    const layout = useLayoutPermissions("indicators");

    const list = useFuture(
        () => compositionRoot.indicators.getVisible.execute({ user: currentUser, settings }),
        [compositionRoot, currentUser, settings]
    );

    const indicators = React.useMemo(() => (list?.type === "success" ? list.data : []), [list]);
    const indicator = indicators.find(indicator => indicator.id === selectedId);

    const numerator = useFuture(
        () =>
            indicator
                ? compositionRoot.indicators.getFormulaBreakdown.execute(
                      indicator.numerator,
                      settings
                  )
                : null,
        [compositionRoot, indicator, settings]
    );
    const denominator = useFuture(
        () =>
            indicator
                ? compositionRoot.indicators.getFormulaBreakdown.execute(
                      indicator.denominator,
                      settings
                  )
                : null,
        [compositionRoot, indicator, settings]
    );

    const isLoading =
        useSectionLoading([list, layout.loader, numerator, denominator]) ||
        isSelectionLoading(Boolean(indicator), [numerator, denominator]);

    const numeratorComponents = numerator?.type === "success" ? numerator.data.components : [];
    const denominatorComponents =
        denominator?.type === "success" ? denominator.data.components : [];

    const hasFormula = Boolean(indicator?.numerator.expression);
    const showFormula = layout.canSeeSection("formula") && hasFormula;
    const showNumerator = layout.canSeeSection("numerator") && numeratorComponents.length > 0;
    const showDenominator = layout.canSeeSection("denominator") && denominatorComponents.length > 0;

    const toc: TocItem[] = [
        ...(showFormula
            ? [{ id: "formulaIndicator", label: getLayoutLabel("dos_FormulaOfIndicator") }]
            : []),
        ...(showNumerator
            ? [{ id: "numerator", label: getLayoutLabel("dos_NumeratorIndicator") }]
            : []),
        ...(showDenominator
            ? [{ id: "denominator", label: getLayoutLabel("dos_DenominatorIndicator") }]
            : []),
    ];

    return (
        <>
            <div id="headerDossierPanel">
                <PageHeader
                    title={i18n.t("Indicators")}
                    actions={
                        <>
                            <LayoutSettingsButton view="indicators" layout={layout.loader} />
                            <PrintButton disabled={isLoading || !indicator} />
                        </>
                    }
                />

                <ItemSelector
                    label={i18n.t("Select an Indicator")}
                    items={indicators}
                    selectedId={selectedId}
                    onChange={setSelectedId}
                    counterText={i18n.t("Number of Indicators: {{count}}", {
                        count: indicators.length,
                    })}
                    loading={list?.type === "loading"}
                />

                <LoadingBanner visible={isLoading} />
            </div>

            {indicator && (
                <>
                    <div id="DossierTitleContainer">
                        <h1>{indicator.name}</h1>
                        <h4>{indicator.description}</h4>
                    </div>
                    <TableOfContents items={toc} />

                    <ContentSection
                        id="formulaIndicator"
                        level="h2"
                        headingClassName=""
                        title={getLayoutLabel("dos_FormulaOfIndicator")}
                        helpText={`${helpTexts.indicators_description_help()} ${helpTexts.indicators_fi_description()}`}
                        hidden={!showFormula}
                        loader={combineLoaders(numerator, denominator)}
                    >
                        <FormulaTexts
                            numerator={numerator?.type === "success" ? numerator.data.text : ""}
                            denominator={
                                denominator?.type === "success" ? denominator.data.text : ""
                            }
                        />
                    </ContentSection>

                    <FormulaComponentsSection
                        id="numerator"
                        title={getLayoutLabel("dos_NumeratorIndicator")}
                        helpText={helpTexts.indicators_num_description()}
                        description={indicator.numeratorDescription}
                        components={numeratorComponents}
                        hidden={!showNumerator}
                        canSeeColumn={column => layout.canSeeColumn("numerator", column)}
                        columnHelp={{
                            type: helpTexts.indicators_num_type_help(),
                            name: helpTexts.indicators_num_name_help(),
                            datasets: helpTexts.indicators_num_dataSets_help(),
                            program: helpTexts.indicators_num_program_help(),
                        }}
                    />

                    <FormulaComponentsSection
                        id="denominator"
                        title={getLayoutLabel("dos_DenominatorIndicator")}
                        helpText={helpTexts.indicators_den_description()}
                        description={indicator.denominatorDescription}
                        components={denominatorComponents}
                        hidden={!showDenominator}
                        canSeeColumn={column => layout.canSeeColumn("denominator", column)}
                        columnHelp={{
                            type: helpTexts.indicators_den_type_help(),
                            name: helpTexts.indicators_den_name_help(),
                            datasets: helpTexts.indicators_den_dataSets_help(),
                            program: helpTexts.indicators_den_program_help(),
                        }}
                    />
                </>
            )}
        </>
    );
});

const FormulaTexts: React.FC<{ numerator: string; denominator: string }> = ({
    numerator,
    denominator,
}) => {
    const rows = [
        { id: "numerator", label: getLayoutLabel("dos_NumeratorIndicator"), text: numerator },
        { id: "denominator", label: getLayoutLabel("dos_DenominatorIndicator"), text: denominator },
    ];

    return (
        <>
            {rows.map(row => (
                <DataTable
                    key={row.id}
                    rows={[row]}
                    getRowId={row => row.id}
                    columns={[{ key: "text", header: row.label, render: row => row.text }]}
                />
            ))}
        </>
    );
};

function combineLoaders(a: Maybe<Loader<unknown>>, b: Maybe<Loader<unknown>>): Loader<unknown> {
    const loaders = [a, b];
    const failed = loaders.find(loader => loader?.type === "error");
    if (failed?.type === "error") return failed;
    if (loaders.some(loader => loader?.type === "loading")) return { type: "loading" };
    return { type: "success", data: undefined };
}
