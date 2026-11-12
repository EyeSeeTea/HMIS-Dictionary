import { describe, expect, it } from "vitest";
import { createUser } from "./userFixtures";

describe("User", () => {
    const user = createUser({ userGroups: [{ id: "BwyMfDBLih9", name: "Admins" }] });

    it("belongsToAnyGroup checks by id", () => {
        expect(user.belongsToAnyGroup(["other", "BwyMfDBLih9"])).toBe(true);
        expect(user.belongsToAnyGroup(["other"])).toBe(false);
        expect(user.belongsToAnyGroup([])).toBe(false);
    });

    it("belongsToGroupNamed checks by name", () => {
        expect(user.belongsToGroupNamed("Admins")).toBe(true);
        expect(user.belongsToGroupNamed("Others")).toBe(false);
    });
});
