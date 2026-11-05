import { describe, expect, it } from "vitest";
import { assertValue } from "$/utils/assert";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import { createSettings } from "./fixtures";
import { createUser } from "./userFixtures";

const advanced = createUser({ userGroups: [{ id: "LjRqO9XzQPs", name: "Advanced" }] });
const admin = createUser({ userGroups: [{ id: "x", name: "Admins" }] });
const plain = createUser();

describe("LayoutSettings", () => {
    const settings = createSettings();
    const programs = LayoutSettings.defaults("programs");

    it("has the sections of each screen", () => {
        expect(LayoutSettings.defaults("search").sections.map(s => s.key)).toEqual([
            "objectsBasics",
            "objectsDescriptions",
            "groupsBasics",
            "servicesBasics",
        ]);
        expect(programs.sections).toHaveLength(7);
    });

    it("grants access by level", () => {
        const of = (user: typeof plain) => programs.getPermissions({ user, settings });

        expect(of(plain).canSeeSection("programRules")).toBe(false);
        expect(of(advanced).canSeeSection("programRules")).toBe(true);
        expect(of(admin).canSeeSection("programRules")).toBe(true);
        expect(of(plain).canSeeColumn("programStages", "name")).toBe(true);
        expect(of(plain).canSeeColumn("programStages", "valueType")).toBe(false);
        expect(of(advanced).canSeeColumn("programStages", "valueType")).toBe(true);
    });

    it("admin-only columns are not for advanced users", () => {
        const search = LayoutSettings.defaults("search");
        const of = (user: typeof plain) => search.getPermissions({ user, settings });

        expect(of(advanced).canSeeColumn("objectsBasics", "id")).toBe(false);
        expect(of(admin).canSeeColumn("objectsBasics", "id")).toBe(true);
    });

    it("merging keeps what is stored and adds what is missing, on any screen", () => {
        const defaults = LayoutSettings.defaults("indicators");
        const formula = assertValue(defaults.sections[0]);
        const numerator = assertValue(defaults.sections[1]);
        const stored = defaults.update(
            [
                { ...numerator, access: "admin", columns: numerator.columns.slice(0, 1) },
                { ...formula, access: "advanced" },
            ],
            ["storedGroup"]
        );

        const merged = stored.mergedOverDefaults();

        expect(merged.advancedUserGroupIds).toEqual(["storedGroup"]);
        expect(merged.sections.map(s => [s.key, s.access])).toEqual([
            ["formula", "advanced"],
            ["numerator", "admin"],
            ["denominator", "everyone"],
        ]);
        expect(merged.sections[1]?.columns.map(c => c.key)).toEqual([
            "type",
            "name",
            "datasets",
            "program",
        ]);
    });
});
