import { describe, expect, it } from "vitest";
import { createSettings } from "./fixtures";
import { createUser } from "./userFixtures";

const admin = createUser({ userGroups: [{ id: "anotherId", name: "Admins" }] });
const noAdmin = createUser({ userGroups: [{ id: "adminGroupId", name: "Other name" }] });

describe("AppSettings", () => {
    const settings = createSettings();

    it("isAdmin matches the group by name, not by id", () => {
        expect(settings.isAdmin(admin)).toBe(true);
        expect(settings.isAdmin(noAdmin)).toBe(false);
    });

    it("canManage is also true when no admin group is configured", () => {
        const notConfigured = createSettings({ adminGroup: undefined });

        expect(settings.canManage(noAdmin)).toBe(false);
        expect(notConfigured.canManage(noAdmin)).toBe(true);
        expect(notConfigured.isAdmin(noAdmin)).toBe(false);
    });

    it("the dossiers tab depends on the group set, not on the config flag", () => {
        const flagOff = createSettings({ dossierConfigComplete: false });
        const noGroupSet = createSettings({ healthServiceGroupSet: undefined });

        expect(flagOff.showsDossiersTab()).toBe(true);
        expect(flagOff.showsHealthServiceColumns()).toBe(false);
        expect(noGroupSet.showsDossiersTab()).toBe(false);
        expect(noGroupSet.showsHealthServiceColumns()).toBe(true);
    });

    it("blacklisted indicators are hidden for everyone, not-in-use ones only for non-admins", () => {
        expect(settings.isIndicatorVisible(["blacklistedIg"], admin)).toBe(false);
        expect(settings.isIndicatorVisible(["notInUseIg"], admin)).toBe(true);
        expect(settings.isIndicatorVisible(["notInUseIg"], noAdmin)).toBe(false);
        expect(settings.isIndicatorVisible(["other"], noAdmin)).toBe(true);
    });

    it("not-in-use program indicators are only hidden for non-admins", () => {
        expect(settings.isProgramIndicatorVisible(["notInUsePig"], admin)).toBe(true);
        expect(settings.isProgramIndicatorVisible(["notInUsePig"], noAdmin)).toBe(false);
    });

    it("program data elements hide blacklisted ones always, and legacy ones unless asked", () => {
        expect(settings.isDataElementVisibleInProgram(["blacklistedDeg"], true)).toBe(false);
        expect(settings.isDataElementVisibleInProgram(["legacyDeg"], false)).toBe(false);
        expect(settings.isDataElementVisibleInProgram(["legacyDeg"], true)).toBe(true);
    });
});
