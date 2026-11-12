import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";
import { GetMetadataSignature } from "./SearchCachedRepository";

/** Goes up when the shape of what is kept in the browser changes. */
const cacheVersion = 1;

type D2Page = { pager?: { total?: number } } & Record<string, unknown>;

/**
 * The count and the last change of each resource: adding, changing and deleting are all noticed.
 * It also has the user and the metadata language, as they change what the server returns.
 */
export function getMetadataSignature(api: D2Api): GetMetadataSignature {
    const getUser = (): FutureData<string> =>
        apiToFuture(
            api.get<{ id: string; settings?: { keyDbLocale?: string } }>("/me", {
                fields: "id,settings[keyDbLocale]",
            })
        ).map(me => `${me.id}:${me.settings?.keyDbLocale ?? ""}`);

    const getResource = (resource: string): FutureData<string> =>
        apiToFuture(
            api.get<D2Page>(`/${resource}`, {
                fields: "lastUpdated",
                order: "lastUpdated:desc",
                pageSize: 1,
            })
        ).map(page => {
            const [latest] = (page[resource] ?? []) as { lastUpdated?: string }[];
            return `${resource}:${page.pager?.total ?? 0}:${latest?.lastUpdated ?? ""}`;
        });

    return resources =>
        Future.parallel([getUser(), ...resources.map(getResource)], {
            concurrency: 5,
        }).map(parts => [cacheVersion, ...parts].join("|"));
}
