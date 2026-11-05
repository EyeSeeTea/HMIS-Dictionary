import { deburr } from "$/utils/deburr";
import { Struct } from "./generic/Struct";

/** Also the translation keys of the Search columns. */
export type SearchColumn =
    | "object_type"
    | "object_id"
    | "object_code"
    | "object_ICD10"
    | "object_name"
    | "object_shortName"
    | "object_form"
    | "object_description"
    | "object_num_formula"
    | "object_den_formula"
    | "object_flt_formula"
    | "object_exp_formula"
    | "objectGroup_id"
    | "objectGroup_code"
    | "objectGroup_name"
    | "service_id"
    | "service_code"
    | "service_name";

export type SearchRow = {
    columns: Record<SearchColumn, string>;
    /** Not columns, but the global search looks here too. */
    raw: { numerator: string; denominator: string; expression: string; filter: string };
};

export type SearchFilterAttrs = {
    global: string;
    columns: Partial<Record<SearchColumn, string>>;
};

/** "a|b" is OR inside a filter, and filters combine with AND. Not case-sensitive. */
export class SearchFilter extends Struct<SearchFilterAttrs>() {
    matches(row: SearchRow): boolean {
        const globalTerms = getTerms(this.global);
        const values = [...Object.values(row.columns), ...Object.values(row.raw)];
        const matchesGlobal =
            globalTerms.length === 0 ||
            globalTerms.some(term => values.some(value => includes(value, term)));

        return (
            matchesGlobal &&
            Object.entries(this.columns).every(([column, filter]) => {
                const terms = getTerms(filter);
                const value = row.columns[column as SearchColumn];
                return terms.length === 0 || terms.some(term => includes(value, term));
            })
        );
    }

    highlightTerms(column: SearchColumn): string[] {
        return [...getTerms(this.global), ...getTerms(this.columns[column] ?? "")];
    }
}

function getTerms(filter: string): string[] {
    return filter
        .split("|")
        .map(term => term.trim())
        .filter(Boolean);
}

/** Not case-sensitive, and "e" finds "é". */
function includes(value: string, term: string): boolean {
    return deburr(value).toLowerCase().includes(deburr(term).toLowerCase());
}
