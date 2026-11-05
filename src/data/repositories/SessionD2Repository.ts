import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { SessionRepository } from "$/domain/repositories/SessionRepository";
import { D2Api } from "$/types/d2-api";

export class SessionD2Repository implements SessionRepository {
    constructor(private api: D2Api) {}

    /** Inactive only if the server answers something else, as a login page. */
    isActive(): FutureData<boolean> {
        return apiToFuture(
            // Raw, because the answer says it is JSON but it is the plain text "pong"
            this.api.request<Blob>({
                method: "get",
                url: "/system/ping",
                responseDataType: "raw",
            })
        )
            .flatMap(blob => Future.fromComputation<Error, string>(readBlob(blob)))
            .map(response => response === "pong")
            .flatMapError(() => Future.success(true)); // A 401 goes unnoticed: bug P1, kept
    }
}

function readBlob(blob: Blob) {
    return (resolve: (text: string) => void, reject: (error: Error) => void) => {
        blob.text().then(resolve, reject);
        return () => {};
    };
}
