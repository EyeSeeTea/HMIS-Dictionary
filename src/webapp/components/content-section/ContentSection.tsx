import React from "react";
import { CircularLoader, NoticeBox } from "@dhis2/ui";
import { Maybe } from "$/utils/ts-utils";
import { GoToIndexLink } from "$/webapp/components/table-of-contents/TableOfContents";
import { HelpIcon } from "$/webapp/components/help-icon/HelpIcon";
import { Loader } from "$/webapp/utils/Loader";
import css from "./ContentSection.module.css";

export type ContentSectionProps = {
    /** Anchor id, the same used in the table of contents. */
    id: string;
    title: string;
    count?: number;
    /** "Number of ...": shown with the count under the heading, as in the Angular app. */
    countLabel?: string;
    helpText?: string;
    /** State of this section's own load. Without it, the content is always shown. */
    loader?: Loader<unknown>;
    /** Hides the section completely (nothing to show). */
    hidden?: boolean;
    goToIndex?: boolean;
    /** The heading is the anchor: `h3.section` by default. The e2e suite depends on these. */
    level?: "h2" | "h3";
    headingClassName?: string;
    /** Puts what follows the heading in one `div`, as the indicator groups of the dossiers do. */
    wrapContent?: boolean;
    actions?: Maybe<React.ReactNode>;
    children?: React.ReactNode;
};

export const ContentSection: React.FC<ContentSectionProps> = React.memo(props => {
    const {
        id,
        title,
        count,
        countLabel,
        helpText,
        loader,
        hidden,
        goToIndex = true,
        level: Heading = "h3",
        headingClassName = "section",
        wrapContent,
        actions,
        children,
    } = props;

    if (hidden) return null;

    const meta = ((count !== undefined && countLabel) || goToIndex || actions) && (
        <p className={css.meta}>
            {count !== undefined && countLabel && (
                <span>
                    {countLabel}: {count}
                </span>
            )}
            {goToIndex && <GoToIndexLink />}
            {actions}
        </p>
    );

    const content = (
        <>
            {meta}
            {loader?.type === "loading" && <CircularLoader small />}
            {loader?.type === "error" && (
                <NoticeBox error title={title}>
                    {loader.error.message}
                </NoticeBox>
            )}
            {loader?.type !== "loading" && loader?.type !== "error" && children}
        </>
    );

    // The heading, then the "Number of ..." line, as siblings: the e2e suite looks for them so
    return (
        <section className={css.section} data-test={`section-${id}`}>
            <Heading id={id} className={`${headingClassName} ${css.heading}`.trim()}>
                {title}
                {helpText && <HelpIcon text={helpText} />}
            </Heading>
            {wrapContent ? <div>{content}</div> : content}
        </section>
    );
});
