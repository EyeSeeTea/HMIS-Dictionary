import { defineConfig } from "@playwright/test";
import { authFile } from "./support/env";

/**
 * The same specs run against the AngularJS app and the React app. Only E2E_BASE_URL changes.
 *
 * Read-only specs (*.read.e2e.ts) run in parallel. Write specs (*.write.e2e.ts) change the instance,
 * so they run afterwards, one at a time.
 */
export default defineConfig({
    testDir: "./specs",
    outputDir: "./test-results",
    globalSetup: "./support/global-setup.ts",
    timeout: 180_000,
    expect: { timeout: 45_000 },
    retries: 1,
    reporter: [
        ["list"],
        ["json", { outputFile: "./test-results/results.json" }],
        ["html", { outputFolder: "./playwright-report", open: "never" }],
    ],
    use: {
        storageState: authFile,
        viewport: { width: 1500, height: 1000 },
        locale: "en-GB",
        actionTimeout: 45_000,
        navigationTimeout: 120_000,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "read", testMatch: /.*\.read\.e2e\.ts/, fullyParallel: true },
        { name: "write", testMatch: /.*\.write\.e2e\.ts/, dependencies: ["read"], workers: 1 },
    ],
});
