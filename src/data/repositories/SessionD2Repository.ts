import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { SessionRepository } from "$/domain/repositories/SessionRepository";
import { D2Api } from "$/types/d2-api";

export class SessionD2Repository implements SessionRepository {
    constructor(private api: D2Api) {}

    /**
     * Inactive when the server answers something else, as a login page, or says there is no
     * session (401). A request that fails for other reasons says nothing about the session.
     */
    isActive(): FutureData<boolean> {
        return apiToFuture(
            // Raw, because the answer says it is JSON but it is the plain text "pong"
            this.api.request<Blob>({
                method: "get",
                url: "/system/ping",
                responseDataType: "raw",
                // Without a session, DHIS2 then answers 401 instead of redirecting to the login
                // page, a redirect the browser blocks when it goes from https to http (as on qa1)
                headers: { "X-Requested-With": "XMLHttpRequest" },
            })
        )
            .flatMap(blob => Future.fromComputation<Error, string>(readBlob(blob)))
            .map(response => response === "pong")
            .flatMapError(error => Future.success(!isUnauthorized(error)));
    }
}

function isUnauthorized(error: Error): boolean {
    const { response } = error as { response?: { status?: number } };
    return response?.status === 401 || response?.status === 403;
}

function readBlob(blob: Blob) {
    return (resolve: (text: string) => void, reject: (error: Error) => void) => {
        blob.text().then(resolve, reject);
        return () => {};
    };
}
