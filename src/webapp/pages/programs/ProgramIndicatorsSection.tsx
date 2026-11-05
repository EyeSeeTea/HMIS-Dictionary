import React from "react";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { NamedRef } from "$/domain/entities/Ref";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { VisualizationLink } from "$/webapp/components/visualization-link/VisualizationLink";
import { boundaryLines } from "$/webapp/pages/programs/programFormat";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = {
    /** Sorted by name, with their texts described. */
    programIndicators: ProgramIndicator[];
    stages: NamedRef[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

export const ProgramIndicatorsSection: React.FC<Props> = React.memo(props => {
    const { programIndicators, stages, canSeeSection, canSeeColumn } = props;
    if (!canSeeSection || programIndicators.length === 0) return null;

    const columns = withColumnAccess<ProgramIndicator>(
        [
            {
                key: "name",
                header: t.dos_NameElement(),
                helpText: help.programs_pi_name_help(),
                render: p => p.name,
            },
            {
                key: "description",
                header: t.dos_DescriptionElement(),
                helpText: help.programs_pi_description_help(),
                render: p => p.description,
            },
            {
                key: "filter",
                header: t.dos_Filter(),
                helpText: help.programs_pi_filter_help(),
                render: p => p.filterText,
            },
            {
                key: "calculation",
                header: t.dos_Calculation(),
                helpText: help.programs_pi_calculation_help(),
                render: p => p.expressionText,
            },
            {
                key: "aggregationType",
                header: t.dos_AggregationType(),
                helpText: help.programs_pi_aggregationType_help(),
                render: p => p.aggregationType,
            },
            {
                key: "typeOfProgramIndicator",
                header: t.dos_TypeOfProgramIndicator(),
                helpText: help.programs_pi_type_help(),
                render: p => p.analyticsType,
            },
            {
                key: "stagesReferenced",
                header: t.dos_StagesReferenced(),
                helpText: help.programs_pi_stagesReferenced_help(),
                render: p => (
                    <ul>
                        {p.stageNames(stages).map(name => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                ),
            },
            {
                key: "boundaries",
                header: t.dos_Boundaries(),
                helpText: help.programs_pi_boundaries_help(),
                render: p => (
                    <ul>
                        {p.boundaries.map((boundary, index) => (
                            <li key={index}>
                                {boundaryLines(boundary, stages).map(line => (
                                    <div key={line}>{line}</div>
                                ))}
                            </li>
                        ))}
                    </ul>
                ),
            },
            {
                key: "visualization",
                header: t.dos_Visualization(),
                helpText: help.programs_pi_visualization_help(),
                render: p => <VisualizationLink source={p} variant="link" />,
            },
        ],
        canSeeColumn
    );

    return (
        <div id="IndicatorGroupsContainer">
            <ContentSection
                id="programIndicators"
                level="h2"
                headingClassName="indicatorGroup"
                title={t.dos_ProgramIndicators()}
                count={programIndicators.length}
                countLabel={t.dos_NumberOfProgramIndicators()}
                helpText={help.programs_pi_description()}
            >
                <DataTable rows={programIndicators} columns={columns} getRowId={p => p.id} />
            </ContentSection>
        </div>
    );
});
