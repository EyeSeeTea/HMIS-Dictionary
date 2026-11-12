import React from "react";
import { Button } from "@dhis2/ui";

export type ExportButtonProps = { label: string; onClick: () => void; disabled?: boolean };

/** Runs an Excel export over the data already on screen. Hidden on print. */
export const ExportButton: React.FC<ExportButtonProps> = React.memo(props => {
    const { label, onClick, disabled } = props;

    return (
        <span className="no-print">
            <Button small secondary disabled={disabled} onClick={onClick} dataTest="export-excel">
                {label}
            </Button>
        </span>
    );
});
