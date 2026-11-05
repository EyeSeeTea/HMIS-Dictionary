import React from "react";
import { Button } from "@dhis2/ui";
import { IconLaunch16 } from "@dhis2/ui-icons";
import { Indicator } from "$/domain/entities/Indicator";
import { ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";

export type VisualizationLinkProps = {
    source: Indicator | ProgramIndicator;
    /** A button (Search) or a link (the tables of Programs). */
    variant?: "button" | "link";
};

/** Creates (or updates) a pivot table for the indicator and opens it in the Data Visualizer. */
export const VisualizationLink: React.FC<VisualizationLinkProps> = React.memo(
    ({ source, variant = "button" }) => {
        const { compositionRoot, baseUrl } = useAppContext();
        const [saving, setSaving] = React.useState(false);

        const open = () => {
            setSaving(true);

            compositionRoot.visualizations.save.execute(source).run(
                id => {
                    setSaving(false);
                    window.open(`${baseUrl}/dhis-web-data-visualizer/index.html#/${id}`, "_blank");
                },
                error => {
                    setSaving(false);
                    console.error(error);
                }
            );
        };

        if (variant === "link") {
            return (
                <a
                    href="#view-table"
                    className="no-print"
                    aria-disabled={saving}
                    onClick={event => {
                        event.preventDefault();
                        if (!saving) open();
                    }}
                >
                    <span role="img" aria-label={i18n.t("View Table")}>
                        <IconLaunch16 />
                    </span>
                </a>
            );
        }

        return (
            <span className="no-print">
                <Button
                    small
                    secondary
                    disabled={saving}
                    icon={<IconLaunch16 />}
                    onClick={open}
                    title={i18n.t("View Table")}
                    dataTest="visualization-link"
                />
            </span>
        );
    }
);
