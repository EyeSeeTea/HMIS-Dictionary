import { LayoutSection, LayoutView } from "./LayoutSettings";

type Row = [key: string, translationKey: string, access: LayoutSection["access"]];

function section(index: number, row: Row, columns: Row[] = []): LayoutSection {
    const [key, translationKey, access] = row;

    return {
        key,
        index,
        translationKey,
        access,
        columns: columns.map(([key, translationKey, access], index) => ({
            key,
            index,
            translationKey,
            access,
        })),
    };
}

/** Sections and columns of each screen, with who can see them by default. */
export const layoutDefaults: Record<LayoutView, LayoutSection[]> = {
    search: [
        section(
            0,
            ["objectsBasics", "srch_SelectColumns_objBasics", "everyone"],
            [
                ["type", "object_type", "everyone"],
                ["name", "object_name", "everyone"],
                ["shortName", "object_shortName", "everyone"],
                ["form", "object_form", "everyone"],
                ["id", "object_id", "admin"],
                ["code", "object_code", "admin"],
                ["icd10", "object_ICD10", "admin"],
            ]
        ),
        section(
            1,
            ["objectsDescriptions", "srch_SelectColumns_objDescs", "everyone"],
            [
                ["description", "object_description", "everyone"],
                ["numFormula", "object_num_formula", "everyone"],
                ["denFormula", "object_den_formula", "everyone"],
                ["filterFormula", "object_flt_formula", "everyone"],
                ["expFormula", "object_exp_formula", "everyone"],
            ]
        ),
        section(
            2,
            ["groupsBasics", "srch_SelectColumns_grpBasics", "everyone"],
            [
                ["name", "objectGroup_name", "admin"],
                ["dataElementGroups", "dataElementGroup_name", "everyone"],
                ["program", "program_name", "everyone"],
                ["id", "objectGroup_id", "admin"],
                ["code", "objectGroup_code", "admin"],
            ]
        ),
        section(
            3,
            ["servicesBasics", "srch_SelectColumns_servBasics", "everyone"],
            [
                ["name", "service_name", "everyone"],
                ["id", "service_id", "admin"],
                ["code", "service_code", "admin"],
            ]
        ),
    ],
    datasets: [
        section(
            0,
            ["sections", "dos_Sections", "everyone"],
            [
                ["name", "dos_NameElement", "everyone"],
                ["formName", "dos_FormNameElement", "everyone"],
                ["shortName", "dos_ShortNameElement", "everyone"],
                ["description", "dos_DescriptionElement", "everyone"],
                ["dataTypeElement", "dos_DataTypeElement", "admin"],
                ["options", "dos_Options", "admin"],
                ["categoryCombination", "dos_CategoryCombination", "admin"],
            ]
        ),
        section(
            1,
            ["categoryCombinations", "dos_CategoryCombinations", "admin"],
            [
                ["categoryCombination", "dos_CategoryCombination", "admin"],
                ["categories", "dos_Categories", "admin"],
                ["items", "dos_Items", "admin"],
            ]
        ),
        section(
            2,
            ["indicators", "dos_Indicators", "everyone"],
            [
                ["name", "dos_NameIndicator", "everyone"],
                ["shortName", "dos_ShortNameIndicator", "everyone"],
                ["type", "dos_Type", "everyone"],
                ["numerator", "dos_NumeratorIndicator", "everyone"],
                ["numeratorDescription", "dos_NumeratorIndicatorDescription", "everyone"],
                ["denominator", "dos_DenominatorIndicator", "everyone"],
                ["denominatorDescription", "dos_DenominatorIndicatorDescription", "everyone"],
            ]
        ),
    ],
    indicators: [
        section(0, ["formula", "dos_FormulaOfIndicator", "everyone"]),
        section(
            1,
            ["numerator", "dos_NumeratorIndicator", "everyone"],
            [
                ["type", "dos_Type", "admin"],
                ["name", "dos_NameIndicator", "admin"],
                ["datasets", "dos_DataSets", "admin"],
                ["program", "dos_Program", "admin"],
            ]
        ),
        section(
            2,
            ["denominator", "dos_DenominatorIndicator", "everyone"],
            [
                ["type", "dos_Type", "admin"],
                ["name", "dos_NameIndicator", "admin"],
                ["datasets", "dos_DataSets", "admin"],
                ["program", "dos_Program", "admin"],
            ]
        ),
    ],
    programs: [
        section(0, ["programDescription", "dos_DescriptionOfProgram", "everyone"]),
        section(
            1,
            ["trackedEntityAttributes", "dos_TrackedEntityAttributes", "everyone"],
            [
                ["name", "dos_NameElement", "everyone"],
                ["formName", "dos_FormNameElement", "everyone"],
                ["description", "dos_DescriptionElement", "everyone"],
                ["valueType", "dos_ValueType", "advanced"],
                ["aggregationType", "dos_AggregationType", "advanced"],
                ["mandatory", "dos_Mandatory", "advanced"],
                ["visibilityInDataEntry", "dos_Visibility", "advanced"],
                ["optionSet", "dos_OptionSet", "advanced"],
            ]
        ),
        section(
            2,
            ["programStages", "dos_ProgramStages", "everyone"],
            [
                ["name", "dos_NameElement", "everyone"],
                ["formName", "dos_FormNameElement", "everyone"],
                ["description", "dos_DescriptionElement", "everyone"],
                ["valueType", "dos_ValueType", "advanced"],
                ["calculationMode", "dos_CalculationMode", "advanced"],
                ["mandatory", "dos_Mandatory", "advanced"],
                ["visibilityInDataEntry", "dos_Visibility", "advanced"],
                ["optionSet", "dos_OptionSet", "advanced"],
            ]
        ),
        section(
            3,
            ["programIndicators", "dos_ProgramIndicators", "everyone"],
            [
                ["name", "dos_NameElement", "everyone"],
                ["description", "dos_DescriptionElement", "everyone"],
                ["filter", "dos_Filter", "advanced"],
                ["calculation", "dos_Calculation", "advanced"],
                ["aggregationType", "dos_AggregationType", "advanced"],
                ["typeOfProgramIndicator", "dos_TypeOfProgramIndicator", "advanced"],
                ["stagesReferenced", "dos_StagesReferenced", "advanced"],
                ["boundaries", "dos_Boundaries", "advanced"],
                ["visualization", "dos_Visualization", "everyone"],
            ]
        ),
        section(
            4,
            ["indicators", "dos_Indicators", "everyone"],
            [
                ["name", "dos_NameElement", "everyone"],
                ["description", "dos_DescriptionElement", "everyone"],
                ["type", "dos_Type", "everyone"],
                ["numerator", "dos_NumeratorIndicator", "everyone"],
                ["denominator", "dos_DenominatorIndicator", "everyone"],
                ["stagesReferenced", "dos_StagesReferenced", "everyone"],
                ["visualization", "dos_Visualization", "everyone"],
            ]
        ),
        section(
            5,
            ["programRules", "dos_ProgramRules", "advanced"],
            [
                ["name", "dos_NameElement", "advanced"],
                ["description", "dos_DescriptionElement", "advanced"],
                ["programStage", "dos_ProgramStage", "advanced"],
                ["condition", "dos_Condition", "advanced"],
                ["programRuleActions", "dos_ProgramRuleActions", "advanced"],
            ]
        ),
        section(
            6,
            ["programRuleVariables", "dos_ProgramRuleVariables", "advanced"],
            [
                ["name", "dos_NameElement", "advanced"],
                ["sourceType", "dos_SourceType", "advanced"],
                ["programStage", "dos_ProgramStage", "advanced"],
                ["dataElement", "dos_DataElement", "advanced"],
                ["trackedEntityAttributes", "dos_TrackedEntityAttributes", "advanced"],
                ["associatedProgramRules", "dos_AssociatedProgramRules", "advanced"],
            ]
        ),
    ],
};
