import React from "react";
import { Button } from "@dhis2/ui";
import i18n from "$/utils/i18n";

export const PrintButton: React.FC<{ disabled: boolean }> = React.memo(({ disabled }) => {
    return (
        <Button
            small
            className="printButton no-print"
            disabled={disabled}
            onClick={() => window.print()}
            dataTest="print-button"
        >
            {i18n.t("Print")}
        </Button>
    );
});
