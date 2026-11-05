import { D2Api as D2Api40 } from "@eyeseetea/d2-api/2.40";
import { D2Api as D2Api42 } from "@eyeseetea/d2-api/2.42";
import { getMockApiFromClass } from "@eyeseetea/d2-api";

export type { MetadataPick } from "@eyeseetea/d2-api/2.42";
export { CancelableResponse, isCancel } from "@eyeseetea/d2-api";

/**
 * The only place that knows about d2-api versions. The rest of the data layer is typed against
 * this one, and only uses what both versions have.
 */
export type D2Api = D2Api42;

type D2ApiOptions = ConstructorParameters<typeof D2Api42>[0];

export async function getD2Api(options: D2ApiOptions): Promise<D2Api> {
    const api = new D2Api42(options);
    const { version } = await api.get<{ version: string }>("/system/info").getData();

    return isVersion40(version) ? (new D2Api40(options) as unknown as D2Api) : api;
}

function isVersion40(version: string): boolean {
    return version.startsWith("2.40") || version.startsWith("40");
}

export const getMockApi = getMockApiFromClass(D2Api42);
