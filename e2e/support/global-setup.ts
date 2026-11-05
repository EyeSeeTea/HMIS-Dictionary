import { request } from "@playwright/test";
import { authFile, env } from "./env";

export default async function globalSetup() {
    const context = await request.newContext({ baseURL: env.dhis2Url });
    const response = await context.post("/api/auth/login", {
        data: { username: env.username, password: env.password },
    });
    if (!response.ok()) throw new Error(`Login failed with status ${response.status()}`);
    await context.storageState({ path: authFile });
    await context.dispose();
}
