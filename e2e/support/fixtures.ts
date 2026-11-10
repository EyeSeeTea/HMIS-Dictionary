import { test as base, expect } from "@playwright/test";
import * as fs from "fs";
import { Api } from "./api";
import { DiscoveredFixtures, Found } from "./discover";
import { fixturesFile } from "./env";
import {
    AdminPage,
    App,
    DataSetsPage,
    DossiersPage,
    IndicatorsPage,
    ProgramsPage,
    SearchPage,
} from "./pages";

type Fixtures = {
    api: Api;
    app: App;
    search: SearchPage;
    dossiers: DossiersPage;
    programs: ProgramsPage;
    dataSets: DataSetsPage;
    indicators: IndicatorsPage;
    admin: AdminPage;
    failOnPageError: void;
};

export const test = base.extend<Fixtures>({
    api: async ({}, use) => {
        const api = await Api.create();
        await use(api);
        await api.dispose();
    },
    app: async ({ page }, use) => use(new App(page)),
    search: async ({ page }, use) => use(new SearchPage(page)),
    dossiers: async ({ page }, use) => use(new DossiersPage(page)),
    programs: async ({ page }, use) => use(new ProgramsPage(page)),
    dataSets: async ({ page }, use) => use(new DataSetsPage(page)),
    indicators: async ({ page }, use) => use(new IndicatorsPage(page)),
    admin: async ({ page }, use) => use(new AdminPage(page)),
    failOnPageError: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on("pageerror", error => errors.push(error.message));
            await use();
            expect(errors, "Uncaught page errors").toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };

/** Tests that need the nested indicator skip on instances without one. */
export async function skipWithoutNestedIndicator(_api?: Api) {
    skipWithout("nestedIndicator", discovered.nestedIndicator);
}

/** Tests of the health service attribute skip on instances without the one chosen in Admin. */
export function skipWithoutHealthServiceAttribute() {
    skipWithout("healthServiceAttribute", discovered.healthServiceAttribute);
}

/** What the global setup found on the instance. Empty while Playwright lists the tests. */
function readDiscovered(): DiscoveredFixtures {
    try {
        return JSON.parse(fs.readFileSync(fixturesFile, "utf8"));
    } catch {
        return { dataSets: {}, programs: {} };
    }
}

const discovered = readDiscovered();

function isInTest(): boolean {
    try {
        test.info();
        return true;
    } catch {
        return false;
    }
}

/** Skips the running test when the instance has no such object. Outside a test, does nothing. */
function skipWithout(role: string, value: unknown): void {
    if (!value && isInTest()) test.skip(true, `No fixture "${role}" on this instance`);
}

/** The fixture found, or one whose properties skip the test that reads them. */
function found(role: string, value: Found | undefined): Found {
    if (value) return value;
    const skip = () => {
        skipWithout(role, undefined);
        return "";
    };
    return {
        get id() {
            return skip();
        },
        get name() {
            return skip();
        },
    };
}

function foundId(role: string, value: string | undefined): () => string {
    return () => {
        skipWithout(role, value);
        return value ?? "";
    };
}

/** Test objects, found on the instance for the scenario they cover (see discover.ts). */
export const fixtures = {
    get groupSet() {
        return foundId("groupSet", discovered.groupSet)();
    },
    service: found("service", discovered.service),
    dataSets: {
        small: found("dataSets.small", discovered.dataSets.small),
        noElements: found("dataSets.noElements", discovered.dataSets.noElements),
    },
    programs: {
        eventProgram: found("programs.event", discovered.programs.event),
        trackerProgram: found("programs.tracker", discovered.programs.tracker),
        repeatableProgram: found("programs.repeatable", discovered.programs.repeatable),
        noSectionsProgram: found("programs.noSections", discovered.programs.noSections),
        otherProgram: found("programs.other", discovered.programs.other),
        noDescriptionProgram: found("programs.noDescription", discovered.programs.noDescription),
        noProgramIndicatorsProgram: found(
            "programs.noProgramIndicators",
            discovered.programs.noProgramIndicators
        ),
        noIndicatorsProgram: found("programs.noIndicators", discovered.programs.noIndicators),
        noRulesProgram: found("programs.noRules", discovered.programs.noRules),
        noVariablesProgram: found("programs.noVariables", discovered.programs.noVariables),
        minimalProgram: found("programs.minimal", discovered.programs.minimal),
        manyResourcesProgram: found("programs.manyResources", discovered.programs.manyResources),
        indicatorsProgram: found("programs.withIndicators", discovered.programs.withIndicators),
    },
    nestedIndicator: found("nestedIndicator", discovered.nestedIndicator),
    get resourcesAttribute() {
        return foundId("resourcesAttribute", discovered.resourcesAttribute)();
    },
    get healthServiceAttribute() {
        return foundId("healthServiceAttribute", discovered.healthServiceAttribute)();
    },
    get allUsersGroup() {
        return foundId("allUsersGroup", discovered.allUsersGroup)();
    },
};
