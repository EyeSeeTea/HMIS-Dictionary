import { describe, expect, it } from "vitest";
import { assertValue } from "$/utils/assert";
import { HealthService } from "$/domain/entities/HealthService";
import { SearchCatalog, SearchSources } from "$/domain/entities/SearchCatalog";
import { SearchColumn, SearchFilter, SearchRow } from "$/domain/entities/SearchFilter";
import { createSettings } from "./fixtures";
import { createUser } from "./userFixtures";

const SERVICE_ATTRIBUTE = "pG4YeQyynJh";
const base = { code: "", shortName: "short", formName: "form", description: "desc" };

const sources: SearchSources = {
    programs: [
        { id: "p1", name: "Line list", code: "P1", dataElementIds: ["trackerDe"] },
        { id: "p2", name: "~Hidden program", code: "P2", dataElementIds: ["trackerDe"] },
        { id: "p3", name: "Unrelated", code: "P3", dataElementIds: [] },
    ],
    dataElements: [
        {
            ...base,
            domain: "tracker",
            id: "trackerDe",
            name: "Tracker element",
            icd10: "",
            groupIds: [],
            groupNames: [],
            dataSets: [],
        },
        {
            ...base,
            domain: "aggregate",
            id: "de1",
            name: "Visible element",
            code: "DE1",
            icd10: "A01",
            groupIds: [],
            groupNames: ["First group", "Second group"],
            dataSets: [
                {
                    id: "ds1",
                    name: "Data set",
                    code: "DS1",
                    attributeValues: [{ attributeId: SERVICE_ATTRIBUTE, value: "DS_CD1_NOPE" }],
                },
                { id: "ds2", name: "No attribute", code: "", attributeValues: [] },
                { id: "blacklistedDs", name: "Hidden", code: "X", attributeValues: [] },
            ],
        },
        {
            ...base,
            domain: "aggregate",
            id: "de2",
            name: "Hidden element",
            icd10: "",
            groupIds: ["blacklistedDeg"],
            groupNames: ["Hidden group"],
            dataSets: [],
        },
    ],
    categoryOptionCombos: [{ id: "coc1", name: "Under 5" }],
    dataElementGroups: [],
    categoryOptions: [],
    programIndicators: [
        {
            ...base,
            id: "pi1",
            name: "Program indicator",
            expression: "1",
            filter: "2",
            groups: [],
            programName: "Its program",
        },
        {
            ...base,
            id: "pi2",
            name: "Not in use PI",
            expression: "",
            filter: "",
            groups: [{ id: "notInUsePig", name: "G", code: "" }],
            programName: "",
        },
    ],
    indicators: [
        {
            ...base,
            id: "ind1",
            name: "Indicator",
            numerator: "#{de2} + #{de1.coc1}",
            denominator: "I{pi2}",
            groups: [
                {
                    id: "ig1",
                    name: "Group",
                    code: "IG1",
                    attributeValues: [{ attributeId: "anyAttribute", value: "ING_CD1" }],
                },
            ],
        },
        {
            ...base,
            id: "ind2",
            name: "Not in use",
            numerator: "1",
            denominator: "1",
            groups: [{ id: "notInUseIg", name: "G", code: "", attributeValues: [] }],
        },
        {
            ...base,
            id: "ind3",
            name: "Blacklisted",
            numerator: "1",
            denominator: "1",
            groups: [{ id: "blacklistedIg", name: "G", code: "", attributeValues: [] }],
        },
    ],
};

const healthServices = [HealthService.create({ id: "hs1", code: "OUG_HSV_CD1", name: "Surgery" })];
const settings = createSettings();
const user = createUser();
const admin = createUser({ userGroups: [{ id: "x", name: "Admins" }] });

