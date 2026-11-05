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
    dataElements: [
        {
            ...base,
            id: "de1",
            name: "Visible element",
            code: "DE1",
            icd10: "A01",
            groupIds: [],
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
            id: "de2",
            name: "Hidden element",
            icd10: "",
            groupIds: ["blacklistedDeg"],
            dataSets: [],
        },
    ],
    categoryOptionCombos: [{ id: "coc1", name: "Under 5" }],
    programIndicators: [
        { ...base, id: "pi1", name: "Program indicator", expression: "1", filter: "2", groups: [] },
        {
            ...base,
            id: "pi2",
            name: "Not in use PI",
            expression: "",
            filter: "",
            groups: [{ id: "notInUsePig", name: "G", code: "" }],
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
        expect(catalog.objects.map(object => object.id)).toEqual(["de1", "ind1", "pi1"]);
    });

    it("shows not-in-use objects to admins", () => {
        const adminCatalog = SearchCatalog.build(sources, healthServices, {
            user: admin,
            settings,
        });

        expect(adminCatalog.objects.map(object => object.id)).toEqual([
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

    it("finds text without accents, in both directions", () => {
        const cafe = row({ object_name: "Café" });

        expect(filter("cafe").matches(cafe)).toBe(true);
        expect(filter("CAFÉ").matches(row({ object_name: "cafe" }))).toBe(true);
        expect(filter("", { object_name: "afe" }).matches(cafe)).toBe(true);
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
