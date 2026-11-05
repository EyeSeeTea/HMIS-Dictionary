import {
    Access,
    LayoutColumn,
    LayoutSection,
    LayoutSettings,
} from "$/domain/entities/LayoutSettings";

/** Checkboxes of one row. The admin one is always checked and disabled. */
export type RowDraft = { advanced: boolean; everyone: boolean };

/** Key of a row: "section" or "section.column". */
export type LayoutDraft = Record<string, RowDraft>;

export function getDraft(settings: LayoutSettings): LayoutDraft {
    return Object.fromEntries(
        settings.sections.flatMap(section => [
            [section.key, toRow(section.access)],
            ...section.columns.map(column => [
                `${section.key}.${column.key}`,
                toRow(column.access),
            ]),
        ])
    );
}

/** The same accesses with the draft applied. Everyone wins over advanced, as the Angular app does. */
export function applyDraft(sections: LayoutSection[], draft: LayoutDraft): LayoutSection[] {
    return sections.map(section => ({
        ...withAccess(section, draft[section.key]),
        columns: section.columns.map(column =>
            withAccess(column, draft[`${section.key}.${column.key}`])
        ),
    }));
}

export function isSameDraft(a: LayoutDraft, b: LayoutDraft): boolean {
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every(
            key => a[key]?.advanced === b[key]?.advanced && a[key]?.everyone === b[key]?.everyone
        )
    );
}

function toRow(access: Access): RowDraft {
    return { advanced: access !== "admin", everyone: access === "everyone" };
}

function withAccess<T extends LayoutColumn>(item: T, row: RowDraft | undefined): T {
    if (!row) return item;
    const access: Access = row.everyone ? "everyone" : row.advanced ? "advanced" : "admin";
    return { ...item, access };
}

export type AdvancedGroupsParse = { type: "valid"; ids: string[] } | { type: "invalidFormat" };

/** The field is a JSON array of user group ids, as in the Angular app. */
export function parseAdvancedGroups(text: string): AdvancedGroupsParse {
    try {
        const parsed: unknown = JSON.parse(text);
        const isValid = Array.isArray(parsed) && parsed.every(item => typeof item === "string");
        return isValid ? { type: "valid", ids: parsed } : { type: "invalidFormat" };
    } catch {
        return { type: "invalidFormat" };
    }
}

export function stringifyAdvancedGroups(ids: string[]): string {
    return JSON.stringify(ids);
}
