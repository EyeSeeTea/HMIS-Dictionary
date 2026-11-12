import React from "react";
import { LayoutPermissions, LayoutSettings, LayoutView } from "$/domain/entities/LayoutSettings";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { Loader } from "$/webapp/utils/Loader";

export type LayoutAccess = {
    loader: Loader<LayoutSettings> | undefined;
    /** Undefined until loaded: nothing is visible meanwhile. */
    permissions: LayoutPermissions | undefined;
    canSeeSection: (section: string) => boolean;
    canSeeColumn: (section: string, column: string) => boolean;
};

/** Who sees which sections and columns of a screen, for the current user. */
export function useLayoutPermissions(view: LayoutView): LayoutAccess {
    const { compositionRoot, currentUser, settings } = useAppContext();
    const loader = useFuture(
        () => compositionRoot.layout.get.execute(view, settings),
        [compositionRoot, view, settings]
    );

    const permissions = React.useMemo(
        () =>
            loader?.type === "success"
                ? loader.data.getPermissions({ user: currentUser, settings })
                : undefined,
        [loader, currentUser, settings]
    );

    return {
        loader,
        permissions,
        canSeeSection: section => permissions?.canSeeSection(section) ?? false,
        canSeeColumn: (section, column) => permissions?.canSeeColumn(section, column) ?? false,
    };
}
