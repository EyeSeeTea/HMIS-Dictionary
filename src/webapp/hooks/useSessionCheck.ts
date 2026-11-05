import React from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "$/webapp/contexts/app-context";

/** Checks the session on every navigation and reloads the app (-> login page) if it expired. */
export function useSessionCheck(): void {
    const { compositionRoot } = useAppContext();
    const { pathname } = useLocation();

    React.useEffect(() => {
        return compositionRoot.app.checkSession.execute().run(
            isActive => {
                if (!isActive) window.location.reload();
            },
            () => {}
        );
    }, [compositionRoot, pathname]);
}
