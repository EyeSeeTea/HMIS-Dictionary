import { describe, expect, it, vi } from "vitest";
import { AppSettingsD2Repository } from "$/data/repositories/AppSettingsD2Repository";
import { D2DataElement, toDataSet } from "$/data/repositories/DataSetD2Repository";
import { fromStored, toStored } from "$/data/repositories/LayoutSettingsD2Repository";
import { D2StageDataElement, toProgramStage } from "$/data/repositories/ProgramD2Repository";
import { HealthServiceTextD2Repository } from "$/data/repositories/HealthServiceTextD2Repository";
import { toOptionSet } from "$/data/repositories/d2-mappers";
import { SessionD2Repository } from "$/data/repositories/SessionD2Repository";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import { D2Api } from "$/types/d2-api";

const response = <T>(data: T) => ({ getData: () => Promise.resolve(data), cancel: () => {} });
const rejected = (error = new Error("Network error")) => ({
    getData: () => Promise.reject(error),
    cancel: () => {},
});
const asApi = (api: unknown) => api as D2Api;

describe("AppSettingsD2Repository", () => {
    const stored: Record<string, unknown> = {
        setup_userGroup: { value: "Admins", object: { id: "g1", name: "Admins" } },
        setup_organisationUnitGroupSet: { value: "s1", object: { id: "s1", name: "Services" } },
        setup_dossierConfigComplete: { value: true },
        blacklist_dataSets: ["ds1"],
        notInUse_tag: "Old",
    };

    const setup = (keys = stored) => {
        const save = vi.fn(() => response(undefined));
        const api = asApi({
            dataStore: () => ({ get: (key: string) => response(keys[key]), save }),
        });
        return { save, repository: new AppSettingsD2Repository(api) };
    };

    it("reads each key, with defaults for what is missing", async () => {
        const settings = await setup().repository.get().toPromise();

        expect(settings.adminGroup).toEqual({ id: "g1", name: "Admins" });
        expect(settings.healthServiceGroupSet).toEqual({ id: "s1", name: "Services" });
        expect(settings.dossierConfigComplete).toBe(true);
        expect(settings.blacklist.dataSetIds).toEqual(["ds1"]);
        expect(settings.blacklist.indicatorGroupIds).toEqual([]);
        expect(settings.blacklist.tag).toBe("Blacklisted");
        expect(settings.notInUse.tag).toBe("Old");
    });

    it("counts a key that cannot be read as not configured", async () => {
        const api = asApi({ dataStore: () => ({ get: rejected }) });
        const settings = await new AppSettingsD2Repository(api).get().toPromise();

        expect(settings.adminGroup).toBeUndefined();
    });

    it("only writes the keys that change, in their stored format", async () => {
        const { save, repository } = setup();
        const settings = await repository.get().toPromise();

        await repository
            .update({ blacklist: { ...settings.blacklist, dataSetIds: ["ds1", "ds2"] } })
            .toPromise();

        expect(save.mock.calls).toEqual([["blacklist_dataSets", ["ds1", "ds2"]]]);
    });

    it("stores the name as the value of the admin group, and the id for the group set", async () => {
        const { save, repository } = setup({});

        await repository
            .update({
                adminGroup: { id: "g2", name: "New" },
                healthServiceGroupSet: { id: "s2", name: "Set" },
            })
            .toPromise();

        expect(save.mock.calls).toEqual([
            ["setup_userGroup", { value: "New", object: { id: "g2", name: "New" } }],
            ["setup_organisationUnitGroupSet", { value: "s2", object: { id: "s2", name: "Set" } }],
        ]);
    });
});

describe("Layout settings mapping", () => {
    it("keeps the stored format, with access as 0, 1 and 2", () => {
        const stored = toStored(LayoutSettings.defaults("indicators"));

        expect(stored.advancedUserGroups).toEqual(["LjRqO9XzQPs"]);
        expect(stored.accesses?.["formula"]).toEqual({
            index: 0,
            translationKey: "dos_FormulaOfIndicator",
            access: 2,
        });
        expect(stored.accesses?.["numerator"]?.columns?.["type"]?.access).toBe(0);
    });

    it("reads back what it writes", () => {
        const defaults = LayoutSettings.defaults("programs");
        const read = fromStored("programs", toStored(defaults));

        expect(read.sections).toEqual(defaults.sections);
    });
});

