import React from "react";
import { deburr } from "$/utils/deburr";
import css from "./HighlightedText.module.css";

/** Marks every occurrence of the terms, not case-sensitive. Terms are literal text, not regexes. */
export const HighlightedText: React.FC<{ text: string; terms: string[] }> = React.memo(
    ({ text, terms }) => {
        const parts = React.useMemo(() => splitByTerms(text, terms), [text, terms]);

        return (
            <>
                {parts.map((part, index) =>
                    part.match ? (
                        <mark key={index} className={`highlighted ${css.mark}`}>
                            {part.text}
                        </mark>
                    ) : (
                        <React.Fragment key={index}>{part.text}</React.Fragment>
                    )
                )}
            </>
        );
    }
);

export type TextPart = { text: string; match: boolean };

/** The matches are found without accents ("e" matches "é") and the text keeps its own. */
export function splitByTerms(text: string, terms: string[]): TextPart[] {
    const usable = terms.filter(Boolean);
    if (usable.length === 0 || !text) return [{ text, match: false }];

    const pattern = new RegExp(
        `(?:${usable.map(term => escapeRegExp(deburr(term))).join("|")})`,
        "gi"
    );
    const parts: TextPart[] = [];
    let last = 0;

    for (const match of deburr(text).matchAll(pattern)) {
        const start = match.index ?? 0;
        if (match[0] === "") continue;
        if (start > last) parts.push({ text: text.slice(last, start), match: false });
        parts.push({ text: text.slice(start, start + match[0].length), match: true });
        last = start + match[0].length;
    }

    if (last < text.length) parts.push({ text: text.slice(last), match: false });
    return parts.length > 0 ? parts : [{ text, match: false }];
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
