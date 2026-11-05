import React, { useEffect, useState } from "react";
import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { Feedback } from "@eyeseetea/feedback-component";
import { appConfig } from "$/app-config";
import { CompositionRoot } from "$/CompositionRoot";
import { Share } from "$/webapp/components/share/Share";
import { Future } from "$/domain/entities/generic/Future";
import { Locale } from "$/domain/entities/Shared";
import { AppContext, AppContextState } from "$/webapp/contexts/app-context";
import { Router } from "$/webapp/pages/Router";
import "./App.css";
import { HeaderBar } from "$/webapp/pages/app/header-bar/HeaderBar";

type AppProps = {
    compositionRoot: CompositionRoot;
    baseUrl: string;
    locale: Locale;
};

function App_(props: AppProps) {
    const { compositionRoot, baseUrl, locale } = props;
    const [showShareButton, setShowShareButton] = useState(false);
    const [loading, setLoading] = useState(true);
    const [appContext, setAppContext] = useState<AppContextState | null>(null);
    const [error, setError] = useState<Error>();

    useEffect(() => {
        setShowShareButton(appConfig.appearance.showShareButton);

        return Future.joinObj({
            currentUser: compositionRoot.users.getCurrent.execute(),
            settings: compositionRoot.app.getSettings.execute(),
        }).run(
            ({ currentUser, settings }) => {
                setAppContext({ currentUser, settings, compositionRoot, baseUrl, locale });
                setLoading(false);
            },
            error => {
                setError(error);
                setLoading(false);
            }
        );
    }, [compositionRoot, baseUrl, locale]);

    if (loading) return null;
    if (error || !appContext) throw error ?? new Error("App context not loaded");

    return (
        <SnackbarProvider>
            <HeaderBar appName="Metadata Dictionary" />

            {appConfig.feedback && (
                <Feedback options={appConfig.feedback} username={appContext.currentUser.username} />
            )}

            <div id="app" className="content">
                <AppContext.Provider value={appContext}>
                    <Router />
                </AppContext.Provider>
            </div>

            <Share visible={showShareButton} />
        </SnackbarProvider>
    );
}

export const App = React.memo(App_);
