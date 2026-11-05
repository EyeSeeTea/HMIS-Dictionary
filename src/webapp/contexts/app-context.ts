import React, { useContext } from "react";
import { CompositionRoot } from "$/CompositionRoot";
import { AppSettings } from "$/domain/entities/AppSettings";
import { Locale } from "$/domain/entities/Shared";
import { User } from "$/domain/entities/User";
import { assert } from "$/utils/assert";

export type AppContextState = {
    currentUser: User;
    settings: AppSettings;
    compositionRoot: CompositionRoot;
    /** Of the DHIS2 instance, to link to its other apps. */
    baseUrl: string;
    /** Language of the user's interface, one of the supported ones. */
    locale: Locale;
};

export const AppContext = React.createContext<AppContextState | null>(null);

export function useAppContext() {
    const context = useContext(AppContext);
    assert(context, "App context uninitialized");
    return context;
}
