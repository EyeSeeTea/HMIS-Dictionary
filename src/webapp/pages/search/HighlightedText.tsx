import React from "react";
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

export function splitByTerms(text: string, terms: string[]): TextPart[] {
    const usable = terms.filter(Boolean);
    if (usable.length === 0 || !text) return [{ text, match: false }];

    const pattern = new RegExp(`(${usable.map(escapeRegExp).join("|")})`, "gi");

    return text
        .split(pattern)
        .filter(part => part !== "")
        .map(part => ({
            text: part,
            match: usable.some(term => term.toLowerCase() === part.toLowerCase()),
        }));
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
