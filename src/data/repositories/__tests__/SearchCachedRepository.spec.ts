import { describe, expect, it, vi } from "vitest";
import { CacheEntry, MetadataCache } from "$/data/IndexedDbCache";
import { SearchCachedRepository } from "$/data/repositories/SearchCachedRepository";
import { getTestRepositories } from "$/data/repositories/testRepositories";
import { Future } from "$/domain/entities/generic/Future";

const success = <T>(value: T) => Future.success<Error, T>(value);
const day = 24 * 60 * 60 * 1000;

function setup() {
    const entries = new Map<string, CacheEntry>();
    const cache: MetadataCache = {
        get: key => success(entries.get(key)),
        set: (key, entry) => {
            entries.set(key, entry);
            return success(undefined);
        },
    };
    const getCategoryOptions = vi.fn(() => success([{ id: "co", name: "Option" }]));
    const inner = { ...getTestRepositories().searchRepository, getCategoryOptions };
    const state = { signature: "s1", now: 1000 };
    const repository = new SearchCachedRepository(
        inner,
        () => success(state.signature),
        cache,
        () => state.now
    );

    return { repository, getCategoryOptions, state };
}

describe("SearchCachedRepository", () => {
    it("loads from the server once, while the signature is the same", async () => {
        const { repository, getCategoryOptions } = setup();

        const first = await repository.getCategoryOptions().toPromise();
        const second = await repository.getCategoryOptions().toPromise();

        expect(second).toEqual(first);
        expect(getCategoryOptions).toHaveBeenCalledTimes(1);
    });

    it("loads again when the signature changes", async () => {
        const { repository, getCategoryOptions, state } = setup();

        await repository.getCategoryOptions().toPromise();
        state.signature = "s2";
        await repository.getCategoryOptions().toPromise();

        expect(getCategoryOptions).toHaveBeenCalledTimes(2);
    });

    it("loads again when the entry is too old", async () => {
        const { repository, getCategoryOptions, state } = setup();

        await repository.getCategoryOptions().toPromise();
        state.now += day + 1;
        await repository.getCategoryOptions().toPromise();

        expect(getCategoryOptions).toHaveBeenCalledTimes(2);
    });

    it("loads from the server when the signature fails", async () => {
        const getCategoryOptions = vi.fn(() => success([]));
        const repository = new SearchCachedRepository(
            { ...getTestRepositories().searchRepository, getCategoryOptions },
            () => Future.error(new Error("No signature")),
            { get: () => success(undefined), set: () => success(undefined) }
        );

        await repository.getCategoryOptions().toPromise();
        await repository.getCategoryOptions().toPromise();

        expect(getCategoryOptions).toHaveBeenCalledTimes(2);
    });
});
