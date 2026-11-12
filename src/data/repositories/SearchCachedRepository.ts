import { MetadataCache } from "$/data/IndexedDbCache";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import {
    SearchDataElementSource,
    SearchIndicatorSource,
    SearchProgramIndicatorSource,
    SearchProgramSource,
} from "$/domain/entities/SearchCatalog";
import { SearchRepository } from "$/domain/repositories/SearchRepository";

/** Whatever changes when the metadata changes: for example, counts and last updated dates. */
export type GetMetadataSignature = (resources: string[]) => FutureData<string>;

/** An entry is not trusted for longer than this, as not every change alters the signature. */
const maxAgeInMs = 24 * 60 * 60 * 1000;

/**
 * Keeps the sources of Search in the browser, as loading them takes a while. Each entry is valid
 * while the signature of the metadata it was built from is the same. A failure in the signature or
 * in the cache only means loading from the server.
 */
export class SearchCachedRepository implements SearchRepository {
    constructor(
        private repository: SearchRepository,
        private getSignature: GetMetadataSignature,
        private cache: MetadataCache,
        private now: () => number = Date.now
    ) {}

    getDataElements(): FutureData<SearchDataElementSource[]> {
        // Versioned key: the entries cached before have no attribute values
        return this.cached(
            "dataElements.v2",
            ["dataElements", "dataElementGroups", "dataSets"],
            () => this.repository.getDataElements()
        );
    }

    getPrograms(): FutureData<SearchProgramSource[]> {
        return this.cached("programs", ["programs", "programStages"], () =>
            this.repository.getPrograms()
        );
    }

    getCategoryOptionCombos(): FutureData<NamedRef[]> {
        return this.cached("categoryOptionCombos", ["categoryOptionCombos"], () =>
            this.repository.getCategoryOptionCombos()
        );
    }

    getDataElementGroups(): FutureData<(NamedRef & { description: string })[]> {
        return this.cached("dataElementGroups", ["dataElementGroups"], () =>
            this.repository.getDataElementGroups()
        );
    }

    getCategoryOptions(): FutureData<NamedRef[]> {
        return this.cached("categoryOptions", ["categoryOptions"], () =>
            this.repository.getCategoryOptions()
        );
    }

    getProgramIndicators(): FutureData<SearchProgramIndicatorSource[]> {
        return this.cached(
            "programIndicators",
            ["programIndicators", "programIndicatorGroups", "programs"],
            () => this.repository.getProgramIndicators()
        );
    }

    getIndicators(): FutureData<SearchIndicatorSource[]> {
        return this.cached("indicators", ["indicators", "indicatorGroups", "indicatorTypes"], () =>
            this.repository.getIndicators()
        );
    }

    private cached<T>(key: string, resources: string[], load: () => FutureData<T>): FutureData<T> {
        return this.getSignature(resources)
            .map<string | undefined>(signature => signature)
            .flatMapError(() => Future.success<Error, string | undefined>(undefined))
            .flatMap((signature): FutureData<T> => {
                if (signature === undefined) return load();

                return this.cache.get(key).flatMap(entry => {
                    const isValid =
                        entry?.signature === signature && this.now() - entry.savedAt < maxAgeInMs;
                    if (isValid) return Future.success(entry.value as T);

                    return load().flatMap(value =>
                        this.cache
                            .set(key, { signature, savedAt: this.now(), value })
                            .map(() => value)
                    );
                });
            });
    }
}
