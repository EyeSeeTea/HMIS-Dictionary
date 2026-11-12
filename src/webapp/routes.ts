import { AppSettings } from "$/domain/entities/AppSettings";
import { User } from "$/domain/entities/User";
import i18n from "$/utils/i18n";

export type AppRouteKey =
    | "search"
    | "dossiers"
    | "dossiersEditor"
    | "programs"
    | "dataSets"
    | "indicators"
    | "admin";

type AppRoute = { key: AppRouteKey; path: string; label: () => string; isAvailable: Availability };

type Availability = (settings: AppSettings, user: User) => boolean;

const always: Availability = () => true;
const dossiersTab: Availability = settings => settings.showsDossiersTab();
const canManage: Availability = (settings, user) => settings.canManage(user);

/** Single source of truth for paths. They are the same hash routes as the Angular app. */
export const appRoutes: Record<AppRouteKey, AppRoute> = {
    search: { key: "search", path: "/search", label: () => i18n.t("Search"), isAvailable: always },
    dossiers: {
        key: "dossiers",
        path: "/dossiers",
        label: () => i18n.t("Dossiers"),
        isAvailable: dossiersTab,
    },
    dossiersEditor: {
        key: "dossiersEditor",
        path: "/dossiers/editor",
        label: () => i18n.t("Dossier editor"),
        isAvailable: (settings, user) => dossiersTab(settings, user) && canManage(settings, user),
    },
    programs: {
        key: "programs",
        path: "/dossierPrograms",
        label: () => i18n.t("Programs"),
        isAvailable: always,
    },
    dataSets: {
        key: "dataSets",
        path: "/datasets",
        label: () => i18n.t("Data Sets"),
        isAvailable: always,
    },
    indicators: {
        key: "indicators",
        path: "/dossierIndicators",
        label: () => i18n.t("Indicators"),
        isAvailable: always,
    },
    admin: { key: "admin", path: "/admin", label: () => i18n.t("Admin"), isAvailable: canManage },
};

/** Entries of the side menu, in order. The editor is reached from the reader, not from the menu. */
export const menuRouteKeys: AppRouteKey[] = [
    "search",
    "dossiers",
    "programs",
    "dataSets",
    "indicators",
    "admin",
];

export function isRouteAvailable(key: AppRouteKey, settings: AppSettings, user: User): boolean {
    return appRoutes[key].isAvailable(settings, user);
}
