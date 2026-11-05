import React from "react";
import { FutureData } from "$/domain/entities/generic/Future";
import { Loader } from "$/webapp/utils/Loader";

/**
 * Runs a future when `deps` change, cancelling the previous run (the latest selection wins).
 * Pass `null` to stay idle, for example while nothing is selected.
 */
export function useFuture<Data>(
    getFuture: () => FutureData<Data> | null,
    deps: React.DependencyList
): Loader<Data> | undefined {
    const [loader, setLoader] = React.useState<Loader<Data>>();

    React.useEffect(() => {
        const future = getFuture();

        if (!future) {
            setLoader(undefined);
            return;
        }

        setLoader({ type: "loading" });

        return future.run(
            data => setLoader({ type: "success", data }),
            error => setLoader({ type: "error", error })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return loader;
}
