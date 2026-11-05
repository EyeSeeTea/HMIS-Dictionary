import React from "react";
import { ProgramStage, StageDataElement } from "$/domain/entities/ProgramStage";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { HtmlContent } from "$/webapp/components/html-content/HtmlContent";
import { OptionSetCell } from "$/webapp/pages/programs/OptionSetCell";
import { calculationModeText, visibilityText } from "$/webapp/pages/programs/programFormat";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = {
    /** Sorted by sortOrder. */
    stages: ProgramStage[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

/** The id of the section, as in the Angular app. The virtual section is the same on every stage. */
export function getSectionAnchor(sectionId: string): string {
    return sectionId;
}

export const StagesSection: React.FC<Props> = React.memo(props => {
    const { stages, canSeeSection, canSeeColumn } = props;
    if (!canSeeSection) return null;

    const columns = withColumnAccess<StageDataElement>(
        [
            {
                key: "name",
                header: t.dos_NameElement(),
                helpText: help.programs_ps_name_help(),
                render: e => e.name,
            },
            {
                key: "formName",
                header: t.dos_FormNameElement(),
                helpText: help.programs_ps_formName_help(),
                render: e => e.formName,
            },
            {
                key: "description",
                header: t.dos_DescriptionElement(),
                helpText: help.programs_ps_description_help(),
                render: e => e.description,
            },
            {
                key: "valueType",
                header: t.dos_ValueType(),
                helpText: help.programs_ps_valueType_help(),
                render: e => e.valueType,
            },
            {
                key: "calculationMode",
                header: t.dos_CalculationMode(),
                helpText: help.programs_ps_calculationMode_help(),
                render: e =>
                    e.calculation.type === "programRule" ? (
                        <div>
                            {t.dos_ProgramRule()}:
                            <ul>
                                {e.calculation.ruleNames.map(name => (
                                    <li key={name}>{name}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        calculationModeText(e.calculation)
                    ),
            },
            {
                key: "mandatory",
                header: t.dos_Mandatory(),
                helpText: help.programs_ps_mandatory_help(),
                render: e => String(e.compulsory),
            },
            {
                key: "visibilityInDataEntry",
                header: t.dos_Visibility(),
                helpText: help.programs_ps_visbility_help(),
                render: e => (
                    <ul>
                        {e.visibility.map(rule => (
                            <li key={visibilityText(rule)}>{visibilityText(rule)}</li>
                        ))}
                    </ul>
                ),
            },
            {
                key: "optionSet",
                header: t.dos_OptionSet(),
                helpText: help.programs_ps_optionSet_help(),
                render: e => <OptionSetCell optionSet={e.optionSet} />,
            },
        ],
        canSeeColumn
    );

    return (
        <div id="stageContainer">
            {stages.map(stage => (
                <div key={stage.id}>
                    <h2 id={stage.id} className="stage">
                        {stage.name}
                    </h2>
                    {stage.description && (
                        <div>
                            <h4>{t.dos_DescriptionStage()}</h4>
                            <HtmlContent html={stage.description} />
                        </div>
                    )}

                    {stage.sections.map(section => (
                        <ContentSection
                            key={section.id}
                            id={getSectionAnchor(section.id)}
                            title={section.name}
                            count={section.dataElements.length}
                            countLabel={t.dos_NumberElementsSection()}
                        >
                            <DataTable
                                rows={section.dataElements}
                                columns={columns}
                                getRowId={element => element.id}
                            />
                        </ContentSection>
                    ))}
                </div>
            ))}
        </div>
    );
});
