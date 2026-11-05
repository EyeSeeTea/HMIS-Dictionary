import React from "react";
import { ProgramAttribute } from "$/domain/entities/Program";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { usePrintSelection } from "$/webapp/components/print-selection/PrintSelection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { OptionSetCell } from "$/webapp/pages/programs/OptionSetCell";
import { visibilityText } from "$/webapp/pages/programs/programFormat";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = {
    attributes: ProgramAttribute[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

export const ProgramAttributesSection: React.FC<Props> = React.memo(props => {
    const { attributes, canSeeSection, canSeeColumn } = props;
    const print = usePrintSelection();
    if (!canSeeSection || attributes.length === 0) return null;

    const columns = withColumnAccess<ProgramAttribute>(
        [
            {
                key: "name",
                header: t.dos_NameElement(),
                helpText: help.programs_tei_name_help(),
                render: a => a.name,
            },
            {
                key: "formName",
                header: t.dos_FormNameElement(),
                helpText: help.programs_tei_formName_help(),
                render: a => a.formName,
            },
            {
                key: "description",
                header: t.dos_DescriptionElement(),
                helpText: help.programs_tei_description_help(),
                render: a => a.description,
            },
            {
                key: "valueType",
                header: t.dos_ValueType(),
                helpText: help.programs_tei_valueType_help(),
                render: a => a.valueType,
            },
            {
                key: "aggregationType",
                header: t.dos_AggregationType(),
                helpText: help.programs_tei_aggregationType_help(),
                render: a => a.aggregationType,
            },
            {
                key: "mandatory",
                header: t.dos_Mandatory(),
                helpText: help.programs_tei_mandatory_help(),
                render: a => String(a.mandatory),
            },
            {
                key: "visibilityInDataEntry",
                header: t.dos_Visibility(),
                helpText: help.programs_tei_visbility_help(),
                render: a => (
                    <ul>
                        {a.visibility.map(rule => (
                            <li key={visibilityText(rule)}>{visibilityText(rule)}</li>
                        ))}
                    </ul>
                ),
            },
            {
                key: "optionSet",
                header: t.dos_OptionSet(),
                helpText: help.programs_tei_optionSet_help(),
                render: a => <OptionSetCell optionSet={a.optionSet} />,
            },
        ],
        canSeeColumn,
        column => print.isColumnPrinted("trackedEntityAttributes", column)
    );

    return (
        <div id="trackedEntityAttributeContainer">
            <ContentSection
                id="trackedEntityAttributes"
                title={t.dos_TrackedEntityAttributes()}
                count={attributes.length}
                countLabel={t.dos_TrackedEntityAttributesNumber()}
                helpText={help.programs_tei_description()}
            >
                <DataTable rows={attributes} columns={columns} getRowId={a => a.id} />
            </ContentSection>
        </div>
    );
});
