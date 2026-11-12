import { Indicator } from "$/domain/entities/Indicator";
import { ProgramAttribute } from "$/domain/entities/Program";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { ProgramRule, ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { ProgramStage } from "$/domain/entities/ProgramStage";
import { Maybe } from "$/utils/ts-utils";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { ExcelSheet, sanitizeFilename } from "$/webapp/utils/excel";
import { boundaryLines, calculationModeText } from "$/webapp/pages/programs/programFormat";
import { getActionFields } from "$/webapp/pages/programs/ruleActionFields";
import { programTexts as t } from "$/webapp/pages/programs/programTexts";

export type ProgramExportData = {
    stages: ProgramStage[];
    attributes: ProgramAttribute[];
    programIndicators: ProgramIndicator[];
    indicators: Indicator[];
    rules: ProgramRule[];
    ruleVariables: ProgramRuleVariable[];
};

type Access = {
    canSeeSection: (section: string) => boolean;
    canSeeColumn: (section: string, column: string) => boolean;
};

type Cell = [header: string, value: Maybe<string>];

/**
 * The sheets of the export, from what is on screen and with the user's permissions. A sheet
 * without rows is left out, so a program with no rules has no rules sheets.
 */
export function buildProgramSheets(data: ProgramExportData, access: Access): ExcelSheet[] {
    const { canSeeSection: section, canSeeColumn: column } = access;

    const stageNames = data.stages.map(stage => ({ id: stage.id, name: stage.name }));

    const sheets: Array<[string, boolean, Cell[][]]> = [
        [
            "Data Elements",
            section("programStages"),
            data.stages.flatMap(stage =>
                stage.sections.flatMap(stageSection =>
                    stageSection.dataElements.map((element): Cell[] => [
                        [t.dos_Stage(), stage.name],
                        [t.dos_Section(), stage.hasRealSections ? stageSection.name : ""],
                        ...only(column("programStages", "name"), [
                            t.dos_NameElement(),
                            element.name,
                        ]),
                        ...only(column("programStages", "shortName"), [
                            t.dos_ShortNameElement(),
                            element.shortName,
                        ]),
                        ...only(column("programStages", "formName"), [
                            t.dos_FormNameElement(),
                            element.formName,
                        ]),
                        ...only(column("programStages", "description"), [
                            t.dos_DescriptionElement(),
                            element.description,
                        ]),
                        ...only(column("programStages", "valueType"), [
                            t.dos_ValueType(),
                            element.valueType,
                        ]),
                        ...only(column("programStages", "calculationMode"), [
                            t.dos_CalculationMode(),
                            calculationModeText(element.calculation),
                        ]),
                        ...only(column("programStages", "optionSet"), [
                            t.dos_OptionSetName(),
                            element.optionSet?.name,
                        ]),
                        ...only(column("programStages", "optionSet"), [
                            t.dos_OptionSetOptions(),
                            joinNames(element.optionSet?.options.map(option => option.name)),
                        ]),
                    ])
                )
            ),
        ],
        [
            "Tracked Entity Attributes",
            section("trackedEntityAttributes"),
            data.attributes.map((attribute): Cell[] => [
                ...only(column("trackedEntityAttributes", "name"), [
                    t.dos_NameElement(),
                    attribute.name,
                ]),
                ...only(column("trackedEntityAttributes", "shortName"), [
                    t.dos_ShortNameElement(),
                    attribute.shortName,
                ]),
                ...only(column("trackedEntityAttributes", "formName"), [
                    t.dos_FormNameElement(),
                    attribute.formName,
                ]),
                ...only(column("trackedEntityAttributes", "description"), [
                    t.dos_DescriptionElement(),
                    attribute.description,
                ]),
                ...only(column("trackedEntityAttributes", "aggregationType"), [
                    t.dos_AggregationType(),
                    attribute.aggregationType,
                ]),
                ...only(column("trackedEntityAttributes", "valueType"), [
                    t.dos_ValueType(),
                    attribute.valueType,
                ]),
                ...only(column("trackedEntityAttributes", "optionSet"), [
                    t.dos_OptionSetName(),
                    attribute.optionSet?.name,
                ]),
                ...only(column("trackedEntityAttributes", "optionSet"), [
                    t.dos_OptionSetOptions(),
                    joinNames(attribute.optionSet?.options.map(option => option.name)),
                ]),
            ]),
        ],
        [
            "Indicators",
            section("indicators"),
            data.indicators.map((indicator): Cell[] => [
                ...only(column("indicators", "name"), [t.dos_NameElement(), indicator.name]),
                ...only(column("indicators", "shortName"), [
                    t.dos_ShortNameElement(),
                    indicator.shortName,
                ]),
                ...only(column("indicators", "description"), [
                    t.dos_DescriptionElement(),
                    indicator.description,
                ]),
                ...only(column("indicators", "type"), [t.dos_Type(), indicator.type]),
                ...only(column("indicators", "numerator"), [
                    t.dos_NumeratorIndicator(),
                    indicator.numeratorText,
                ]),
                ...only(column("indicators", "numeratorDescription"), [
                    getLayoutLabel("dos_NumeratorIndicatorDescription"),
                    indicator.numeratorDescription,
                ]),
                ...only(column("indicators", "denominator"), [
                    t.dos_DenominatorIndicator(),
                    indicator.denominatorText,
                ]),
                ...only(column("indicators", "denominatorDescription"), [
                    getLayoutLabel("dos_DenominatorIndicatorDescription"),
                    indicator.denominatorDescription,
                ]),
                ...only(column("indicators", "stagesReferenced"), [
                    t.dos_StagesReferenced(),
                    joinNames(indicator.stageNames(data.stages, data.programIndicators)),
                ]),
            ]),
        ],
        [
            "Program Indicators",
            section("programIndicators"),
            data.programIndicators.map((programIndicator): Cell[] => [
                ...only(column("programIndicators", "name"), [
                    t.dos_NameElement(),
                    programIndicator.name,
                ]),
                ...only(column("programIndicators", "description"), [
                    t.dos_DescriptionElement(),
                    programIndicator.description,
                ]),
                ...only(column("programIndicators", "filter"), [
                    t.dos_Filter(),
                    programIndicator.filterText,
                ]),
                ...only(column("programIndicators", "calculation"), [
                    t.dos_Calculation(),
                    programIndicator.expressionText,
                ]),
                ...only(column("programIndicators", "aggregationType"), [
                    t.dos_AggregationType(),
                    programIndicator.aggregationType,
                ]),
                ...only(column("programIndicators", "typeOfProgramIndicator"), [
                    t.dos_TypeOfProgramIndicator(),
                    programIndicator.analyticsType,
                ]),
                ...only(column("programIndicators", "stagesReferenced"), [
                    t.dos_StagesReferenced(),
                    programIndicator.stageNames(stageNames).join(" | "),
                ]),
                ...only(column("programIndicators", "boundaries"), [
                    t.dos_Boundaries(),
                    joinNames(
                        programIndicator.boundaries.map(boundary =>
                            boundaryLines(boundary, stageNames).join(", ")
                        )
                    ),
                ]),
            ]),
        ],
        [
            "Program Rules",
            section("programRules"),
            data.rules.map((rule): Cell[] => [
                ...only(column("programRules", "name"), [t.dos_NameElement(), rule.name]),
                ...only(column("programRules", "description"), [
                    t.dos_DescriptionElement(),
                    rule.description,
                ]),
                ...only(column("programRules", "programStage"), [
                    t.dos_ProgramStage(),
                    rule.stage?.name,
                ]),
                ...only(column("programRules", "condition"), [t.dos_Condition(), rule.condition]),
                ...only(column("programRules", "programRuleActions"), [
                    t.dos_ActionsTypes(),
                    joinNames(rule.actions.map(action => action.type)),
                ]),
            ]),
        ],
        [
            "Program Rules Actions",
            section("programRules") && column("programRules", "programRuleActions"),
            data.rules.flatMap(rule =>
                rule.actions.map((action): Cell[] => [
                    [`${t.dos_ProgramRule()} ${t.dos_NameElement()}`, rule.name],
                    [t.dos_Type(), action.type],
                    ...getActionFields(action).map((field): Cell => [field.label, field.value]),
                ])
            ),
        ],
        [
            "Program Rules Variables",
            section("programRuleVariables"),
            data.ruleVariables.map((variable): Cell[] => [
                ...only(column("programRuleVariables", "name"), [
                    t.dos_NameElement(),
                    variable.name,
                ]),
                ...only(column("programRuleVariables", "sourceType"), [
                    t.dos_SourceType(),
                    variable.sourceType,
                ]),
                ...only(column("programRuleVariables", "programStage"), [
                    t.dos_ProgramStage(),
                    variable.stage?.name,
                ]),
                ...only(column("programRuleVariables", "dataElement"), [
                    t.dos_DataElement(),
                    variable.dataElement?.name,
                ]),
                ...only(column("programRuleVariables", "trackedEntityAttributes"), [
                    t.dos_TrackedEntityAttributes(),
                    variable.attribute?.name,
                ]),
            ]),
        ],
    ];

    return sheets.flatMap(([name, allowed, rows]) => {
        if (!allowed || rows.length === 0) return [];
        return [toSheet(name, rows)];
    });
}

/** The header is every column found, in order of appearance. Rows without a column leave it empty. */
function toSheet(name: string, rows: Cell[][]): ExcelSheet {
    const header = Array.from(new Set(rows.flatMap(row => row.map(([title]) => title))));

    return {
        name: name,
        header: header,
        rows: rows.map(row =>
            header.map(title => row.find(([cellTitle]) => cellTitle === title)?.[1] ?? "")
        ),
    };
}

function only(condition: boolean, cell: Cell): Cell[] {
    return condition ? [cell] : [];
}

function joinNames(names: Maybe<string[]>): string {
    return (names ?? []).filter(Boolean).join("\n");
}

/** `<program>-<dd-MM-yy_H-mm>.xlsx`, with the characters not allowed in file names replaced. */
export function getProgramFilename(programName: string, date: Date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    const stamp = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${pad(date.getFullYear() % 100)}_${date.getHours()}-${pad(date.getMinutes())}`;

    return `${sanitizeFilename(programName)}-${stamp}.xlsx`;
}
