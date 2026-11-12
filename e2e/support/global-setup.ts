import { request } from "@playwright/test";
import * as fs from "fs";
import { Api } from "./api";
import { discoverFixtures } from "./discover";
import { authFile, env, fixturesFile } from "./env";
import { login } from "./login";

export default async function globalSetup() {
    const context = await request.newContext({ baseURL: env.dhis2Url });
    await login(context);
    await context.storageState({ path: authFile });
    await context.dispose();
    await saveFixtures();
}

/** Finds the objects the tests use on this instance, and lists the ones it has not. */
async function saveFixtures() {
    const api = await Api.create();
    try {
        const fixtures = await discoverFixtures(api);
        fs.writeFileSync(fixturesFile, JSON.stringify(fixtures, null, 2));
        console.log(`Fixtures (${fixturesFile}):\n${JSON.stringify(fixtures, null, 2)}`);
    } finally {
        await api.dispose();
    }
}
