import { SearchColumn } from "$/domain/entities/SearchFilter";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";

export type ColumnGroupKey =
    | "objectsBasics"
    | "objectsDescriptions"
    | "groupsBasics"
    | "servicesBasics";

export type SearchColumnDef = {
    key: SearchColumn;
    /** Layout settings: section and column keys. */
    section: ColumnGroupKey;
    layoutColumn: string;
    /** Shown only after "Show / Hide advanced columns". */
    advanced: boolean;
    defaultVisible: boolean;
};

const def = (
    key: SearchColumn,
    section: ColumnGroupKey,
    layoutColumn: string,
    options: { advanced?: boolean; defaultVisible?: boolean } = {}
): SearchColumnDef => ({
    key,
    section,
    layoutColumn,
    advanced: options.advanced ?? false,
    defaultVisible: options.defaultVisible ?? false,
});

/** In table order. */
export const searchColumnDefs: SearchColumnDef[] = [
    def("object_type", "objectsBasics", "type", { defaultVisible: true }),
    def("object_id", "objectsBasics", "id", { advanced: true }),
    def("object_code", "objectsBasics", "code", { advanced: true }),
    def("object_ICD10", "objectsBasics", "icd10", { advanced: true }),
    def("object_name", "objectsBasics", "name", { defaultVisible: true }),
    def("object_shortName", "objectsBasics", "shortName", { defaultVisible: true }),
    def("object_form", "objectsBasics", "form"),
    def("object_description", "objectsDescriptions", "description", { defaultVisible: true }),
    def("object_num_formula", "objectsDescriptions", "numFormula"),
    def("object_den_formula", "objectsDescriptions", "denFormula"),
    def("object_flt_formula", "objectsDescriptions", "filterFormula"),
    def("object_exp_formula", "objectsDescriptions", "expFormula"),
    def("objectGroup_id", "groupsBasics", "id", { advanced: true }),
    def("objectGroup_code", "groupsBasics", "code", { advanced: true }),
    def("objectGroup_name", "groupsBasics", "name"),
    def("service_id", "servicesBasics", "id", { advanced: true }),
    def("service_code", "servicesBasics", "code", { advanced: true }),
    def("service_name", "servicesBasics", "name", { defaultVisible: true }),
];

/** Order and title of the checkbox groups of the column selector. */
export const columnGroups: { key: ColumnGroupKey; title: () => string }[] = [
    { key: "objectsBasics", title: () => getLayoutLabel("srch_SelectColumns_objBasics") },
    { key: "objectsDescriptions", title: () => getLayoutLabel("srch_SelectColumns_objDescs") },
    { key: "groupsBasics", title: () => getLayoutLabel("srch_SelectColumns_grpBasics") },
    { key: "servicesBasics", title: () => getLayoutLabel("srch_SelectColumns_servBasics") },
];

export const defaultVisibleColumns: SearchColumn[] = searchColumnDefs
    .filter(column => column.defaultVisible)
    .map(column => column.key);

export const searchPageSizes = [10, 25, 50, 100];
