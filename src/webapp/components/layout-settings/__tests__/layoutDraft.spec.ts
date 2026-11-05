import { describe, expect, it } from "vitest";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import {
    applyDraft,
    getDraft,
    isSameDraft,
    parseAdvancedGroups,
} from "$/webapp/components/layout-settings/layoutDraft";

const settings = LayoutSettings.defaults("search");

describe("layoutDraft", () => {
    it("reads the checkboxes from the access of each row", () => {
        const draft = getDraft(settings);

        expect(draft["objectsBasics.id"]).toEqual({ advanced: false, everyone: false });
        expect(draft["objectsBasics.name"]).toEqual({ advanced: true, everyone: true });
    });

    it("returns the same sections when nothing changed", () => {
        expect(applyDraft(settings.sections, getDraft(settings))).toEqual(settings.sections);
    });

    it("gives everyone priority over advanced, and admin when none is checked", () => {
        const draft = {
            ...getDraft(settings),
            "objectsBasics.name": { advanced: true, everyone: false },
            "objectsBasics.shortName": { advanced: false, everyone: true },
            "objectsBasics.form": { advanced: false, everyone: false },
        };

        const columns = applyDraft(settings.sections, draft)[0]?.columns;

        expect(columns?.find(c => c.key === "name")?.access).toBe("advanced");
        expect(columns?.find(c => c.key === "shortName")?.access).toBe("everyone");
        expect(columns?.find(c => c.key === "form")?.access).toBe("admin");
    });

    it("detects changes", () => {
        const draft = getDraft(settings);

        expect(isSameDraft(draft, getDraft(settings))).toBe(true);
        expect(
            isSameDraft(draft, { ...draft, objectsBasics: { advanced: false, everyone: false } })
        ).toBe(false);
    });

    it("accepts only a JSON array of strings", () => {
        expect(parseAdvancedGroups('["a","b"]')).toEqual({ type: "valid", ids: ["a", "b"] });
        expect(parseAdvancedGroups("[]")).toEqual({ type: "valid", ids: [] });
        expect(parseAdvancedGroups("a,b").type).toBe("invalidFormat");
        expect(parseAdvancedGroups('{"a":1}').type).toBe("invalidFormat");
        expect(parseAdvancedGroups("[1]").type).toBe("invalidFormat");
    });
});
