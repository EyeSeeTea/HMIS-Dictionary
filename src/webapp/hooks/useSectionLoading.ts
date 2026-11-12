import { Loader } from "$/webapp/utils/Loader";

/**
 * A selection is loading while any section of the selected item is still loading.
 * Drives the print button and the loading banner.
 */
export function useSectionLoading(loaders: Array<Loader<unknown> | undefined>): boolean {
    return loaders.some(loader => loader?.type === "loading");
}

/**
 * Like `useSectionLoading`, but also while a piece has not started: the pieces that wait for
 * others are idle (`undefined`) between one finishing and the next starting. Only when something
 * is selected, because then every piece is going to load.
 */
export function isSelectionLoading(
    isSelected: boolean,
    loaders: Array<Loader<unknown> | undefined>
): boolean {
    if (!isSelected || loaders.some(loader => loader?.type === "error")) return false;
    return loaders.some(loader => loader === undefined || loader.type === "loading");
}
