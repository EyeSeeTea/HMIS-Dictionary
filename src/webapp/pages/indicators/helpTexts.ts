import i18n from "$/utils/i18n";

/** Help texts of the Indicators screen. Keys are the Angular translation keys. */
export const helpTexts = {
    indicators_den_dataSets_help: () =>
        i18n.t("Denotes the respective dataset with which the indicator belongs to."),
    indicators_den_description: () =>
        i18n.t(
            "The part of the indicator formula that provides the context for the Numerator by representing the total or eligible population, events, or units against which the Numerator is compared."
        ),
    indicators_den_name_help: () =>
        i18n.t(
            "Defines the title of the Indicator Denominator based on what the indicator calculates"
        ),
    indicators_den_program_help: () =>
        i18n.t("Denotes the specific program with which the indicator belongs to."),
    indicators_den_type_help: () =>
        i18n.t("Indicator types define the factor that is applied during aggregation."),
    indicators_description_help: () =>
        i18n.t(
            "A set of mathematical operations that is used to calculate rates, incidences and other values that are a result of data element values that have been entered into the system."
        ),
    indicators_fi_description: () => i18n.t("A formula consisting of data elements and numbers"),
    indicators_num_dataSets_help: () =>
        i18n.t("Denotes the respective dataset with which the indicator belongs to."),
    indicators_num_description: () =>
        i18n.t(
            "The part of the indicator formula that represents the primary count or measure being calculated."
        ),
    indicators_num_name_help: () =>
        i18n.t(
            "Defines the title of the indicator numerator based on what the indicator calculates"
        ),
    indicators_num_program_help: () =>
        i18n.t("Denotes the specific program with which the indicator belongs to."),
    indicators_num_type_help: () =>
        i18n.t("Indicator types define the factor that is applied during aggregation."),
};
