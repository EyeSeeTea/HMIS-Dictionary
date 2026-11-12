import React from "react";
import { useHistory } from "react-router-dom";
import { IconEdit16 } from "@dhis2/ui-icons";
import { HealthService } from "$/domain/entities/HealthService";
import { HealthServiceContent } from "$/domain/usecases/GetHealthServiceContentUseCase";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable } from "$/webapp/components/data-table/DataTable";
import { HtmlContent } from "$/webapp/components/html-content/HtmlContent";
import {
    BackToTopLink,
    TableOfContents,
    TocItem,
} from "$/webapp/components/table-of-contents/TableOfContents";
import { appRoutes } from "$/webapp/routes";
import { dossierTexts as t } from "$/webapp/pages/dossiers/dossierTexts";
import { compareNames } from "$/webapp/utils/compare";

export type DossierReaderProps = {
    service: HealthService;
    canEdit: boolean;
    onCounts: (counts: { dataSets: number; indicatorGroups: number }) => void;
    onLoadingChange: (isLoading: boolean) => void;
};

export const descriptionAnchor = "DossierTextTitleContainer";
const dataSetsAnchor = "DataSetsTitleContainer";
const indicatorGroupsAnchor = "IndicatorGroupsTitleContainer";

const byName = <T extends { name: string }>(a: T, b: T) => compareNames(a.name, b.name);

export const DossierReader: React.FC<DossierReaderProps> = React.memo(props => {
    const { service, canEdit, onCounts, onLoadingChange } = props;
    const { compositionRoot, locale } = useAppContext();
    const history = useHistory();

    const text = useFuture(
        () => compositionRoot.dossiers.getText.execute(service.id, locale),
        [compositionRoot, service, locale]
    );
    // Sections named like the translated "Comments" are left out
    const content = useFuture(
        () => compositionRoot.dossiers.getContent.execute(service, t.dos_Comments()),
        [compositionRoot, service]
    );

    const data = React.useMemo(() => sortContent(content), [content]);

    React.useEffect(() => {
        onCounts({
            dataSets: data?.dataSets.length ?? 0,
            indicatorGroups: data?.indicatorGroups.length ?? 0,
        });
    }, [data, onCounts]);

    const isLoading = text?.type === "loading" || content?.type === "loading";
    React.useEffect(() => onLoadingChange(isLoading), [isLoading, onLoadingChange]);

    const toc: TocItem[] = [
        { id: descriptionAnchor, label: t.dos_Description_of_Service() },
        ...(data && data.dataSets.length > 0
            ? [
                  {
                      id: dataSetsAnchor,
                      label: t.dos_Data_Sets(),
                      children: data.dataSets.map(dataSet => ({
                          id: dataSet.id,
                          label: dataSet.name,
                          children: dataSet.sections.map(section => ({
                              id: section.id,
                              label: section.name,
                          })),
                      })),
                  },
              ]
            : []),
        ...(data && data.indicatorGroups.length > 0
            ? [
                  {
                      id: indicatorGroupsAnchor,
                      label: t.dos_Indicator_Groups(),
                      children: data.indicatorGroups.map(group => ({
                          id: group.id,
                          label: group.name,
                      })),
                  },
              ]
            : []),
    ];

    return (
        <>
            <div id="DossierTitleContainer">
                <h1>{service.name}</h1>
            </div>
            <TableOfContents items={toc} />

            <ContentSection
                id={descriptionAnchor}
                title={t.dos_Description_of_Service()}
                loader={text}
                goToIndex={false}
                actions={
                    canEdit && (
                        <button
                            type="button"
                            id="editDescButton"
                            className="no-print"
                            onClick={() => history.push(appRoutes.dossiersEditor.path)}
                            data-test="edit-description"
                        >
                            <IconEdit16 /> {i18n.t("Edit")}
                        </button>
                    )
                }
            >
                <div id="dossierDescription">
                    <HtmlContent html={text?.type === "success" ? text.data : ""} />
                </div>
                <BackToTopLink />
            </ContentSection>

            {data && data.dataSets.length > 0 && (
                <section>
                    <h1 id={dataSetsAnchor}>{t.dos_Data_Sets()}</h1>
                    {data.dataSets.map(dataSet => (
                        <div key={dataSet.id}>
                            <h2 id={dataSet.id} className="dataset">
                                {t.dos_Data_Set()}: {dataSet.name}
                            </h2>
                            {dataSet.sections.map(section => (
                                <ContentSection
                                    key={section.id}
                                    id={section.id}
                                    title={`${t.dos_Section()}: ${section.name}`}
                                    count={section.dataElements.length}
                                    countLabel={t.dos_NumberElementsSection()}
                                >
                                    <DataTable
                                        tableClassName="sectionElementsTable"
                                        rows={section.dataElements}
                                        getRowId={element => element.id}
                                        columns={[
                                            {
                                                key: "name",
                                                header: t.dos_NameElement(),
                                                render: e => e.name,
                                            },
                                            {
                                                key: "formName",
                                                header: t.dos_FormNameElement(),
                                                render: e => e.formName,
                                            },
                                            {
                                                key: "description",
                                                header: t.dos_DescriptionElement(),
                                                render: e => e.description,
                                            },
                                        ]}
                                    />
                                    <BackToTopLink />
                                </ContentSection>
                            ))}
                        </div>
                    ))}
                </section>
            )}

            {data && data.indicatorGroups.length > 0 && (
                <section>
                    <h1 id={indicatorGroupsAnchor}>{t.dos_Indicator_Groups()}</h1>
                    {data.indicatorGroups.map(group => (
                        <ContentSection
                            key={group.id}
                            id={group.id}
                            wrapContent
                            level="h2"
                            headingClassName="indicatorGroup"
                            title={`${t.dos_Indicator_Group()}: ${group.name}`}
                            count={group.indicators.length}
                            countLabel={t.dos_Number_of_Indicators_in_Group()}
                        >
                            <DataTable
                                tableClassName="indicatorTable"
                                rows={group.indicators}
                                getRowId={indicator => indicator.id}
                                columns={[
                                    {
                                        key: "name",
                                        header: t.dos_NameIndicator(),
                                        render: i => i.name,
                                    },
                                    {
                                        key: "description",
                                        header: t.dos_DescriptionIndicator(),
                                        render: i => i.description,
                                    },
                                ]}
                            />
                            <BackToTopLink />
                        </ContentSection>
                    ))}
                </section>
            )}

            {content?.type === "error" && <p>{content.error.message}</p>}
        </>
    );
});

/** Data sets and indicator groups by name, indicators by name. */
function sortContent(
    content: ReturnType<typeof useFuture<HealthServiceContent>>
): HealthServiceContent | undefined {
    if (content?.type !== "success") return undefined;

    return {
        dataSets: [...content.data.dataSets].sort(byName),
        indicatorGroups: [...content.data.indicatorGroups]
            .sort(byName)
            .map(group => ({ ...group, indicators: [...group.indicators].sort(byName) })),
    };
}
