import i18n from "$/utils/i18n";

/** Labels of the Programs screen, from the Angular translations. Keys are the Angular ones. */
export const programTexts = {
    dos_ActionsTypes: () => i18n.t("Actions Types"),
    dos_AggregationType: () => i18n.t("Aggregation Type"),
    dos_AnalyticsBoundaryType: () => i18n.t("Analytics period boundary type"),
    dos_AssociatedProgramRules: () => i18n.t("Associated Program Rules"),
    dos_Boundaries: () => i18n.t("Boundaries"),
    dos_BoundaryTarget: () => i18n.t("Boundary target"),
    dos_Calculation: () => i18n.t("Calculation"),
    dos_CalculationMode: () => i18n.t("Calculation Mode"),
    dos_Condition: () => i18n.t("Condition"),
    dos_CustomMessageBlankedField: () => i18n.t("Custom Message for Blanked Field"),
    dos_DataElement: () => i18n.t("Data Element"),
    dos_DateToSendMessage: () => i18n.t("Date to Send Message"),
    dos_DenominatorIndicator: () => i18n.t("Denominator"),
    dos_DescriptionElement: () => i18n.t("Description"),
    dos_DescriptionOfProgram: () => i18n.t("Program Description"),
    dos_DescriptionStage: () => i18n.t("Stage Description"),
    dos_DirectDataEntry: () => i18n.t("Direct Data Entry"),
    dos_DisplayWidget: () => i18n.t("Display Widget"),
    dos_Expression: () => i18n.t("Expression"),
    dos_Filter: () => i18n.t("Filter"),
    dos_FormNameElement: () => i18n.t("Form Name"),
    dos_GoToIndex: () => i18n.t("Go to Index"),
    dos_Indicators: () => i18n.t("Indicators"),
    dos_KeyLabel: () => i18n.t("Key Label"),
    dos_Link: () => i18n.t("Link"),
    dos_Mandatory: () => i18n.t("Mandatory"),
    dos_MessageTemplate: () => i18n.t("Message Template"),
    dos_NameElement: () => i18n.t("Name"),
    dos_NumberElementsSection: () => i18n.t("Number of Data Elements in Section"),
    dos_NumberOfIndicators: () => i18n.t("Number of Indicators"),
    dos_NumberOfProgramIndicators: () => i18n.t("Number of Program Indicators"),
    dos_NumberOfPrograms: () => i18n.t("Number of Programs"),
    dos_NumeratorIndicator: () => i18n.t("Numerator"),
    dos_OffsetPeriod: () => i18n.t("Offset period by amount"),
    dos_OptionGroupToHide: () => i18n.t("Option Group to Hide"),
    dos_OptionGroupToShow: () => i18n.t("Option Group to Show"),
    dos_OptionSet: () => i18n.t("Option Set"),
    dos_OptionSetName: () => i18n.t("Option Set Name"),
    dos_OptionSetOptions: () => i18n.t("Option Set Options"),
    dos_OptionToHide: () => i18n.t("Option to Hide"),
    dos_OptionstageSectionToHide: () => i18n.t("Option Stage Section to Hide"),
    dos_OptionstageToHide: () => i18n.t("Option Stage to Hide"),
    dos_Other: () => i18n.t("Other"),
    dos_PeriodType: () => i18n.t("Period type"),
    dos_ProgramIndicators: () => i18n.t("Program Indicators"),
    dos_ProgramRule: () => i18n.t("Program Rule"),
    dos_ProgramRuleActions: () => i18n.t("Program Rule Actions"),
    dos_ProgramRuleVariableAssign: () => i18n.t("Program Rule Variable to Assign to"),
    dos_ProgramRuleVariables: () => i18n.t("Program Rule Variables"),
    dos_ProgramRuleVariablesNumber: () => i18n.t("Number of Rule Variables in Program"),
    dos_ProgramRules: () => i18n.t("Program Rules"),
    dos_ProgramStage: () => i18n.t("Program Stage"),
    dos_Programs: () => i18n.t("Programs"),
    dos_ResourceType: () => i18n.t("Resource Type"),
    dos_Resources: () => i18n.t("Resources"),
    dos_ResourcesNumber: () => i18n.t("Number of Resources"),
    dos_Section: () => i18n.t("Section"),
    dos_SeeOptions: () => i18n.t("See options"),
    dos_SourceType: () => i18n.t("Source Type"),
    dos_Stage: () => i18n.t("Stage"),
    dos_StagesReferenced: () => i18n.t("Stage(s) Referenced"),
    dos_StaticText: () => i18n.t("Static Text"),
    dos_TrackedEntityAttributes: () => i18n.t("Tracked Entity Attributes"),
    dos_TrackedEntityAttributesNumber: () =>
        i18n.t("Number of Tracked Entity Attributes in Program"),
    dos_Type: () => i18n.t("Type"),
    dos_TypeOfProgramIndicator: () => i18n.t("Type of Program Indicator"),
    dos_ValueType: () => i18n.t("Value Type"),
    dos_Visibility: () => i18n.t("Visibility in Data Entry"),
    dos_Visualization: () => i18n.t("Visualization"),
    dos_exportToExcel: () => i18n.t("Export this page to Excel"),
    dos_showLegacy: () => i18n.t("Show legacy data elements and options"),
    program_description_help: () =>
        i18n.t("Defines a description of the Health Program used in HMIS."),
    programs_description_description: () =>
        i18n.t(
            "Refers to the specific details and setup for a health program within the HMIS system, primarily used for tracking and managing health-related activities, services, or interventions."
        ),
    programs_i_denominator_help: () =>
        i18n.t("Defines the title of the Indicator denominator for what the indicator calculates."),
    programs_i_description: () =>
        i18n.t(
            "Metrics defined within the program to measure its outcomes or impact, such as completion rate, follow-up attendance, or disease incidence rate"
        ),
    programs_i_description_help: () =>
        i18n.t("Defines a description of an indicator used in a program in HMIS."),
    programs_i_name_help: () =>
        i18n.t("Defines the name of an indicator used in a program in HMIS."),
    programs_i_numerator_help: () =>
        i18n.t(
            "Defines the title of the Indicator numerator for the value the indicator calculates."
        ),
    programs_i_stagesReferenced_help: () =>
        i18n.t(
            "Defines the stages of a program that the Indicator is set  for data calculation in a program in HMIS."
        ),
    programs_i_type_help: () =>
        i18n.t(
            "Defines a type of the data value calculated by an indicator used in a program in HMIS."
        ),
    programs_i_visualization_help: () =>
        i18n.t(
            "Displays the data visualization set for the Indicator following a calculation in a program in HMIS."
        ),
    programs_pi_aggregationType_help: () =>
        i18n.t("Defines an aggregation type of the program indicator used in a program in HMIS."),
    programs_pi_boundaries_help: () =>
        i18n.t(
            "Defines the calculation boundaries with which the program indicator calculates data values of a program in HMIS."
        ),
    programs_pi_calculation_help: () =>
        i18n.t("Defines the calculation mode of the program indicator in a program in HMIS."),
    programs_pi_description: () =>
        i18n.t(
            "Specialized custom metrics indicators built from data collected within a program, typically calculated from one or more data elements and attributes gathered through various stages of program activities"
        ),
    programs_pi_description_help: () =>
        i18n.t("Defines a description of the program indicator used in a program in HMIS."),
    programs_pi_filter_help: () =>
        i18n.t("Defines a filter of the program indicator used in a program in HMIS."),
    programs_pi_name_help: () =>
        i18n.t("Defines the name of the program indicator used in a program in HMIS."),
    programs_pi_stagesReferenced_help: () =>
        i18n.t(
            "Defines the stages of a Program that the program indicator is set  for data calculation in a program in HMIS."
        ),
    programs_pi_type_help: () =>
        i18n.t("Defines the type of program indicator used in a program in HMIS."),
    programs_pi_visualization_help: () =>
        i18n.t(
            "Displays the data visualization set for the program indicator following a calculation in a program in HMIS."
        ),
    programs_pr_actions_help: () =>
        i18n.t(
            "Defines the executable actions for a program rule configured for a program in HMIS."
        ),
    programs_pr_condition_help: () =>
        i18n.t(
            "Defines the set of conditions which a program rule is configured for execution for a program in HMIS."
        ),
    programs_pr_description: () =>
        i18n.t(
            "Rules that allow you to create and control dynamic behavior of the user interface in the Tracker Capture and Event Capture apps."
        ),
    programs_pr_description_help: () =>
        i18n.t("Defines a description of the program rules configured for a program in HMIS."),
    programs_pr_name_help: () =>
        i18n.t("Defines the name of the program rules configured for a program in HMIS."),
    programs_pr_program_stage_help: () =>
        i18n.t(
            "Defines the stages of a program that the rule is defined for the rule action to execute in a program in HMIS."
        ),
    programs_prv_associatedProgramRules_help: () =>
        i18n.t(
            "Defines the program rules that are associated to the program rule variable for a program in HMIS."
        ),
    programs_prv_dataElement_help: () =>
        i18n.t(
            "Defines the data element of a program rule variable that is configured  for data collection in a program in HMIS."
        ),
    programs_prv_description: () => i18n.t("Variables used to create program rule expressions."),
    programs_prv_name_help: () =>
        i18n.t("Defines a name for the program rule Variables configured for a program in HMIS."),
    programs_prv_programStage_help: () =>
        i18n.t(
            "Defines the stage of a program that the program rule variable is set  for data calculation in a program in HMIS."
        ),
    programs_prv_sourceType_help: () =>
        i18n.t(
            "Defines a source type for a program rule variable configured for a program in HMIS."
        ),
    programs_prv_trackedEntityAttributes_help: () =>
        i18n.t(
            "Defines the tracked entity attributes set for the program rule varibale used in a program in HMIS."
        ),
    programs_ps_calculationMode_help: () =>
        i18n.t(
            "Defines the mode of calculation of the data values to be collected in a stage of a program in HMIS."
        ),
    programs_ps_description: () =>
        i18n.t(
            "Specifies stages within the program for data collection, which could include various appointments, follow-ups, or interventions."
        ),
    programs_ps_description_help: () =>
        i18n.t("Defines a description of the stage of a program in HMIS."),
    programs_ps_formName_help: () =>
        i18n.t("Defines the name of the form used in a program stage in HMIS."),
    programs_ps_mandatory_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the program stage should be mandatory in an entry form."
        ),
    programs_ps_name_help: () =>
        i18n.t("Defines the name of the data element of a program in HMIS."),
    programs_ps_optionSet_help: () =>
        i18n.t(
            "Defines the option set of the tracked entity attribute data assigned used in an entry form."
        ),
    programs_ps_valueType_help: () =>
        i18n.t("Defines the type of data to be collected in a stage of a program in HMIS."),
    programs_ps_visbility_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the attribute should be mandatory or not used in an entry form."
        ),
    programs_tei_aggregationType_help: () =>
        i18n.t(
            "Defines a data aggregation type of the tracked entity attribute for the patients data collected in an entry form."
        ),
    programs_tei_description: () =>
        i18n.t(
            "Additional data tied to individuals, like patient ID, age, gender, or location, for long-term tracking across the HMIS."
        ),
    programs_tei_description_help: () =>
        i18n.t(
            "Defines a description of the tracked entity attribute for the patients data collected in an entry form."
        ),
    programs_tei_formName_help: () =>
        i18n.t(
            "Defines the form name of the tracked entity attribute for the patient's data collected an entry form."
        ),
    programs_tei_mandatory_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the tracked entity attribute should be visible or not used in an entry form."
        ),
    programs_tei_name_help: () =>
        i18n.t(
            "Defines the name of the tracked entity attribute for the patients data collected an entry form."
        ),
    programs_tei_optionSet_help: () =>
        i18n.t(
            "Defines the option set of the tracked entity attribute data assigned used in an entry form."
        ),
    programs_tei_valueType_help: () =>
        i18n.t(
            "Defines a data value type of the tracked entity attribute for the patients data collected in an entry form."
        ),
    programs_tei_visbility_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the attribute should be mandatory or not used in an entry form."
        ),
};

