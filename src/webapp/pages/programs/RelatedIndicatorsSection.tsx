import React from "react";
import { Indicator, StageWithDataElements } from "$/domain/entities/Indicator";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { VisualizationLink } from "$/webapp/components/visualization-link/VisualizationLink";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = {
    /** Sorted by name, with their texts described. */
    indicators: Indicator[];
    stages: StageWithDataElements[];
    programIndicators: ProgramIndicator[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

/** Indicators that reference the program through D{}, A{} or I{}. */
export const RelatedIndicatorsSection: React.FC<Props> = React.memo(props => {
    const { indicators, stages, programIndicators, canSeeSection, canSeeColumn } = props;
    if (!canSeeSection || indicators.length === 0) return null;

    const columns = withColumnAccess<Indicator>(
        [
            {
                key: "name",
                header: t.dos_NameElement(),
                helpText: help.programs_i_name_help(),
                render: i => i.name,
            },
            {
                key: "description",
                header: t.dos_DescriptionElement(),
                helpText: help.programs_i_description_help(),
                render: i => i.description,
            },
            {
                key: "type",
                header: t.dos_Type(),
                helpText: help.programs_i_type_help(),
                render: i => i.type,
            },
            {
                key: "numerator",
                header: t.dos_NumeratorIndicator(),
                helpText: help.programs_i_numerator_help(),
                render: i => i.numeratorText,
            },
            {
                key: "denominator",
                header: t.dos_DenominatorIndicator(),
                helpText: help.programs_i_denominator_help(),
                render: i => i.denominatorText,
            },
            {
                key: "stagesReferenced",
                header: t.dos_StagesReferenced(),
                helpText: help.programs_i_stagesReferenced_help(),
                render: i => (
                    <ul>
                        {i.stageNames(stages, programIndicators).map(name => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                ),
            },
            {
                key: "visualization",
                header: t.dos_Visualization(),
                helpText: help.programs_i_visualization_help(),
                render: i => <VisualizationLink source={i} variant="link" />,
            },
        ],
        canSeeColumn
    );

    return (
        <div id="indicatorContainer">
            <ContentSection
                id="indicators"
                title={t.dos_Indicators()}
                count={indicators.length}
                countLabel={t.dos_NumberOfIndicators()}
                helpText={help.programs_i_description()}
            >
                <DataTable rows={indicators} columns={columns} getRowId={i => i.id} />
            </ContentSection>
        </div>
    );
});
