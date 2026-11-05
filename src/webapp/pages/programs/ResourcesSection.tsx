import React from "react";
import { ProgramResource, ProgramResourceType } from "$/domain/entities/Program";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable } from "$/webapp/components/data-table/DataTable";
import { useAppContext } from "$/webapp/contexts/app-context";
import { programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = { resources: ProgramResource[] };

/** Where each type of resource opens in DHIS2. */
const urlByType: Record<ProgramResourceType, string> = {
    dashboards: "dhis-web-dashboard/index.html#/",
    visualizations: "dhis-web-data-visualizer/index.html#/",
    eventCharts: "dhis-web-event-visualizer/index.html?id=",
    eventReports: "dhis-web-event-reports/index.html?id=",
};

/** The type, as the Angular app showed it. */
const typeLabels: Record<ProgramResourceType, string> = {
    dashboards: "Dashboards",
    visualizations: "Visualizations",
    eventCharts: "Event Charts",
    eventReports: "Event Reports",
};

export function getResourceUrl(baseUrl: string, resource: ProgramResource): string {
    return `${baseUrl}/${urlByType[resource.type]}${resource.id}`;
}

export const ResourcesSection: React.FC<Props> = React.memo(({ resources }) => {
    const { baseUrl } = useAppContext();
    if (resources.length === 0) return null;

    return (
        <div id="ResourcesContainer">
            <ContentSection
                id="resources"
                title={t.dos_Resources()}
                count={resources.length}
                countLabel={t.dos_ResourcesNumber()}
            >
                <DataTable
                    rows={resources}
                    getRowId={resource => `${resource.type}-${resource.id}`}
                    columns={[
                        { key: "name", header: t.dos_NameElement(), render: r => r.name },
                        {
                            key: "description",
                            header: t.dos_DescriptionElement(),
                            render: r => r.description,
                        },
                        {
                            key: "type",
                            header: t.dos_ResourceType(),
                            render: r => typeLabels[r.type],
                        },
                        {
                            key: "link",
                            header: t.dos_Link(),
                            render: r => (
                                <a
                                    href={getResourceUrl(baseUrl, r)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {r.name}
                                </a>
                            ),
                        },
                    ]}
                />
            </ContentSection>
        </div>
    );
});
