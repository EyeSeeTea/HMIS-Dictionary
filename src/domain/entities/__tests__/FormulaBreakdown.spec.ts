import { describe, expect, it } from "vitest";
import { FormulaBreakdown, FormulaReferences } from "$/domain/entities/FormulaBreakdown";
import { IndicatorFormula } from "$/domain/entities/IndicatorFormula";

const references: FormulaReferences = {
    names: new Map([
        ["de1", "Element"],
        ["coc1", "Under 5"],
        ["pi1", "Program indicator"],
        ["p1", "Program"],
        ["g1", "Group"],
        ["ind1", "Nested"],
        ["c1", "Constant"],
    ]),
    dataSetNames: new Map([["de1", ["Data set A", "Data set B"]]]),
};

const build = (expression: string) =>
    FormulaBreakdown.build(IndicatorFormula.create({ expression }), references);

describe("FormulaBreakdown", () => {
    it("text has names and operators, without parentheses, as today", () => {
        expect(build("(#{de1.coc1} + I{pi1}) / 2").text).toBe(
            "Element Under 5 + Program indicator / 2"
        );
        expect(build("D{p1.de1}").text).toBe("Program Element");
    });

    it("the two known constants are numbers", () => {
        expect(build("C{m70zf14qLvm} + C{qRquxuP5Zow}").text).toBe("0 + 1");
        expect(build("C{m70zf14qLvm}").components).toEqual([
            { type: "number", name: "0", dataSetNames: [], programNames: [] },
        ]);
    });

    it("other constants, N{} and A{} show by name or id, without shifting the rest", () => {
        expect(build("C{c1} + N{ind1} + #{de1}").text).toBe("Constant + Nested + Element");
        expect(build("C{unknown} + #{de1}").text).toBe("unknown + Element");
        expect(build("A{p1.tea} + #{de1}").text).toBe("Program tea + Element");
    });

    it("components only have the types of today", () => {
        const { components } = build(
            "#{de1.coc1} + D{p1.de1} + I{pi1} + G{g1} + 3 + N{ind1} + C{c1}"
        );

        expect(components.map(c => c.type)).toEqual([
            "aggregateDataElement",
            "trackerDataElement",
            "programIndicator",
            "orgUnitGroup",
            "number",
        ]);
        expect(components[0]?.dataSetNames).toEqual(["Data set A", "Data set B"]);
        expect(components[1]?.programNames).toEqual(["Program"]);
        expect(components[2]?.programNames).toEqual([]);
    });

    it("a data element in no data set has an empty list, shown by presentation", () => {
        expect(build("#{other}").components[0]?.dataSetNames).toEqual([]);
    });
});
