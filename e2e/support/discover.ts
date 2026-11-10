import { defaultMetadataIds } from "../../src/domain/entities/MetadataIds";
import { Api } from "./api";
import { hasServiceCode, serviceCode } from "./data";

export type Found = { id: string; name: string };

/**
 * The objects the tests use, found on the instance by what each scenario needs, so the same suite
 * runs on any instance (MSF, OCA, the seed). A missing one skips the tests that use it.
 */
export type DiscoveredFixtures = {
    /** The group set of health services configured in Admin. */
    groupSet?: string;
    /** A health service with data sets and indicator groups. */
    service?: Found;
    dataSets: {
        /** Sections, all of them with data elements, and the fewest elements. */
        small?: Found;
        /** A section with no data elements. */
        noElements?: Found;
    };
    programs: {
        /** Event program with description, sections, program indicators, rules, event resources and org units. */
        event?: Found;
        /** Tracker program with attributes, sections, program indicators and rules. */
        tracker?: Found;
        /** First stage repeatable, with sections. */
        repeatable?: Found;
        /** First stage without sections, but with data elements. */
        noSections?: Found;
        /** Another program with event resources, the fewer rules and program indicators the better. */
        other?: Found;
        /** One without each thing, for the tests of the blocks that are not shown. */
        noDescription?: Found;
        noProgramIndicators?: Found;
        noIndicators?: Found;
        noRules?: Found;
        noVariables?: Found;
        /** No rules, variables nor related indicators. */
        minimal?: Found;
        /** Enough event resources for the list to scroll, the fewest above that. */
        manyResources?: Found;
        /** Referenced by indicators through D{}, A{} or I{}. */
        withIndicators?: Found;
    };
    /** An indicator with N{} in its numerator. */
    nestedIndicator?: Found;
    /** The attribute of programs with their resources, chosen in Admin. */
    resourcesAttribute?: string;
    /** The attribute of health service codes, chosen in Admin, on data sets and indicator groups. */
    healthServiceAttribute?: string;
    /** The user group to share the indicator tables with, chosen in Admin. */
    allUsersGroup?: string;
};

type Program = {
    id: string;
    name: string;
    eventProgram: boolean;
    description: string;
    orgUnits: number;
    canReadData: boolean;
    attributes: number;
    firstStage?: { repeatable: boolean; sections: number; dataElements: number };
    programIndicators: number;
    hashExpressions: number;
    rules: number;
    variables: number;
    eventResources: number;
    relatedIndicators: number;
};

type Rule<T> = (item: T) => boolean;

/** The first that meets every requirement, preferring the ones that meet more preferences. */
function pick<T extends Found>(items: T[], required: Rule<T>[], preferred: Rule<T>[] = []) {
    const score = (item: T) => preferred.filter(rule => rule(item)).length;
    // Stable sort: on a tie, the order given (by name, unless the caller sorts otherwise)
    const candidate = items
        .filter(item => required.every(rule => rule(item)))
        .sort((a, b) => score(b) - score(a))[0];
    return candidate ? { id: candidate.id, name: candidate.name } : undefined;
}