describe("SearchCatalog", () => {
    const catalog = SearchCatalog.build(sources, healthServices, { user, settings });
    const row = (id: string) =>
        assertValue(catalog.rows().find(row => row.columns.object_id === id));

    it("hides blacklisted objects, and not-in-use ones for non-admins", () => {
        expect(catalog.objects.map(object => object.id)).toEqual([
            "trackerDe",
            "de1",
            "ind1",
            "pi1",
        ]);
    });

    it("gives tracker data elements their own type, and their programs as the group", () => {
        const tracker = catalog.objects.find(object => object.id === "trackerDe");

        expect(tracker?.groups.map(group => group.name)).toEqual(["Line list"]);
        const row = catalog.rows().find(row => row.columns.object_id === "trackerDe");
        expect(row?.columns.object_type).toBe("dataElement (tracker)");
        expect(row?.columns.objectGroup_name).toBe("Line list");
    });

    it("has columns for the data element groups and the program, next to the group column", () => {
        const columnsOf = (id: string) =>
            catalog.rows().find(row => row.columns.object_id === id)?.columns;

        expect(columnsOf("de1")?.dataElementGroup_name).toBe("First group, Second group");
        expect(columnsOf("de1")?.program_name).toBe("");
        expect(columnsOf("trackerDe")?.program_name).toBe("Line list");
        expect(columnsOf("pi1")?.program_name).toBe("Its program");
        expect(columnsOf("ind1")?.program_name).toBe("");
    });

    it("gives program indicators their short name", () => {
        const row = catalog.rows().find(row => row.columns.object_id === "pi1");

        expect(row?.columns.object_shortName).toBe("short");
    });

    it("shows not-in-use objects to admins", () => {
        const adminCatalog = SearchCatalog.build(sources, healthServices, {
            user: admin,
            settings,
        });

        expect(adminCatalog.objects.map(object => object.id)).toEqual([
            "trackerDe",
            "de1",
            "ind1",
            "ind2",
            "pi1",
            "pi2",
        ]);
    });

    it("keeps hidden objects in the lookup, flagged", () => {
        expect(catalog.lookup.dataElements.get("de2")?.status).toBe("blacklisted");
        expect(catalog.lookup.indicators.get("ind2")?.status).toBe("notInUse");
        expect(catalog.lookup.indicators.get("ind3")?.status).toBe("blacklisted");
        expect(catalog.lookup.programIndicators.get("pi2")?.status).toBe("notInUse");
    });

    it("data elements take groups from their data sets, without blacklisted ones", () => {
        const { columns } = row("de1");

        expect(columns.objectGroup_name).toBe("Data set, No attribute");
        expect(columns.objectGroup_code).toBe("DS1");
        expect(columns.object_ICD10).toBe("A01");
    });

    it("finds health services on data sets by attribute id, ignoring unknown keys", () => {
        expect(row("de1").columns.service_name).toBe("Surgery");
    });

    it("a data set without the attribute does not reuse the previous one's codes", () => {
        const object = catalog.objects.find(object => object.id === "de1");

        expect(object?.type === "dataElement" && object.healthServices).toHaveLength(1);
    });

    it("finds health services on indicator groups from the first attribute", () => {
        expect(row("ind1").columns.service_name).toBe("Surgery");
    });

    it("program indicators have no health services and start with raw expressions", () => {
        const { columns } = row("pi1");

        expect(columns.object_type).toBe("program indicator");
        expect(columns.service_name).toBe("");
        expect(columns.object_exp_formula).toBe("1");
        expect(columns.object_flt_formula).toBe("2");
    });

    it("formula columns have the text, with tags; raw has the expressions", () => {
        const { columns, raw } = row("ind1");

        expect(columns.object_num_formula).toBe(
            " [Blacklisted] Hidden element\n+ Visible element (Under 5)"
        );
        expect(columns.object_den_formula).toContain("[Not in Use] Not in use PI");
        expect(raw.numerator).toBe("#{de2} + #{de1.coc1}");
    });

    it("has no health services when none are given", () => {
        const empty = SearchCatalog.build(sources, [], { user, settings });

        expect(empty.rows().every(row => row.columns.service_name === "")).toBe(true);
    });
});

