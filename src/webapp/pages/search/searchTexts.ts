import { SearchColumn } from "$/domain/entities/SearchFilter";
import i18n from "$/utils/i18n";

/** Titles and help texts of the Search columns, from the Angular translations. */
export const columnTexts: Record<SearchColumn, { title: () => string; help: () => string }> = {
    object_type: {
        title: () => i18n.t("Type"),
        help: () =>
            i18n.t(
                "Defines the data type of the specific data element  or indicator used in the form."
            ),
    },
    object_id: {
        title: () => i18n.t("ID"),
        help: () =>
            i18n.t("Defines the unique ID of the data element or indicator used in the form."),
    },
    object_code: {
        title: () => i18n.t("Code"),
        help: () =>
            i18n.t(
                "Defines the unique code assigned to the data element or indicator in the form."
            ),
    },
    object_ICD10: {
        title: () => i18n.t("ICD10"),
        help: () =>
            i18n.t(
                "Defines the unique ICD10 Code assigned to the specified data element or indicator in the form."
            ),
    },
    object_name: {
        title: () => i18n.t("Name"),
        help: () =>
            i18n.t("Defines the name of the data element or indicator assigned/used in a dataset."),
    },
    object_shortName: {
        title: () => i18n.t("Short Name"),
        help: () =>
            i18n.t(
                "Defines the short name of the data element or indicator, used in compact displays and analytics."
            ),
    },
    object_form: {
        title: () => i18n.t("Form name (datae. only)"),
        help: () =>
            i18n.t("Defines the form name in the section form.(Applicable to Data Elements only)."),
    },
    object_description: {
        title: () => i18n.t("Description"),
        help: () =>
            i18n.t("Defines the description of the Data Element or Indicator used in a form."),
    },
    object_num_formula: {
        title: () => i18n.t("Numerator Formula (ind. only)"),
        help: () =>
            i18n.t(
                "Defines a description of the numerator formula used in an Indicator. Applicable for Indicators."
            ),
    },
    object_den_formula: {
        title: () => i18n.t("Denominator Formula (ind. only)"),
        help: () =>
            i18n.t(
                "Defines a description of the denominator formula used in an Indicator. Applicable for Indicators."
            ),
    },
    object_flt_formula: {
        title: () => i18n.t("Filter Formula (prog. ind. only)"),
        help: () =>
            i18n.t(
                "Defines a description of the filter formula used in an Program Indicator. Applicable for Program Indicators."
            ),
    },
    object_exp_formula: {
        title: () => i18n.t("Expression Formula (prog. ind. only)"),
        help: () =>
            i18n.t(
                "Defines a description of the expression formula used in an Program Indicator. Applicable for Program Indicators."
            ),
    },
    objectGroup_id: {
        title: () => i18n.t("Group ID"),
        help: () =>
            i18n.t(
                "Defines the unique ID of the data element or indicator group used in a dataset or the group unique IDs assigned to a program indicator."
            ),
    },
    objectGroup_code: {
        title: () => i18n.t("Group Code"),
        help: () =>
            i18n.t(
                "Defines the unique code assigned to the data element or indicator group used in a dataset or the group unique codes assigned to a program indicator."
            ),
    },
    objectGroup_name: {
        title: () => i18n.t("Group Name"),
        help: () =>
            i18n.t(
                "Defines the name of the data element or indicator groups assigned or used in a dataset or the group names assigned to a program indicator."
            ),
    },
    dataElementGroup_name: {
        title: () => i18n.t("Data Element Groups"),
        help: () => i18n.t("Defines the data element groups a data element belongs to."),
    },
    program_name: {
        title: () => i18n.t("Program"),
        help: () =>
            i18n.t(
                "Defines the program of a program indicator, or the programs that use a tracker data element."
            ),
    },
    service_id: {
        title: () => i18n.t("Service ID"),
        help: () =>
            i18n.t(
                "Defines the unique service ID of the data element or indicator used in a dataset."
            ),
    },
    service_code: {
        title: () => i18n.t("Service Code"),
        help: () =>
            i18n.t(
                "Defines the unique service code assigned to the data element or indicator group used in a dataset."
            ),
    },
    service_name: {
        title: () => i18n.t("Service Name"),
        help: () => i18n.t("Defines the name of the Service assigned to the dataset."),
    },
};

export const searchTexts = {
    srch_SearchAll: () => i18n.t("Search"),
    srch_SearchAll_Clear: () => i18n.t("Clear filters"),
    srch_SearchAll_Row: () => i18n.t("Show / Hide column filters"),
    srch_SearchAll_Here: () => i18n.t("Type here..."),
    srch_SelectColumns: () => i18n.t("Manage Columns"),
    srch_Help: () => i18n.t("Help"),
    srch_formula_modal_expand: () => i18n.t("Expand"),
    srch_formula_modal_max_depth: () => i18n.t("Max Depth (1-10):"),
    srch_exportToExcel: () => i18n.t("Export this page to Excel"),
};

/** Rich text: rendered as sanitized HTML. */
/** How to combine terms, and what the words of DHIS2 mean. */
export const searchGuideHtml = () =>
    i18n.t(
        "<p><b>Combining terms in the search:</b></p><ul><li><code>a b</code>: rows with all the words, in any order and in any column. Rows with the exact phrase go first.</li><li><code>a &amp; b</code>: rows with all the terms.</li><li><code>a | b</code>: rows with any of the terms.</li></ul><p><b>DHIS2 terminology:</b></p><ul><li><b>Data Element:</b> an item of counted data or raw data.</li><li><b>Indicator:</b> combined data or calculations the system does using data elements. These could be totals, percentages, rates, etc.</li><li><b>Program Indicator:</b> a calculation or filtering of individual level data (recorded in Programs). Some program indicators may be a building block for an indicator (used in its numerator or denominator).</li><li><b>Group:</b> data elements of the same data set, entirely or in part, are grouped in a data element group. Related indicators are grouped in an indicator group.</li><li><b>Data Set:</b> made up of data elements to collect aggregate data or total numbers for a specific medical service.</li><li><b>Program:</b> made up of data elements to collect individual patient data for a particular medical service.</li></ul>",
        { nsSeparator: false }
    );

export const searchHelpHtml = () =>
    i18n.t(
        "<p>This interface is made to simplify user access the terminology associated with information collected with HMIS.<br><ul><li>Via the <b>Search</b> tab, you can directly search for a term in all the columns of the table. You can display column filters as well, which allow you to search for information in one specific column. Use 'Clear filters' to reset all the filters. <i>Expert users can use the key word '|' (OR) to search multiple objects.</i></li><li>Via the <b>Manage Columns</b> tab, you can select columns to be displayed in the table. <i>Expert users can use the advanced columns to perform detailed researches via IDs.</i></li></ul>You can finally export the results of your search to Excel (page by page, and do not forget to save as .xls).</p>"
    );
