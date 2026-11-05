import React from "react";
import { Button } from "@dhis2/ui";
import { IconSettings16 } from "@dhis2/ui-icons";
import { LayoutSettings, LayoutView } from "$/domain/entities/LayoutSettings";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { LayoutSettingsDialog } from "$/webapp/components/layout-settings/LayoutSettingsDialog";
import { Loader } from "$/webapp/utils/Loader";

export type LayoutSettingsButtonProps = {
    view: LayoutView;
    /** From `useLayoutPermissions`. */
    layout: Loader<LayoutSettings> | undefined;
};

/** The gear. Only for admins (`isAdmin`, not `canManage`). Applying reloads the app. */
export const LayoutSettingsButton: React.FC<LayoutSettingsButtonProps> = React.memo(props => {
    const { layout } = props;
    const { settings, currentUser } = useAppContext();
    const [open, setOpen] = React.useState(false);

    if (!settings.isAdmin(currentUser) || layout?.type !== "success") return null;

    return (
        <span className="no-print">
            <Button
                small
                icon={<IconSettings16 />}
                onClick={() => setOpen(true)}
                dataTest="layout-settings-button"
            >
                {i18n.t("Settings")}
            </Button>

            {open && (
                <LayoutSettingsDialog
                    settings={layout.data}
                    onClose={() => setOpen(false)}
                    onApplied={() => window.location.reload()}
                />
            )}
        </span>
    );
});
