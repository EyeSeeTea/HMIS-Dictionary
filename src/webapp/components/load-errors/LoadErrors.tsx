import React from "react";
import { NoticeBox } from "@dhis2/ui";
import i18n from "$/utils/i18n";
import { Loader } from "$/webapp/utils/Loader";

export type LoadPiece = { label: string; loader: Loader<unknown> | undefined };

type Props = { pieces: LoadPiece[] };

/**
 * Lists the pieces of a page that failed to load. Sections hide themselves when they have no
 * data, so without this a failed request (or an error mapping its response) leaves no trace.
 */
export const LoadErrors: React.FC<Props> = React.memo(({ pieces }) => {
    const failed = pieces.flatMap(({ label, loader }) =>
        loader?.type === "error" ? [{ label, message: loader.error.message }] : []
    );
    if (failed.length === 0) return null;

    return (
        <div data-test="load-errors">
            <NoticeBox error title={i18n.t("Some sections could not be loaded")}>
                <ul>
                    {failed.map(({ label, message }) => (
                        <li key={label}>
                            {label}: {message || i18n.t("Unknown error")}
                        </li>
                    ))}
                </ul>
                {i18n.t("The sections that depend on them are not shown either.")}
            </NoticeBox>
        </div>
    );
});
