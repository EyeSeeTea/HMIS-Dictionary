import { APIRequestContext } from "@playwright/test";
import { env } from "./env";

/**
 * Logs in the context, so it keeps the session cookie. DHIS2 2.41 and later have /api/auth/login.
 * 2.40 does not: its login form of the web commons sets the session.
 */
export async function login(context: APIRequestContext): Promise<void> {
    const response = await context.post(`${env.dhis2Url}/api/auth/login`, {
        data: { username: env.username, password: env.password },
        // 2.40 answers with a redirect to the login page, which would look like a success
        maxRedirects: 0,
    });
    if (response.status() === 200) return;

    const form = await context.post(`${env.dhis2Url}/dhis-web-commons-security/login.action`, {
        form: { j_username: env.username, j_password: env.password },
        maxRedirects: 0,
    });
    const hasSession = (await context.storageState()).cookies.some(
        cookie => cookie.name === "JSESSIONID"
    );
    if (!hasSession || form.status() >= 400) {
        throw new Error(`Login failed with status ${response.status()}`);
    }
}
