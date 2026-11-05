import React from "react";
import i18n from "$/utils/i18n";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";

export const HomePage: React.FC = React.memo(() => {
    return <PageHeader title={i18n.t("Metadata Dictionary")} />;
});
