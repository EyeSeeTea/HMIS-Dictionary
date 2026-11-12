import React from "react";
import { useRouteMatch } from "react-router-dom";
import { HealthService } from "$/domain/entities/HealthService";
import { Id } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { useSectionLoading } from "$/webapp/hooks/useSectionLoading";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";
import { PrintButton } from "$/webapp/components/print-button/PrintButton";
import { ItemSelector } from "$/webapp/components/item-selector/ItemSelector";
import { LoadingBanner } from "$/webapp/components/loading-banner/LoadingBanner";
import { appRoutes } from "$/webapp/routes";
import { DossierReader } from "$/webapp/pages/dossiers/DossierReader";
import { DossierEditor } from "$/webapp/pages/dossiers/DossierEditor";
import { dossierTexts as t } from "$/webapp/pages/dossiers/dossierTexts";

/** The reader and the editor are the same page, so the selected service survives switching. */
export const DossiersPage: React.FC = React.memo(() => {
    const { compositionRoot, settings, currentUser } = useAppContext();
    const isEditor = Boolean(useRouteMatch({ path: appRoutes.dossiersEditor.path, exact: true }));
    const [selectedId, setSelectedId] = React.useState<Maybe<Id>>();
    const [counts, setCounts] = React.useState({ dataSets: 0, indicatorGroups: 0 });
    const [isContentLoading, setContentLoading] = React.useState(false);

    const list = useFuture(
        () => compositionRoot.dossiers.getHealthServices.execute(settings),
        [compositionRoot, settings]
    );
    const services: HealthService[] = React.useMemo(
        () => (list?.type === "success" ? list.data : []),
        [list]
    );
    const service = services.find(service => service.id === selectedId);

    const isLoading = useSectionLoading([list]) || isContentLoading;

    return (
        <>
            <div id="headerDossierPanel">
                <PageHeader
                    title={t.dos_Dossiers()}
                    actions={<PrintButton disabled={isLoading || !service} />}
                />

                <ItemSelector
                    label={t.dos_Select_a_service()}
                    items={services}
                    selectedId={selectedId}
                    onChange={id => {
                        setSelectedId(id);
                        setCounts({ dataSets: 0, indicatorGroups: 0 });
                    }}
                    counterText={`${t.dos_Number_of_Services()}: ${services.length}`}
                    loading={list?.type === "loading"}
                >
                    <span>{`${t.dos_Number_of_DataSets_in_Service()}: ${counts.dataSets}`}</span>
                    <span>{`${t.dos_Number_of_IndicatorGroups_in_Service()}: ${counts.indicatorGroups}`}</span>
                </ItemSelector>

                <LoadingBanner visible={isLoading} />
            </div>

            {service &&
                (isEditor ? (
                    <DossierEditor service={service} />
                ) : (
                    <DossierReader
                        service={service}
                        canEdit={settings.canManage(currentUser)}
                        onCounts={setCounts}
                        onLoadingChange={setContentLoading}
                    />
                ))}
        </>
    );
});
