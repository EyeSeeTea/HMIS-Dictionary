import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";

const databaseName = "hmis-dictionary-cache";
const storeName = "entries";

export type CacheEntry = { signature: string; savedAt: number; value: unknown };

export interface MetadataCache {
    get(key: string): FutureData<Maybe<CacheEntry>>;
    set(key: string, entry: CacheEntry): FutureData<void>;
}

/** Without IndexedDB (or when it fails), everything is a miss: the app works, only slower. */
export class IndexedDbCache implements MetadataCache {
    get(key: string): FutureData<Maybe<CacheEntry>> {
        return this.run<Maybe<CacheEntry>>("readonly", store => store.get(key), undefined);
    }

    set(key: string, entry: CacheEntry): FutureData<void> {
        return this.run<unknown>("readwrite", store => store.put(entry, key), undefined).map(
            () => undefined
        );
    }

    private run<T>(
        mode: IDBTransactionMode,
        request: (store: IDBObjectStore) => IDBRequest,
        fallback: T
    ): FutureData<T> {
        return Future.fromComputation<Error, T>(resolve => {
            const finish = () => resolve(fallback);

            try {
                const opening = indexedDB.open(databaseName, 1);
                opening.onupgradeneeded = () => opening.result.createObjectStore(storeName);
                opening.onerror = finish;
                opening.onblocked = finish;
                opening.onsuccess = () => {
                    const database = opening.result;
                    const operation = request(
                        database.transaction(storeName, mode).objectStore(storeName)
                    );
                    operation.onerror = () => {
                        database.close();
                        finish();
                    };
                    operation.onsuccess = () => {
                        database.close();
                        resolve(operation.result as T);
                    };
                };
            } catch {
                finish();
            }

            return () => {};
        });
    }
}