describe("SearchFilter", () => {
    const row = (columns: Partial<Record<SearchColumn, string>>): SearchRow => ({
        columns: columns as Record<SearchColumn, string>,
        raw: { numerator: "#{rawUid}", denominator: "", expression: "", filter: "" },
    });
    const filter = (global: string, columns: Partial<Record<SearchColumn, string>> = {}) =>
        SearchFilter.create({ global, columns });
    const malaria = row({ object_name: "Malaria cases", object_id: "uid1" });

    it("matches everything when empty", () => {
        expect(filter("").matches(malaria)).toBe(true);
        expect(filter("", { object_name: "" }).matches(malaria)).toBe(true);
    });

    it("global search checks every column, not case-sensitive", () => {
        expect(filter("MALARIA").matches(malaria)).toBe(true);
        expect(filter("uid1").matches(malaria)).toBe(true);
        expect(filter("nope").matches(malaria)).toBe(false);
    });

    it("global search also checks raw expressions", () => {
        expect(filter("rawUid").matches(malaria)).toBe(true);
    });

    it("a column filter only checks its column", () => {
        expect(filter("", { object_name: "malaria" }).matches(malaria)).toBe(true);
        expect(filter("", { object_name: "uid1" }).matches(malaria)).toBe(false);
        expect(filter("", { object_name: "rawUid" }).matches(malaria)).toBe(false);
    });

    it("| is OR inside a filter, and filters combine with AND", () => {
        expect(filter("nope | malaria").matches(malaria)).toBe(true);
        expect(filter("malaria", { object_id: "nope" }).matches(malaria)).toBe(false);
        expect(filter("malaria", { object_id: "nope|uid1" }).matches(malaria)).toBe(true);
    });

    it("takes special characters literally", () => {
        expect(filter("(cases").matches(row({ object_name: "Some (cases)" }))).toBe(true);
        expect(filter("m.laria").matches(malaria)).toBe(false);
    });

    it("gives the terms to highlight in a column", () => {
        expect(filter("a | b", { object_name: "c" }).highlightTerms("object_name")).toEqual([
            "a",
            "b",
            "c",
        ]);
        expect(filter("a", { object_name: "c" }).highlightTerms("object_id")).toEqual(["a"]);
    });
});

describe("SearchFilter, global search", () => {
    const row = (values: Partial<Record<SearchColumn, string>>): SearchRow =>
        ({
            columns: values,
            raw: { numerator: "", denominator: "", expression: "", filter: "" },
        }) as SearchRow;
    const malaria = row({ object_name: "Malaria cases confirmed", object_type: "indicator" });

    it("finds all the words, in any order and in any column", () => {
        const find = (global: string) =>
            SearchFilter.create({ global, columns: {} }).matches(malaria);

        expect(find("confirmed malaria")).toBe(true);
        expect(find("malaria indicator")).toBe(true);
        expect(find("  CASES   malaria  ")).toBe(true);
        expect(find("malaria dengue")).toBe(false);
        expect(find("   ")).toBe(true);
    });

    it("keeps | as OR", () => {
        const find = (global: string) =>
            SearchFilter.create({ global, columns: {} }).matches(malaria);

        expect(find("dengue|malaria")).toBe(true);
        expect(find("dengue|cholera")).toBe(false);
    });

    it("uses & as AND, where a term can have several words in that order", () => {
        const find = (global: string) =>
            SearchFilter.create({ global, columns: {} }).matches(malaria);

        expect(find("malaria & indicator")).toBe(true);
        expect(find("malaria cases&indicator")).toBe(true);
        expect(find("cases malaria & indicator")).toBe(false);
        expect(find("malaria & dengue")).toBe(false);
        expect(find("dengue & cholera | malaria")).toBe(true);
        expect(find("&")).toBe(true);
    });

    it("highlights the terms of &, word by word", () => {
        const filter = SearchFilter.create({ global: "malaria cases & indicator", columns: {} });

        expect(filter.highlightTerms("object_name")).toEqual(["malaria", "cases", "indicator"]);
    });

    it("recognises the rows that have the whole text of a plain search", () => {
        const has = (global: string) =>
            SearchFilter.create({ global, columns: {} }).hasWholeSearch(malaria);

        expect(has("cases confirmed")).toBe(true);
        expect(has("  CASES CONFIRMED ")).toBe(true);
        expect(has("confirmed cases")).toBe(false);
        expect(has("")).toBe(false);
        expect(has("cases | confirmed")).toBe(false);
        expect(has("cases & confirmed")).toBe(false);
    });

    it("highlights each word", () => {
        const filter = SearchFilter.create({ global: "confirmed malaria", columns: {} });

        expect(filter.highlightTerms("object_name")).toEqual(["confirmed", "malaria"]);
    });
});