/** Help texts of the headers and columns. */
export const programHelp = {
    program_description_help: () =>
        i18n.t("Defines a description of the Health Program used in HMIS."),
    programs_description_description: () =>
        i18n.t(
            "Refers to the specific details and setup for a health program within the HMIS system, primarily used for tracking and managing health-related activities, services, or interventions."
        ),
    programs_i_denominator_help: () =>
        i18n.t("Defines the title of the Indicator denominator for what the indicator calculates."),
    programs_i_description: () =>
        i18n.t(
            "Metrics defined within the program to measure its outcomes or impact, such as completion rate, follow-up attendance, or disease incidence rate"
        ),
    programs_i_description_help: () =>
        i18n.t("Defines a description of an indicator used in a program in HMIS."),
    programs_i_name_help: () =>
        i18n.t("Defines the name of an indicator used in a program in HMIS."),
    programs_i_numerator_help: () =>
        i18n.t(
            "Defines the title of the Indicator numerator for the value the indicator calculates."
        ),
    programs_i_stagesReferenced_help: () =>
        i18n.t(
            "Defines the stages of a program that the Indicator is set  for data calculation in a program in HMIS."
        ),
    programs_i_type_help: () =>
        i18n.t(
            "Defines a type of the data value calculated by an indicator used in a program in HMIS."
        ),
    programs_i_visualization_help: () =>
        i18n.t(
            "Displays the data visualization set for the Indicator following a calculation in a program in HMIS."
        ),
    programs_pi_aggregationType_help: () =>
        i18n.t("Defines an aggregation type of the program indicator used in a program in HMIS."),
    programs_pi_boundaries_help: () =>
        i18n.t(
            "Defines the calculation boundaries with which the program indicator calculates data values of a program in HMIS."
        ),
    programs_pi_calculation_help: () =>
        i18n.t("Defines the calculation mode of the program indicator in a program in HMIS."),
    programs_pi_description: () =>
        i18n.t(
            "Specialized custom metrics indicators built from data collected within a program, typically calculated from one or more data elements and attributes gathered through various stages of program activities"
        ),
    programs_pi_description_help: () =>
        i18n.t("Defines a description of the program indicator used in a program in HMIS."),
    programs_pi_filter_help: () =>
        i18n.t("Defines a filter of the program indicator used in a program in HMIS."),
    programs_pi_name_help: () =>
        i18n.t("Defines the name of the program indicator used in a program in HMIS."),
    programs_pi_stagesReferenced_help: () =>
        i18n.t(
            "Defines the stages of a Program that the program indicator is set  for data calculation in a program in HMIS."
        ),
    programs_pi_type_help: () =>
        i18n.t("Defines the type of program indicator used in a program in HMIS."),
    programs_pi_visualization_help: () =>
        i18n.t(
            "Displays the data visualization set for the program indicator following a calculation in a program in HMIS."
        ),
    programs_pr_actions_help: () =>
        i18n.t(
            "Defines the executable actions for a program rule configured for a program in HMIS."
        ),
    programs_pr_condition_help: () =>
        i18n.t(
            "Defines the set of conditions which a program rule is configured for execution for a program in HMIS."
        ),
    programs_pr_description: () =>
        i18n.t(
            "Rules that allow you to create and control dynamic behavior of the user interface in the Tracker Capture and Event Capture apps."
        ),
    programs_pr_description_help: () =>
        i18n.t("Defines a description of the program rules configured for a program in HMIS."),
    programs_pr_name_help: () =>
        i18n.t("Defines the name of the program rules configured for a program in HMIS."),
    programs_pr_program_stage_help: () =>
        i18n.t(
            "Defines the stages of a program that the rule is defined for the rule action to execute in a program in HMIS."
        ),
    programs_prv_associatedProgramRules_help: () =>
        i18n.t(
            "Defines the program rules that are associated to the program rule variable for a program in HMIS."
        ),
    programs_prv_dataElement_help: () =>
        i18n.t(
            "Defines the data element of a program rule variable that is configured  for data collection in a program in HMIS."
        ),
    programs_prv_description: () => i18n.t("Variables used to create program rule expressions."),
    programs_prv_name_help: () =>
        i18n.t("Defines a name for the program rule Variables configured for a program in HMIS."),
    programs_prv_programStage_help: () =>
        i18n.t(
            "Defines the stage of a program that the program rule variable is set  for data calculation in a program in HMIS."
        ),
    programs_prv_sourceType_help: () =>
        i18n.t(
            "Defines a source type for a program rule variable configured for a program in HMIS."
        ),
    programs_prv_trackedEntityAttributes_help: () =>
        i18n.t(
            "Defines the tracked entity attributes set for the program rule varibale used in a program in HMIS."
        ),
    programs_ps_calculationMode_help: () =>
        i18n.t(
            "Defines the mode of calculation of the data values to be collected in a stage of a program in HMIS."
        ),
    programs_ps_description: () =>
        i18n.t(
            "Specifies stages within the program for data collection, which could include various appointments, follow-ups, or interventions."
        ),
    programs_ps_description_help: () =>
        i18n.t("Defines a description of the stage of a program in HMIS."),
    programs_ps_formName_help: () =>
        i18n.t("Defines the name of the form used in a program stage in HMIS."),
    programs_ps_mandatory_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the program stage should be mandatory in an entry form."
        ),
    programs_ps_name_help: () =>
        i18n.t("Defines the name of the data element of a program in HMIS."),
    programs_ps_optionSet_help: () =>
        i18n.t(
            "Defines the option set of the tracked entity attribute data assigned used in an entry form."
        ),
    programs_ps_valueType_help: () =>
        i18n.t("Defines the type of data to be collected in a stage of a program in HMIS."),
    programs_ps_visbility_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the attribute should be mandatory or not used in an entry form."
        ),
    programs_tei_aggregationType_help: () =>
        i18n.t(
            "Defines a data aggregation type of the tracked entity attribute for the patients data collected in an entry form."
        ),
    programs_tei_description: () =>
        i18n.t(
            "Additional data tied to individuals, like patient ID, age, gender, or location, for long-term tracking across the HMIS."
        ),
    programs_tei_description_help: () =>
        i18n.t(
            "Defines a description of the tracked entity attribute for the patients data collected in an entry form."
        ),
    programs_tei_formName_help: () =>
        i18n.t(
            "Defines the form name of the tracked entity attribute for the patient's data collected an entry form."
        ),
    programs_tei_mandatory_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the tracked entity attribute should be visible or not used in an entry form."
        ),
    programs_tei_name_help: () =>
        i18n.t(
            "Defines the name of the tracked entity attribute for the patients data collected an entry form."
        ),
    programs_tei_optionSet_help: () =>
        i18n.t(
            "Defines the option set of the tracked entity attribute data assigned used in an entry form."
        ),
    programs_tei_valueType_help: () =>
        i18n.t(
            "Defines a data value type of the tracked entity attribute for the patients data collected in an entry form."
        ),
    programs_tei_visbility_help: () =>
        i18n.t(
            "Defines a boolean expression of whether the attribute should be mandatory or not used in an entry form."
        ),
};
