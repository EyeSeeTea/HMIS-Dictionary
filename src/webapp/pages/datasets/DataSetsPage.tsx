import React from "react";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { Progress } from "$/domain/entities/Shared";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { useLayoutPermissions } from "$/webapp/hooks/useLayoutPermissions";
import { useLinkedName } from "$/webapp/hooks/useLinkedName";
import { isSelectionLoading, useSectionLoading } from "$/webapp/hooks/useSectionLoading";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";
import { PrintButton } from "$/webapp/components/print-button/PrintButton";
import { ItemSelector } from "$/webapp/components/item-selector/ItemSelector";
import { LoadingBanner } from "$/webapp/components/loading-banner/LoadingBanner";
import { LayoutSettingsButton } from "$/webapp/components/layout-settings/LayoutSettingsButton";
import { ProgressBar } from "$/webapp/components/progress-bar/ProgressBar";
import { TableOfContents, TocItem } from "$/webapp/components/table-of-contents/TableOfContents";
import { DataSetSectionsSection } from "$/webapp/pages/datasets/DataSetSectionsSection";
import { CategoryCombosSection } from "$/webapp/pages/datasets/CategoryCombosSection";
import { DataSetIndicatorsSection } from "$/webapp/pages/datasets/DataSetIndicatorsSection";
import { compareNames } from "$/webapp/utils/compare";

export const DataSetsPage: React.FC = React.memo(() => {
    const { compositionRoot, settings, currentUser } = useAppContext();
    const name = useLinkedName("dataSetName");
    const [selectedId, setSelectedId] = React.useState<Maybe<Id>>();
    const [progress, setProgress] = React.useState<Maybe<Progress>>();

    const layout = useLayoutPermissions("datasets");

    const list = useFuture(
        () => compositionRoot.dataSets.getAll.execute(settings, { name }),
        [compositionRoot, settings, name]
    );

    const dataSet = useFuture(
        () => (selectedId ? compositionRoot.dataSets.get.execute(selectedId) : null),
        [compositionRoot, selectedId]
    );

    const dataSetValue = dataSet?.type === "success" ? dataSet.data : undefined;

    const combos = useFuture(
        () =>
            dataSetValue ? compositionRoot.dataSets.getCategoryCombos.execute(dataSetValue) : null,
        [compositionRoot, dataSetValue]
    );

    const indicators = useFuture(() => {
        if (!dataSetValue) return null;
        setProgress(undefined);

        return compositionRoot.dataSets.getIndicators
            .execute(dataSetValue, { user: currentUser, settings })
            .flatMap(found =>
                compositionRoot.expressions.describeIndicators.execute(found, setProgress)
            );
    }, [compositionRoot, dataSetValue, currentUser, settings]);

    const isLoading =
        useSectionLoading([list, layout.loader, dataSet, combos, indicators]) ||
        isSelectionLoading(Boolean(selectedId), [dataSet, combos, indicators]);
    const items: NamedRef[] = list?.type === "success" ? list.data : [];

    const sortedIndicators = React.useMemo(
        () =>
            indicators?.type === "success"
                ? [...indicators.data].sort((a, b) => compareNames(a.name, b.name))
                : [],
        [indicators]
    );

    const toc = getToc({
        hasSections: layout.canSeeSection("sections"),
        hasCombos: layout.canSeeSection("categoryCombinations"),
        hasIndicators: layout.canSeeSection("indicators") && sortedIndicators.length > 0,
        dataSet: dataSetValue,
    });

    return (
        <>
            <div id="headerDossierPanel">
                <PageHeader
                    title={i18n.t("Data Sets")}
                    actions={
                        <>
                            <LayoutSettingsButton view="datasets" layout={layout.loader} />
                            <PrintButton disabled={isLoading || !dataSetValue} />
                        </>
                    }
                />

                <ItemSelector
                    label={i18n.t("Select a Data Set")}
                    items={items}
                    selectedId={selectedId}
                    onChange={setSelectedId}
                    counterText={i18n.t("Number of Data Sets: {{count}}", { count: items.length })}
                    loading={list?.type === "loading"}
                />

                <LoadingBanner visible={isLoading} />
                <ProgressBar progress={progress} label={i18n.t("Describing indicators")} />
            </div>

            {dataSetValue && (
                <>
                    <div id="DossierTitleContainer">
                        <h1>{dataSetValue.name}</h1>
                    </div>
                    <TableOfContents items={toc} />

                    <DataSetSectionsSection
                        dataSet={dataSetValue}
                        canSeeSection={layout.canSeeSection("sections")}
                        canSeeColumn={column => layout.canSeeColumn("sections", column)}
                    />
                    <CategoryCombosSection
                        combos={combos}
                        canSeeSection={layout.canSeeSection("categoryCombinations")}
                        canSeeColumn={column => layout.canSeeColumn("categoryCombinations", column)}
                    />
                    <DataSetIndicatorsSection
                        indicators={sortedIndicators}
                        canSeeSection={layout.canSeeSection("indicators")}
                        canSeeColumn={column => layout.canSeeColumn("indicators", column)}
                    />
                </>
            )}
        </>
    );
});

type TocOptions = {
    hasSections: boolean;
    hasCombos: boolean;
    hasIndicators: boolean;
    dataSet: Maybe<{ hasRealSections: boolean; sections: NamedRef[] }>;
};

function getToc(options: TocOptions): TocItem[] {
    const { hasSections, hasCombos, hasIndicators, dataSet } = options;
    if (!dataSet) return [];

    return [
        ...(hasSections
            ? [
                  {
                      id: "sectionContainer",
                      label: dataSet.hasRealSections ? i18n.t("Sections") : i18n.t("Data elements"),
                      children: dataSet.hasRealSections
                          ? dataSet.sections.map(section => ({
                                id: section.id,
                                label: section.name,
                            }))
                          : undefined,
                  },
              ]
            : []),
        ...(hasCombos
            ? [{ id: "categoryCombinations", label: i18n.t("Category combinations") }]
            : []),
        ...(hasIndicators ? [{ id: "indicators", label: i18n.t("Indicators") }] : []),
    ];
}
