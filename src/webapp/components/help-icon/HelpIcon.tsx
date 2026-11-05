import React from "react";
import { IconInfo16 } from "@dhis2/ui-icons";
import css from "./HelpIcon.module.css";

/** The text shows as the tooltip of the browser, on the icon. */
export const HelpIcon: React.FC<{ text: string }> = React.memo(({ text }) => {
    return (
        <span className={`${css.icon} no-print`} title={text} role="img" aria-label={text}>
            <IconInfo16 />
        </span>
    );
});
