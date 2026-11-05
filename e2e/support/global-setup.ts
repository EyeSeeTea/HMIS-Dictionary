import { request } from "@playwright/test";
import { authFile, env } from "./env";
import { login } from "./login";

export default async function globalSetup() {
    const context = await request.newContext({ baseURL: env.dhis2Url });
    await login(context);
    await context.storageState({ path: authFile });
    await context.dispose();
}
