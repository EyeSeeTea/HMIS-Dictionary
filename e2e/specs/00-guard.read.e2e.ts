import * as fs from "fs";
import * as path from "path";
import { expect, test } from "@playwright/test";

const dir = path.join(__dirname, "..");

function sources(folder: string): string[] {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(folder, entry.name);
        return entry.isDirectory() ? sources(full) : full.endsWith(".ts") ? [full] : [];
    });
}

test.describe("0. Infrastructure", () => {
    test("Add a guard that fails the suite on selectors or code that exist only in AngularJS (`ng-*`, `angular.`, `$scope`)", () => {
        const forbidden = /\bng-[a-z]+|\bangular\.|\$scope|\$digest/;
        const self = path.basename(__filename);
        // The widgets file wraps replaceable third-party widgets, and is the one allowed exception.
        const files = [
            ...sources(path.join(dir, "specs")),
            ...sources(path.join(dir, "support")),
        ].filter(file => ![self, "widgets.ts"].includes(path.basename(file)));
        const offenders = files.filter(file => forbidden.test(fs.readFileSync(file, "utf8")));
        expect(offenders).toEqual([]);
    });
});
