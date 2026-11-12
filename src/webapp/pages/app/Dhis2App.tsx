import React from "react";
import i18n from "@dhis2/d2-i18n";
import { Provider } from "@dhis2/app-runtime";
import { getD2Api } from "$/types/d2-api";
import { App } from "./App";
import { CompositionRoot, getWebappCompositionRoot } from "$/CompositionRoot";
import { Locale } from "$/domain/entities/Shared";
import { toSupportedLocale } from "$/webapp/utils/locale";

export function Dhis2App() {
    const [compositionRootRes, setCompositionRootRes] = React.useState<CompositionRootResult>({
        type: "loading",
    });

    React.useEffect(() => {
        getData()
            .then(setCompositionRootRes)
            .catch(err => {
                setCompositionRootRes({
                    type: "error",
                    error: { baseUrl: "", error: err as Error },
                });
            });
    }, []);

    switch (compositionRootRes.type) {
        case "loading":
            return <h3>Loading...</h3>;
        case "error": {
            const { baseUrl, error } = compositionRootRes.error;
            return (
                <div style={{ margin: 20 }}>
                    <h3>{error.message}</h3>
                    <a rel="noopener noreferrer" target="_blank" href={baseUrl}>
                        Login {baseUrl}
                    </a>
                </div>
            );
        }
        case "loaded": {
            const { baseUrl, compositionRoot, locale } = compositionRootRes.data;
            type ProviderProps = React.ComponentProps<typeof Provider>;
            const config: ProviderProps["config"] = { baseUrl, apiVersion: 30 };

            return (
                <Provider
                    config={config}
                    plugin={false}
                    parentAlertsAdd={() => {}}
                    showAlertsInPlugin={false}
                    userInfo={undefined}
                >
                    <App compositionRoot={compositionRoot} baseUrl={baseUrl} locale={locale} />
                </Provider>
            );
        }
    }
}

type Data = {
    compositionRoot: CompositionRoot;
    baseUrl: string;
    locale: Locale;
};

async function getData(): Promise<CompositionRootResult> {
    const baseUrl = await getBaseUrl();

    try {
        const auth = env["VITE_DHIS2_AUTH"];
        const [username = "", password = ""] = auth.split(":");
        const api = await getD2Api(
            auth ? { baseUrl: baseUrl, auth: { username, password } } : { baseUrl: baseUrl }
        );
        const compositionRoot = getWebappCompositionRoot(api);

        const userSettings = await api.get<{ keyUiLocale: string }>("/userSettings").getData();
        configI18n(userSettings);

        return {
            type: "loaded",
            data: { baseUrl, compositionRoot, locale: toSupportedLocale(userSettings.keyUiLocale) },
        };
    } catch (err) {
        // Without a session, DHIS2 answers with its login page instead of data. Opening a page that
        // needs one takes the browser there.
        if (!isDev && isNotLoggedIn(err)) window.location.assign(`${baseUrl}/api/me`);
        return { type: "error", error: { baseUrl, error: err as Error } };
    }
}

function isNotLoggedIn(error: unknown): boolean {
    const message = error instanceof Error ? error.message : "";
    // A redirect to the login page from another origin is a network error with no message
    return (
        message === "" || /401|403|unauthori|JSON|Unexpected token|Failed to fetch/i.test(message)
    );
}

const env = import.meta.env;
const isDev = env.DEV;

async function getBaseUrl() {
    if (isDev) {
        return "/dhis2"; // See vite.config.ts: defineConfig -> server.proxy
    } else {
        return getInjectedBaseUrl() || getBaseUrlFromManifest();
    }
}

// Get from manifest.webapp: activities.dhis.href
async function getBaseUrlFromManifest(): Promise<string> {
    const response = await fetch("manifest.webapp");
    const manifest = await response.json();
    const { href } = manifest.activities.dhis;

    if (!href || href === "*") {
        throw new Error("Base URL not found in manifest.webapp (see DHIS2-19708)");
    } else {
        return href;
    }
}

// Injected by backend (DHIS2 +41) in public.html meta tag "dhis2-base-url"
function getInjectedBaseUrl() {
    const baseUrl = document.querySelector('meta[name="dhis2-base-url"]')?.getAttribute("content");

    if (baseUrl && baseUrl !== "__DHIS2_BASE_URL__") {
        return baseUrl;
    } else {
        return null;
    }
}

const isLangRTL = (code: string) => {
    const langs = ["ar", "fa", "ur"];
    const prefixed = langs.map(c => `${c}-`);
    return langs.includes(code) || prefixed.filter(c => code && code.startsWith(c)).length > 0;
};

/** "pt_BR" is Portuguese, and a language with no translations is English. */
const configI18n = ({ keyUiLocale }: { keyUiLocale: string }) => {
    const locale = toSupportedLocale(keyUiLocale);
    i18n.changeLanguage(locale);
    document.documentElement.setAttribute("dir", isLangRTL(locale) ? "rtl" : "ltr");
};

type Result<Data, E> =
    | { type: "loading" }
    | { type: "loaded"; data: Data }
    | { type: "error"; error: E };

type CompositionRootResult = Result<Data, { baseUrl: string; error: Error }>;
