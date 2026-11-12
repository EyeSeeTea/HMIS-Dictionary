import React from "react";
import { ProgramResource, ProgramResourceType } from "$/domain/entities/Program";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable } from "$/webapp/components/data-table/DataTable";
import { useAppContext } from "$/webapp/contexts/app-context";
import { programTexts as t } from "$/webapp/pages/programs/programTexts";

import i18n from "$/utils/i18n";
import css from "./ResourcesSection.module.css";

type Props = { resources: ProgramResource[]; canReadData: boolean };

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

function isEventResource(resource: ProgramResource): boolean {
    return resource.type === "eventCharts" || resource.type === "eventReports";
}

export function getResourceUrl(baseUrl: string, resource: ProgramResource): string {
    return `${baseUrl}/${urlByType[resource.type]}${resource.id}`;
}

export const ResourcesSection: React.FC<Props> = React.memo(({ resources, canReadData }) => {
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
                <div className={css.scroll}>
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
                                render: r =>
                                    canReadData || !isEventResource(r) ? (
                                        <a
                                            href={getResourceUrl(baseUrl, r)}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {r.name}
                                        </a>
                                    ) : (
                                        <span
                                            className={css.noAccess}
                                            title={i18n.t(
                                                "You have no access to the data of this program"
                                            )}
                                            aria-disabled="true"
                                            data-test="resource-no-access"
                                        >
                                            {r.name}
                                        </span>
                                    ),
                            },
                        ]}
                    />
                </div>
            </ContentSection>
        </div>
    );
});
