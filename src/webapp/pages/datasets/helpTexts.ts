import i18n from "$/utils/i18n";

/** Help texts of the Data Sets screen. Keys are the Angular translation keys. */
export const helpTexts = {
    datasets_cc_categories_help: () => i18n.t("Defines the categories assigned for that dataset."),
    datasets_cc_categoryCombination_help: () =>
        i18n.t(
            "Defines the category combination name for the category combo used for that dataset."
        ),
    datasets_cc_description: () =>
        i18n.t(
            "Define dimensions that allow users to break down data elements by multiple attributes for data collection and analysis."
        ),
    datasets_cc_items_help: () =>
        i18n.t(
            "Defines the specific disaggregation item that can be used to disaggregate the data collected by the dataset."
        ),
    datasets_i_description: () =>
        i18n.t(
            "Specifies stages within the program for data collection, which could include various appointments, follow-ups, or interventions."
        ),
    datasets_ind_denominatorDescription_help: () =>
        i18n.t(
            "Defines a description of the indicator numerator based on what result the indicator calculates."
        ),
    datasets_ind_denominator_help: () =>
        i18n.t(
            "Defines the title of the indicator denominator based on what result the indicator calculates."
        ),
    datasets_ind_name_help: () =>
        i18n.t("Defines the name of the indicator assigned/used in a dataset."),
    datasets_ind_numeratorDescription_help: () =>
        i18n.t(
            "Defines a description of the indicator numerator based on what result the indicator calculates."
        ),
    datasets_ind_numerator_help: () =>
        i18n.t(
            "Defines the title of the indicator numerator based on what result the indicator calculates."
        ),
    datasets_ind_shortName_help: () =>
        i18n.t("Defines the short name of the indicator, used in compact displays and analytics."),
    datasets_ind_type_help: () =>
        i18n.t(
            "Defines the type of value that is resulted from the calculation of the indicator based on the calculation fomula."
        ),
    datasets_sec_categoryCombination_help: () =>
        i18n.t(
            "Defines the category combination used for collection in the specified data element."
        ),
    datasets_sec_dataTypeElement_help: () =>
        i18n.t("Defines the data type of the specific data element used in the form."),
    datasets_sec_description: () =>
        i18n.t(
            "Organizational elements that group data elements into meaningful categories  structured logically."
        ),
    datasets_sec_description_help: () =>
        i18n.t("Defines the description of the data element in the section form."),
    datasets_sec_formName_help: () => i18n.t("Defines the name of the form used in a section."),
    datasets_sec_name_help: () => i18n.t("Defines the name of the section."),
    datasets_sec_options_help: () =>
        i18n.t("Defines the options assigned to the data element in a section."),
    datasets_sec_shortName_help: () =>
        i18n.t(
            "Defines the short name of the data element, used in compact displays and analytics."
        ),
};
