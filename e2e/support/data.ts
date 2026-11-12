import { Api } from "./api";

/** Queries that find real objects for a scenario, so tests do not depend on hardcoded ids. */

export async function config(api: Api) {
    const list = async (key: string): Promise<string[]> => (await api.getKey<string[]>(key)) ?? [];
    return {
        blacklistDEG: await list("blacklist_dataElementGroups"),
        blacklistDS: await list("blacklist_dataSets"),
        blacklistIG: await list("blacklist_indicatorGroups"),
        notInUseIG: await list("notInUse_indicatorGroups"),
        notInUsePIG: await list("notInUse_programIndicatorGroups"),
        legacyDEG: await list("legacy_dataElementGroups"),
        legacyOPG: await list("legacy_optionGroups"),
    };
}

export type Indicator = {
    id: string;
    name: string;
    displayName: string;
    numerator: string;
    denominator: string;
    indicatorGroups: { id: string; name: string }[];
};

export async function allIndicators(api: Api): Promise<Indicator[]> {
    return api.list("indicators", {
        fields: "id,name,displayName,numerator,denominator,indicatorGroups[id,name]",
    });
}

/** Indicators that Search and Indicators display: in no blacklisted group. */
export async function visibleIndicators(api: Api): Promise<Indicator[]> {
    const { blacklistIG } = await config(api);
    return (await allIndicators(api)).filter(
        i => !i.indicatorGroups.some(group => blacklistIG.includes(group.id))
    );
}

export function escapeRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The service code that links a service to data sets and indicator groups. */
export function serviceCode(code: string) {
    return code.split("_")[2]!;
}

export function hasServiceCode(values: { value: string }[], code: string) {
    const regex = new RegExp(`_${escapeRegex(code)}(_|$)`);
    return values.some(({ value }) => regex.test(value));
}

export async function services(api: Api, groupSet: string) {
    const { organisationUnitGroups } = await api.get(`organisationUnitGroupSets/${groupSet}`, {
        fields: "organisationUnitGroups[id,code,displayName]",
    });
    return organisationUnitGroups as { id: string; code: string; displayName: string }[];
}

export async function serviceContents(api: Api, code: string) {
    const c = serviceCode(code);
    const dataSets = await api.list<any>("dataSets", {
        fields: "id,displayName,sections[id,displayName,dataElements~size],attributeValues[value]",
    });
    const groups = await api.list<any>("indicatorGroups", {
        fields: "id,displayName,indicators~size,attributeValues[value]",
    });
    return {
        dataSets: dataSets.filter(d => hasServiceCode(d.attributeValues, c)),
        groups: groups.filter(g => hasServiceCode(g.attributeValues, c)),
    };
}
