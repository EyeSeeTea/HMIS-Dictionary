import { ReactNode } from "react";
import { render, RenderResult } from "@testing-library/react";
import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { createUser } from "$/domain/entities/__tests__/userFixtures";
import { createSettings } from "$/domain/entities/__tests__/fixtures";
import { AppContext, AppContextState } from "$/webapp/contexts/app-context";

export function getTestContext(overrides: Partial<AppContextState> = {}): AppContextState {
    return {
        currentUser: createUser(),
        settings: createSettings(),
        compositionRoot: getTestCompositionRoot(),
        baseUrl: "http://dhis2.test",
        locale: "en",
        ...overrides,
    };
}

export function getReactComponent(
    children: ReactNode,
    overrides: Partial<AppContextState> = {}
): RenderResult {
    const context = getTestContext(overrides);

    return render(
        <AppContext.Provider value={context}>
            <SnackbarProvider>{children}</SnackbarProvider>
        </AppContext.Provider>
    );
}