describe("Data set mapping", () => {
    const element = (id: string): D2DataElement => ({
        id,
        displayName: id,
        valueType: "NUMBER",
        optionSet: { options: [{ displayName: "Yes" }] },
        categoryCombo: { id: "own", displayName: "Own" },
    });

    it("uses the data set's category combo override, or else the element's own", () => {
        const dataSet = toDataSet({
            id: "ds",
            displayName: "DS",
            sections: [{ id: "s", displayName: "S", dataElements: [element("a"), element("b")] }],
            dataSetElements: [
                {
                    categoryCombo: { id: "override", displayName: "Override" },
                    dataElement: element("a"),
                },
                { dataElement: element("b") },
                { dataElement: element("outside") },
            ],
        });
        const [first, second] = dataSet.sections[0]?.dataElements ?? [];

        expect(first?.categoryCombo.id).toBe("override");
        expect(second?.categoryCombo.id).toBe("own");
        expect(first?.optionNames).toEqual(["Yes"]);
        expect(dataSet.hasRealSections).toBe(true);
        expect(dataSet.dataElementIds).toEqual(["a", "b", "outside"]);
    });

    it("leaves out the elements of a section that are no longer in the data set", () => {
        const dataSet = toDataSet({
            id: "ds",
            displayName: "DS",
            sections: [
                { id: "s", displayName: "S", dataElements: [element("a"), element("orphan")] },
            ],
            dataSetElements: [{ dataElement: element("a") }],
        });

        expect(dataSet.sections[0]?.dataElements.map(de => de.id)).toEqual(["a"]);
    });

    it("uses a virtual section when there are none", () => {
        const dataSet = toDataSet({
            id: "ds",
            displayName: "DS",
            sections: [],
            dataSetElements: [{ dataElement: element("a") }],
        });

        expect(dataSet.hasRealSections).toBe(false);
        expect(dataSet.sections.map(section => [section.id, section.name])).toEqual([
            ["DataElements", "Data Elements"],
        ]);
        expect(dataSet.sections[0]?.dataElements.map(de => de.id)).toEqual(["a"]);
    });
});

describe("Program stage mapping", () => {
    const element = (id: string): D2StageDataElement => ({
        id,
        displayName: id,
        valueType: "TEXT",
        dataElementGroups: [{ id: "group" }],
    });

    it("takes compulsory from the stage's data elements, and keeps all ids", () => {
        const stage = toProgramStage({
            id: "stage",
            displayName: "Stage",
            repeatable: true,
            sortOrder: 2,
            programStageSections: [{ id: "s", displayName: "S", dataElements: [element("a")] }],
            programStageDataElements: [
                { compulsory: true, dataElement: element("a") },
                { compulsory: false, dataElement: element("notInASection") },
            ],
        });

        expect(stage.sections[0]?.dataElements[0]?.compulsory).toBe(true);
        expect(stage.sections[0]?.dataElements[0]?.groupIds).toEqual(["group"]);
        expect(stage.dataElementIds).toEqual(["a", "notInASection"]);
    });

    it("uses a virtual section when there are none", () => {
        const stage = toProgramStage({
            id: "stage",
            displayName: "Stage",
            repeatable: false,
            sortOrder: 1,
            programStageSections: [],
            programStageDataElements: [{ compulsory: true, dataElement: element("a") }],
        });

        expect(stage.hasRealSections).toBe(false);
        expect(stage.sections[0]?.dataElements[0]?.compulsory).toBe(true);
    });
});

describe("toOptionSet", () => {
    it("skips the nulls the API answers for gaps in the sort order", () => {
        const optionSet = toOptionSet({
            displayName: "Set",
            options: [null, { id: "a", displayName: "A" }, null],
        });

        expect(optionSet?.options).toEqual([{ id: "a", code: "", name: "A" }]);
    });
});

describe("HealthServiceTextD2Repository", () => {
    const stored = {
        description: "<p>Default</p>",
        translations: [
            { locale: "es", property: "NAME", value: "Nombre" },
            { locale: "es", property: "DESCRIPTION", value: "<p>Hola</p>" },
        ],
    };
    const getText = (locale: "en" | "es" | "fr") =>
        new HealthServiceTextD2Repository(asApi({ get: () => response(stored) }))
            .getText("id", locale)
            .toPromise();

    it("reads the description of the locale from its translations", async () => {
        expect(await getText("es")).toBe("<p>Hola</p>");
    });

    it("uses the description when the locale has no translation", async () => {
        expect(await getText("fr")).toBe("<p>Default</p>");
    });
});

describe("SessionD2Repository", () => {
    // jsdom's Blob has no text()
    const blob = (text: string) => ({ text: () => Promise.resolve(text) });

    const check = (result: ReturnType<typeof response> | ReturnType<typeof rejected>) =>
        new SessionD2Repository(asApi({ request: () => result })).isActive().toPromise();

    it("is active when the server answers pong", async () => {
        expect(await check(response(blob("pong")))).toBe(true);
    });

    it("is not active when it answers something else, as a login page", async () => {
        expect(await check(response(blob("<html>")))).toBe(false);
    });

    it("is not active when the server says there is no session (P1)", async () => {
        const error = Object.assign(new Error("401"), { response: { status: 401 } });
        expect(await check(rejected(error))).toBe(false);
    });

    it("says nothing about the session when a request fails for other reasons", async () => {
        expect(await check(rejected())).toBe(true);
    });
});
