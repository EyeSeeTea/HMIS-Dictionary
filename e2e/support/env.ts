import * as path from "path";

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

const dhis2Url = (process.env.E2E_DHIS2_URL ?? "http://localhost:8098").replace(/\/$/, "");
const appKey = process.env.E2E_APP_KEY ?? "HMIS-Dictionary";

export const env = {
    dhis2Url,
    /** The app without the Global Shell. This is the only setting that differs between apps. */
    baseUrl: process.env.E2E_BASE_URL ?? `${dhis2Url}/api/apps/${appKey}/index.html?redirect=false`,
    /** The app inside the DHIS2 Global Shell. */
    shellUrl: process.env.E2E_SHELL_URL ?? `${dhis2Url}/apps/${appKey}`,
    get username() {
        return required("E2E_USERNAME");
    },
    get password() {
        return required("E2E_PASSWORD");
    },
};

export const authFile = path.join(__dirname, "..", ".auth", "user.json");
