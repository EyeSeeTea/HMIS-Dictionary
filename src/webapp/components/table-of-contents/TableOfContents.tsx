import React from "react";
import i18n from "$/utils/i18n";
import css from "./TableOfContents.module.css";

export type TocItem = { id: string; label: string; children?: TocItem[] };

/** The top of the page, which "Go to Index" scrolls to (it has the header and the table of contents). */
export const pageTopId = "headerDossierPanel";

export function scrollToId(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export const TableOfContents: React.FC<{ items: TocItem[] }> = React.memo(({ items }) => {
    if (items.length === 0) return null;

    return (
        <nav id="tocContainer" className={css.toc} aria-label={i18n.t("Table of Content")}>
            <h4>{i18n.t("Table of Content")}</h4>
            <TocList items={items} />
        </nav>
    );
});

const TocList: React.FC<{ items: TocItem[] }> = ({ items }) => (
    <ul>
        {items.map(item => (
            <li key={item.id}>
                <a href={`#${item.id}`} onClick={event => jump(event, item.id)}>
                    {item.label}
                </a>
                {item.children && item.children.length > 0 && <TocList items={item.children} />}
            </li>
        ))}
    </ul>
);

export const GoToIndexLink: React.FC = React.memo(() => (
    <a
        href={`#${pageTopId}`}
        className={`${css.back} no-print`}
        onClick={event => jump(event, pageTopId)}
    >
        {i18n.t("Go to Index")}
    </a>
));

export const BackToTopLink: React.FC = React.memo(() => (
    <a
        href="#top"
        className={`${css.back} no-print`}
        onClick={event => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }}
    >
        {i18n.t("Back to Top")}
    </a>
));

// Hash routes: a plain "#id" link would change the route, so scroll by hand.
function jump(event: React.MouseEvent, id: string): void {
    event.preventDefault();
    scrollToId(id);
}
