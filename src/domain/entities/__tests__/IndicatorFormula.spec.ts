import { describe, expect, it } from "vitest";
import {
    FormulaIndicator,
    FormulaLookup,
    FormulaObject,
    IndicatorFormula,
    formulaToPlainText,
    getFormulaLegend,
} from "$/domain/entities/IndicatorFormula";

const formula = (expression: string) => IndicatorFormula.create({ expression });
const tags = { blacklist: "Blacklisted", notInUse: "Not in Use" };

const object = (id: string, status: FormulaObject["status"] = "active"): FormulaObject => ({
    id,
    name: `name-${id}`,
    description: `description-${id}`,
    status,
});

const indicator = (id: string, numerator: string, denominator: string): FormulaIndicator => ({
    ...object(id),
    numerator: formula(numerator),
    denominator: formula(denominator),
});

const lookup: FormulaLookup = {
    dataElements: new Map([
        ["de1", object("de1")],
        ["bad", object("bad", "blacklisted")],
    ]),
    programIndicators: new Map([["pi1", object("pi1", "notInUse")]]),
    indicators: new Map([
        ["ind1", indicator("ind1", "#{de1}", "2")],
        ["ind2", indicator("ind2", "N{ind1}", "N{ind3}")],
        ["ind3", indicator("ind3", "N{ind2}", "1")],
    ]),
    categoryOptionCombos: new Map([["coc1", { id: "coc1", name: "Under 5" }]]),
};

const text = (expression: string) => formulaToPlainText(formula(expression).resolve(lookup), tags);

describe("IndicatorFormula", () => {
    describe("tokens", () => {
        it("recognises every reference, numbers and operators", () => {
            const tokens = formula("#{a}+#{a.b}-I{c}*N{d}/G{e}+C{f}+D{g.h}+A{i.j}+12").tokens();

            expect(tokens.filter(t => t.type !== "operator")).toEqual([
                { type: "dataElement", dataElementId: "a", categoryOptionComboId: undefined },
                { type: "dataElement", dataElementId: "a", categoryOptionComboId: "b" },
                { type: "programIndicator", id: "c" },
                { type: "indicator", id: "d" },
                { type: "orgUnitGroup", id: "e" },
                { type: "constant", id: "f" },
                { type: "programDataElement", programId: "g", dataElementId: "h" },
                { type: "programAttribute", programId: "i", attributeId: "j" },
                { type: "number", value: "12" },
            ]);
            expect(tokens.filter(t => t.type === "operator")).toHaveLength(8);
        });

        it("does not take digits inside an id for a number", () => {
            expect(formula("#{a1b2}").tokens()).toHaveLength(1);
        });
    });

    it("referencesAnyDataElement only finds #{de.coc}, as the kept bug", () => {
        expect(formula("#{de1.coc}").referencesAnyDataElement(["de1"])).toBe(true);
        expect(formula("#{de1}").referencesAnyDataElement(["de1"])).toBe(false);
        expect(formula("#{de2.coc}").referencesAnyDataElement(["de1"])).toBe(false);
    });

    it("referencesProgram looks at D{}, A{} and the program's I{}", () => {
        expect(formula("D{p1.de}").referencesProgram("p1", [])).toBe(true);
        expect(formula("A{p1.tea}").referencesProgram("p1", [])).toBe(true);
        expect(formula("I{pi1}").referencesProgram("p1", ["pi1"])).toBe(true);
        expect(formula("D{p2.de} + I{pi2}").referencesProgram("p1", ["pi1"])).toBe(false);
    });

    it("visualizationItemIds has the ids of #{}, I{} and N{} only", () => {
        const expression = "(#{a} + #{b.c}) * I{d} - N{e} + D{f.g} + G{h} + 2";

        expect(formula(expression).visualizationItemIds()).toEqual(["a", "b.c", "d", "e"]);
    });

    it("hasNestedIndicators", () => {
        expect(formula("N{a} + 1").hasNestedIndicators()).toBe(true);
        expect(formula("#{a}").hasNestedIndicators()).toBe(false);
    });

    describe("resolve", () => {
        it("keeps parentheses and everything it does not replace", () => {
            expect(text("(#{de1} / 2) + D{p.de} + G{g} + C{c}")).toBe(
                "(name-de1 / 2) + D{p.de} + G{g} + C{c}"
            );
        });

        it("shows the id of unknown references", () => {
            expect(text("#{nope}")).toBe("nope");
            expect(text("#{nope.coc1}")).toBe("nope (Under 5)");
            expect(text("#{de1.nope}")).toBe("name-de1 (nope)");
            expect(text("I{nope}")).toBe("nope");
            expect(text("N{nope}")).toBe("nope");
        });

        it("puts + - * on a new line only between a reference and #, I or N", () => {
            expect(text("#{de1} + #{de1}")).toBe("name-de1\n+ name-de1");
            expect(text("#{de1} * I{pi1}")).toContain("\n* ");
            expect(text("#{de1} / #{de1}")).toBe("name-de1 / name-de1");
            expect(text("#{de1} + 2")).toBe("name-de1 + 2");
            expect(text("#{de1} + D{p.de}")).toBe("name-de1 + D{p.de}");
        });

        it("adds the tags and the kind of object", () => {
            expect(text("#{bad}")).toBe(" [Blacklisted] name-bad");
            expect(text("I{pi1}")).toBe(" [Not in Use] name-pi1 (programIndicator) ");
            expect(text("N{ind1}")).toBe("name-ind1 (indicator) ");
            expect(text("#{de1.coc1}")).toBe("name-de1 (Under 5)");
        });

        it("expands nested indicators, with their legend", () => {
            const nodes = formula("N{ind1}").resolve(lookup, { expandIndicators: true });

            expect(formulaToPlainText(nodes, tags)).toBe("[name-de1 / 2]");
            expect(getFormulaLegend(nodes)).toEqual([
                {
                    id: "ind1",
                    name: "name-ind1",
                    description: "description-ind1",
                    depth: 1,
                    order: 0,
                },
            ]);
        });

        it("stops at the maximum depth", () => {
            const nodes = formula("N{ind2}").resolve(lookup, {
                expandIndicators: true,
                maxDepth: 1,
            });

            expect(formulaToPlainText(nodes, tags)).toBe(
                "[name-ind1 (indicator)  / name-ind3 (indicator) ]"
            );
        });

        it("detects a cycle between nested indicators", () => {
            const nodes = formula("N{ind2}").resolve(lookup, { expandIndicators: true });

            expect(formulaToPlainText(nodes, tags)).toContain(
                "[cyclic indicator reference: name-ind2]"
            );
        });

        it("detects cycles back to the given visited indicators", () => {
            const nodes = formula("N{ind2}").resolve(lookup, {
                expandIndicators: true,
                visited: new Set(["ind3"]),
                maxDepth: 3,
            });
            const result = formulaToPlainText(nodes, tags);

            expect(result).toContain("[cyclic indicator reference: name-ind3]");
            expect(result).toContain("name-de1");
        });
    });
});
