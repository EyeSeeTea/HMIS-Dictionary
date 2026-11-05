import React from "react";
import { ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { usePrintSelection } from "$/webapp/components/print-selection/PrintSelection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = {
    variables: ProgramRuleVariable[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

export const RuleVariablesSection: React.FC<Props> = React.memo(props => {
    const { variables, canSeeSection, canSeeColumn } = props;
    const print = usePrintSelection();
    if (!canSeeSection || variables.length === 0) return null;

    const columns = withColumnAccess<ProgramRuleVariable>(
        [
            {
                key: "name",
                header: t.dos_NameElement(),
                helpText: help.programs_prv_name_help(),
                render: v => v.name,
            },
            {
                key: "sourceType",
                header: t.dos_SourceType(),
                helpText: help.programs_prv_sourceType_help(),
                render: v => v.sourceType,
            },
            {
                key: "programStage",
                header: t.dos_ProgramStage(),
                helpText: help.programs_prv_programStage_help(),
                render: v => v.stage?.name ?? "",
            },
            {
                key: "dataElement",
                header: t.dos_DataElement(),
                helpText: help.programs_prv_dataElement_help(),
                render: v => v.dataElement?.name ?? "",
            },
            {
                key: "trackedEntityAttributes",
                header: t.dos_TrackedEntityAttributes(),
                helpText: help.programs_prv_trackedEntityAttributes_help(),
                render: v => v.attribute?.name ?? "",
            },
            {
                key: "associatedProgramRules",
                header: t.dos_AssociatedProgramRules(),
                helpText: help.programs_prv_associatedProgramRules_help(),
                render: v => (
                    <ul>
                        {v.associatedRuleNames.map(name => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                ),
            },
        ],
        canSeeColumn,
        column => print.isColumnPrinted("programRuleVariables", column)
    );

    return (
        <div id="RuleVariablesContainer">
            <ContentSection
                id="ruleVariables"
                title={t.dos_ProgramRuleVariables()}
                count={variables.length}
                countLabel={t.dos_ProgramRuleVariablesNumber()}
                helpText={help.programs_prv_description()}
            >
                <DataTable rows={variables} columns={columns} getRowId={v => v.name} />
            </ContentSection>
        </div>
    );
});
