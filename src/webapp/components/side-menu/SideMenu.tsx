import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "$/webapp/contexts/app-context";
import { appRoutes, AppRouteKey, isRouteAvailable, menuRouteKeys } from "$/webapp/routes";
import css from "./SideMenu.module.css";

/** Ids of the menu items, the same as the Angular tabs: the e2e suite finds them by these. */
const tabIds: Record<AppRouteKey, string> = {
    search: "search",
    dossiers: "dossiers",
    dossiersEditor: "dossiers",
    programs: "dossierPrograms",
    dataSets: "datasets",
    indicators: "dossierIndicators",
    admin: "admin",
};

export const SideMenu: React.FC = React.memo(() => {
    const { settings, currentUser } = useAppContext();
    const { pathname } = useLocation();

    const items = menuRouteKeys
        .filter(key => isRouteAvailable(key, settings, currentUser))
        .map(key => appRoutes[key]);

    return (
        <nav className={`${css.menu} no-print`} aria-label="main">
            <ul id="menu-container" role="tablist">
                {items.map(route => {
                    const active = isActive(pathname, route.path);

                    return (
                        <li
                            key={route.key}
                            id={tabIds[route.key]}
                            role="presentation"
                            className={active ? `${css.item} ${css.active} active` : css.item}
                        >
                            <NavLink to={route.path} data-test={`menu-${route.key}`}>
                                {route.label()}
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
});

// The dossier editor (/dossiers/editor) keeps the Dossiers item active.
function isActive(pathname: string, path: string): boolean {
    return pathname === path || pathname.startsWith(`${path}/`);
}
