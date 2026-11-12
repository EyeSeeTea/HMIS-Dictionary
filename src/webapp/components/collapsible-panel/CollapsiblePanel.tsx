import React from "react";
import { ErrorBoundary } from "$/webapp/components/error-boundary/ErrorBoundary";
import css from "./CollapsiblePanel.module.css";

export type CollapsiblePanelProps = {
    title: string;
    defaultOpen?: boolean;
    /** Id of the body, as in the Angular app. */
    bodyId?: string;
    children: React.ReactNode;
};

/** A titled panel that shows its content only while open, so that content loads on demand. */
export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = React.memo(props => {
    const { title, defaultOpen = false, bodyId, children } = props;
    const [open, setOpen] = React.useState(defaultOpen);

    return (
        <section className={css.panel}>
            <button
                type="button"
                className={css.header}
                aria-expanded={open}
                onClick={() => setOpen(prev => !prev)}
            >
                <span className={css.arrow}>{open ? "▾" : "▸"}</span>
                {title}
            </button>
            {open && (
                <div id={bodyId} className={css.body}>
                    <ErrorBoundary>{children}</ErrorBoundary>
                </div>
            )}
        </section>
    );
});
