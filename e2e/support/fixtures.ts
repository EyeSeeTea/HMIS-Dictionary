import { test as base, expect } from "@playwright/test";
import { Api } from "./api";
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

/** Test objects on 8098, chosen for the scenario they cover. */
export const fixtures = {
    groupSet: "g7k6NQmqJY2",
    service: { id: "xIz3n0VWiDl", name: "Outbreak Measles" },
    dataSets: {
        small: { id: "jn8nB25hA8v", name: "Meningitis: Age distribution" },
        noElements: { id: "rFIy2mYoFiu", name: "25-08-REAC-Zamfara (OCV)" },
    },
    programs: {
        ambulances: { id: "LlBkgJO9WCv", name: "Ambulances Line list" },
        mentalGroup: { id: "NQF5RvfjwaX", name: "Mental Health - Group" },
        eCare: { id: "vYRMQ43Zl3Y", name: "eCare Pilot Project" },
        boat: { id: "Rs4W7I3twdy", name: "BOAT Medical Linelist" },
        snakebites: { id: "xco6LmHlftL", name: "Snakebites v2" },
    },
    nestedIndicator: { id: "rPAOXzG3811" },
    blacklistedAndNotInUseGroup: "ttzCFjzBTDS",
    resourcesAttribute: "Q5alUdMbT9g",
};
