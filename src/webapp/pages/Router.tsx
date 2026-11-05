import { HashRouter, Redirect, Route, Switch, useLocation } from "react-router-dom";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useSessionCheck } from "$/webapp/hooks/useSessionCheck";
import { appRoutes, AppRouteKey, isRouteAvailable } from "$/webapp/routes";
import { ErrorBoundary } from "$/webapp/components/error-boundary/ErrorBoundary";
import { AppLayout } from "$/webapp/components/app-layout/AppLayout";
import { DataSetsPage } from "$/webapp/pages/datasets/DataSetsPage";
import { IndicatorsPage } from "$/webapp/pages/indicators/IndicatorsPage";
import { SearchPage } from "$/webapp/pages/search/SearchPage";
import { ProgramsPage } from "$/webapp/pages/programs/ProgramsPage";
import { DossiersPage } from "$/webapp/pages/dossiers/DossiersPage";
import { AdminPage } from "$/webapp/pages/admin/AdminPage";

// TODO: create a typesafe custom router over react-router-dom with both matching and parsing of
// paths, query params and hash params, and with a single source of truth for all routes in the app.
export function Router() {
    return (
        <HashRouter>
            <AppLayout>
                <Routes />
            </AppLayout>
        </HashRouter>
    );
}

function Routes() {
    const { settings, currentUser } = useAppContext();
    const { pathname } = useLocation();
    useSessionCheck();

    // Pages that are hidden in the menu are also hidden when opened by URL. Several routes can
    // share a page (the dossier reader and editor), so the page keeps its state when switching.
    const guarded = (keys: AppRouteKey[], page: React.ReactElement) => (
        <Route
            exact
            path={keys.map(key => appRoutes[key].path)}
            render={({ location }) => {
                const key = keys.find(key => appRoutes[key].path === location.pathname) ?? keys[0];

                return key && isRouteAvailable(key, settings, currentUser) ? (
                    page
                ) : (
                    <Redirect to={appRoutes.search.path} />
                );
            }}
        />
    );

    return (
        <ErrorBoundary key={pathname.split("/")[1]}>
            <Switch>
                {guarded(["search"], <SearchPage />)}
                {guarded(["dossiers", "dossiersEditor"], <DossiersPage />)}
                {guarded(["programs"], <ProgramsPage />)}
                {guarded(["dataSets"], <DataSetsPage />)}
                {guarded(["indicators"], <IndicatorsPage />)}
                {guarded(["admin"], <AdminPage />)}

                <Redirect to={appRoutes.search.path} />
            </Switch>
        </ErrorBoundary>
    );
}
