import { Id } from "$/domain/entities/Ref";

export type IdsParse = { type: "valid"; ids: Id[] } | { type: "invalid" };

/** The lists of group ids are written as a JSON array of strings, as in the Angular app. */
export function parseIds(text: string): IdsParse {
    try {
        const parsed: unknown = JSON.parse(text.trim() === "" ? "[]" : text);
        const isValid = Array.isArray(parsed) && parsed.every(item => typeof item === "string");
        return isValid ? { type: "valid", ids: parsed } : { type: "invalid" };
    } catch {
        return { type: "invalid" };
    }
}

export function stringifyIds(ids: Id[]): string {
    return JSON.stringify(ids);
}
