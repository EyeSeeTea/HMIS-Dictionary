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

/**
 * The global search: "a|b" finds any of the terms, and "a b" finds all the words, in any order and
 * in any column. Column filters are "a|b" too. Filters combine with AND. Not case-sensitive.
 */
export class SearchFilter extends Struct<SearchFilterAttrs>() {
    matches(row: SearchRow): boolean {
        const values = [...Object.values(row.columns), ...Object.values(row.raw)];
        const isInRow = (term: string) => values.some(value => includes(value, term));

        return (
            matchesGlobal(this.global, isInRow) &&
            Object.entries(this.columns).every(([column, filter]) => {
                const terms = getTerms(filter);
                const value = row.columns[column as SearchColumn];
                return terms.length === 0 || terms.some(term => includes(value, term));
            })
        );
    }

    highlightTerms(column: SearchColumn): string[] {
        return [...getWords(this.global), ...getTerms(this.columns[column] ?? "")];
    }
}

function matchesGlobal(global: string, isInRow: (term: string) => boolean): boolean {
    if (global.includes("|")) {
        const terms = getTerms(global);
        return terms.length === 0 || terms.some(isInRow);
    }

    return getWords(global).every(isInRow);
}

function getTerms(filter: string): string[] {
    return filter
        .split("|")
        .map(term => term.trim())
        .filter(Boolean);
}

function getWords(text: string): string[] {
    return text.split(/[\s|]+/).filter(Boolean);
}

function includes(value: string, term: string): boolean {
    return value.toLowerCase().includes(term.toLowerCase());
}
