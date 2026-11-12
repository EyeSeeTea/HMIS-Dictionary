import React from "react";
import { CircularLoader } from "@dhis2/ui";
import i18n from "$/utils/i18n";
import css from "./LoadingBanner.module.css";

/** Non-blocking message: the page stays usable while its sections load. */
export const LoadingBanner: React.FC<{ visible: boolean }> = React.memo(({ visible }) => {
    if (!visible) return null;

    return (
        <div className={`${css.banner} loading no-print`} role="status" data-test="loading-banner">
            <CircularLoader extrasmall />
            <span>{i18n.t("Loading...")}</span>
        </div>
    );
});
