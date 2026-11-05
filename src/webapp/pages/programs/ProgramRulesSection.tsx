import React from "react";
import i18n from "$/utils/i18n";
import { ProgramRule } from "$/domain/entities/ProgramRule";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { usePrintSelection } from "$/webapp/components/print-selection/PrintSelection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { getActionFields } from "$/webapp/pages/programs/ruleActionFields";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";

type Props = {
    rules: ProgramRule[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

export const ProgramRulesSection: React.FC<Props> = React.memo(props => {
    const { rules, canSeeSection, canSeeColumn } = props;
    const print = usePrintSelection();
    if (!canSeeSection || rules.length === 0) return null;

    const columns = withColumnAccess<ProgramRule>(
        [
            {
                key: "name",
                header: t.dos_NameElement(),
                helpText: help.programs_pr_name_help(),
                render: r => r.name,
            },
            {
                key: "description",
                header: t.dos_DescriptionElement(),
                helpText: help.programs_pr_description_help(),
                render: r => r.description,
            },
            {
                key: "programStage",
                header: t.dos_ProgramStage(),
                helpText: help.programs_pr_program_stage_help(),
                render: r => r.stage?.name ?? "",
            },
            {
                key: "condition",
                header: t.dos_Condition(),
                helpText: help.programs_pr_condition_help(),
                render: r => r.condition,
            },
            {
                key: "programRuleActions",
                header: t.dos_ProgramRuleActions(),
                helpText: help.programs_pr_actions_help(),
                render: r => (
                    <ul>
                        {r.actions.map((action, index) => (
                            <li key={index}>
                                <div>
                                    {t.dos_Type()}: {action.type}
                                </div>
                                {getActionFields(action).map(field => (
                                    <div key={field.label}>
                                        {field.label}: {field.value}
                                    </div>
                                ))}
                            </li>
                        ))}
                    </ul>
                ),
            },
        ],
        canSeeColumn,
        column => print.isColumnPrinted("programRules", column)
    );

    return (
        <div id="RuleContainer">
            <ContentSection
                id="rules"
                title={t.dos_ProgramRules()}
                count={rules.length}
                countLabel={i18n.t("Number of Rules in Program")}
                helpText={help.programs_pr_description()}
            >
                <DataTable
                    rows={rules}
                    columns={columns}
                    getRowId={r => `${r.name}-${r.stage?.id ?? ""}`}
                />
            </ContentSection>
        </div>
    );
});