function byName<T extends { displayName: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function countBy(items: { program?: { id: string } }[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const { program } of items) {
        if (program) counts.set(program.id, (counts.get(program.id) ?? 0) + 1);
    }
    return counts;
}

async function getKey<T>(api: Api, key: string): Promise<T | undefined> {
    return api.getKey<T>(key).catch(() => undefined);
}

async function listOrEmpty<T>(api: Api, resource: string, params: Record<string, string>) {
    return api.list<T>(resource, params).catch(() => [] as T[]);
}

export async function discoverFixtures(api: Api): Promise<DiscoveredFixtures> {
    const blacklistPrograms = (await getKey<string[]>(api, "blacklist_programs")) ?? [];
    const blacklistDataSets = (await getKey<string[]>(api, "blacklist_dataSets")) ?? [];
    const groupSet = (await getKey<{ value?: string }>(api, "setup_organisationUnitGroupSet"))
        ?.value;

    return {
        groupSet,
        service: groupSet ? await discoverService(api, groupSet) : undefined,
        dataSets: await discoverDataSets(api, blacklistDataSets),
        programs: await discoverPrograms(api, blacklistPrograms),
        nestedIndicator: await discoverNestedIndicator(api),
        resourcesAttribute: await discoverAttribute(api, "programResourcesAttribute", a =>
            Boolean(a.programAttribute)
        ),
        healthServiceAttribute: await discoverAttribute(api, "healthServiceAttribute", a =>
            Boolean(a.dataSetAttribute && a.indicatorGroupAttribute)
        ),
        allUsersGroup: await discoverAllUsersGroup(api),
    };
}

async function discoverService(api: Api, groupSet: string): Promise<Found | undefined> {
    const set = await api
        .get(`organisationUnitGroupSets/${groupSet}`, {
            fields: "organisationUnitGroups[id,code,displayName]",
        })
        .catch(() => undefined);
    const dataSets = await api.list<any>("dataSets", { fields: "attributeValues[value]" });
    const groups = await api.list<any>("indicatorGroups", { fields: "attributeValues[value]" });
    const services = [...(set?.organisationUnitGroups ?? [])]
        .filter((group: any) => group.code)
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

    const service = services.find((group: any) => {
        const code = serviceCode(group.code);
        return (
            code &&
            dataSets.some(d => hasServiceCode(d.attributeValues, code)) &&
            groups.some(g => hasServiceCode(g.attributeValues, code))
        );
    });
    return service ? { id: service.id, name: service.displayName } : undefined;
}

async function discoverDataSets(api: Api, blacklist: string[]) {
    const all = await api.list<any>("dataSets", {
        fields: "id,displayName,dataSetElements~size,sections[dataElements~size]",
    });
    const dataSets = byName(all).map(d => ({
        id: d.id as string,
        name: d.displayName as string,
        elements: d.dataSetElements as number,
        sections: (d.sections as { dataElements: number }[]).map(s => s.dataElements),
    }));
    const listed = dataSets.filter(d => !blacklist.includes(d.id));
    const fewestElements = [...listed].sort((a, b) => a.elements - b.elements);

    return {
        small: pick(fewestElements, [
            d => d.sections.length > 0,
            d => d.sections.every(elements => elements > 0),
        ]),
        // Its test lists every data set, the blacklisted ones too
        noElements: pick(dataSets, [d => d.sections.some(elements => elements === 0)]),
    };
}

async function discoverPrograms(api: Api, blacklist: string[]) {
    const all = await api.list<any>("programs", {
        fields: [
            "id,displayName,programType,displayDescription,organisationUnits~size,access[data[read]]",
            "programTrackedEntityAttributes~size",
            "programStages[sortOrder,repeatable,programStageSections~size,programStageDataElements~size]",
        ].join(","),
    });
    const programIndicators = await api.list<any>("programIndicators", {
        fields: "id,expression,program[id]",
    });
    const rules = countBy(await api.list<any>("programRules", { fields: "program[id]" }));
    const variables = countBy(
        await api.list<any>("programRuleVariables", { fields: "program[id]" })
    );
    const eventResources = countBy([
        ...(await listOrEmpty<any>(api, "eventCharts", { fields: "program[id]" })),
        ...(await listOrEmpty<any>(api, "eventReports", { fields: "program[id]" })),
    ]);
    const indicators = await api.list<any>("indicators", { fields: "numerator,denominator" });

    const programOfIndicator = new Map(programIndicators.map(pi => [pi.id, pi.program?.id]));
    const related = new Map<string, number>();
    for (const indicator of indicators) {
        const formula = `${indicator.numerator} ${indicator.denominator}`;
        const ids = new Set<string>();
        for (const [, id] of formula.matchAll(/[DA]\{(\w{11})\.\w{11}\}/g)) ids.add(id!);
        for (const [, id] of formula.matchAll(/I\{(\w{11})\}/g)) {
            const programId = programOfIndicator.get(id!);
            if (programId) ids.add(programId);
        }
        for (const id of ids) related.set(id, (related.get(id) ?? 0) + 1);
    }

    const programs: Program[] = byName(all)
        .filter(p => !blacklist.includes(p.id) && !p.displayName.startsWith("~"))
        .map(p => {
            const stage = [...p.programStages].sort((a, b) => a.sortOrder - b.sortOrder)[0];
            const own = programIndicators.filter(pi => pi.program?.id === p.id);
            return {
                id: p.id,
                name: p.displayName,
                eventProgram: p.programType === "WITHOUT_REGISTRATION",
                description: p.displayDescription ?? "",
                orgUnits: p.organisationUnits,
                canReadData: p.access?.data?.read ?? true,
                attributes: p.programTrackedEntityAttributes,
                firstStage: stage && {
                    repeatable: Boolean(stage.repeatable),
                    sections: stage.programStageSections,
                    dataElements: stage.programStageDataElements,
                },
                programIndicators: own.length,
                hashExpressions: own.filter(pi => /#\{/.test(pi.expression ?? "")).length,
                rules: rules.get(p.id) ?? 0,
                variables: variables.get(p.id) ?? 0,
                eventResources: eventResources.get(p.id) ?? 0,
                relatedIndicators: related.get(p.id) ?? 0,
            };
        });

    const event = pick(
        programs,
        [
            p => p.eventProgram,
            p => p.description !== "",
            p => (p.firstStage?.sections ?? 0) > 0,
            p => p.programIndicators > 0,
            p => p.rules > 0,
            p => p.eventResources > 0,
            p => p.orgUnits > 0,
            p => p.canReadData,
        ],
        [p => /<\w/.test(p.description), p => p.hashExpressions > 0, p => p.variables > 0]
    );
    const tracker = pick(
        programs,
        [
            p => !p.eventProgram,
            p => p.attributes > 0,
            p => (p.firstStage?.sections ?? 0) > 0,
            p => p.programIndicators > 0,
            p => p.rules > 0,
        ],
        [p => p.description !== "", p => Boolean(p.firstStage?.repeatable)]
    );
    const repeatable = pick(
        programs,
        [p => Boolean(p.firstStage?.repeatable), p => (p.firstStage?.sections ?? 0) > 0],
        [p => p.id === tracker?.id]
    );
    const noSections = pick(
        programs,
        [p => p.firstStage?.sections === 0, p => (p.firstStage?.dataElements ?? 0) > 0],
        [p => p.eventProgram]
    );
    const lightest = [...programs].sort(
        (a, b) => a.rules + a.programIndicators - (b.rules + b.programIndicators)
    );
    const other = pick(
        lightest,
        [p => p.id !== event?.id, p => p.eventResources > 0, p => p.firstStage !== undefined],
        [p => p.eventProgram, p => p.orgUnits > 0]
    );
    const hasStage = (p: Program) => (p.firstStage?.dataElements ?? 0) > 0;
    const without = (rule: Rule<Program>) => pick(programs, [hasStage, rule]);
    const fewestResources = [...programs].sort((a, b) => a.eventResources - b.eventResources);
    const manyResources = pick(fewestResources, [p => p.eventResources >= 30]);
    const withIndicators = pick(
        programs,
        [p => p.relatedIndicators > 0],
        [p => p.id !== tracker?.id, p => p.eventProgram]
    );

    return {
        event,
        tracker,
        repeatable,
        noSections,
        other,
        noDescription: without(p => p.description === ""),
        noProgramIndicators: without(p => p.programIndicators === 0),
        noIndicators: without(p => p.relatedIndicators === 0),
        noRules: without(p => p.rules === 0),
        noVariables: without(p => p.variables === 0),
        minimal: without(p => p.rules === 0 && p.variables === 0 && p.relatedIndicators === 0),
        manyResources,
        withIndicators,
    };
}

async function discoverNestedIndicator(api: Api): Promise<Found | undefined> {
    const indicators = await api.list<any>("indicators", {
        fields: "id,displayName,numerator,indicatorGroups~size",
        filter: "numerator:like:N{",
    });
    return pick(
        byName(indicators).map(i => ({ ...i, name: i.displayName })),
        [i => /N\{\w{11}\}/.test(i.numerator)],
        [i => i.indicatorGroups > 0]
    );
}

/** The attribute chosen in Admin (or the app default), if the instance has it and it applies. */
async function discoverAttribute(
    api: Api,
    key: keyof typeof defaultMetadataIds,
    applies: (attribute: Record<string, unknown>) => boolean
): Promise<string | undefined> {
    const saved = await getKey<{ value?: string }>(api, `metadata_${key}`);
    const id = saved?.value || defaultMetadataIds[key];
    const attribute = await api
        .get(`attributes/${id}`, {
            fields: "id,programAttribute,dataSetAttribute,indicatorGroupAttribute",
        })
        .catch(() => undefined);
    return attribute && applies(attribute) ? id : undefined;
}

async function discoverAllUsersGroup(api: Api): Promise<string | undefined> {
    const saved = await getKey<{ value?: string }>(api, "metadata_allUsersGroup");
    const id = saved?.value || defaultMetadataIds.allUsersGroup;
    const group = await api.get(`userGroups/${id}`, { fields: "id" }).catch(() => undefined);
    return group ? id : undefined;
}
