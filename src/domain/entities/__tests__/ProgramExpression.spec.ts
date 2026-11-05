import { describe, expect, it } from "vitest";
import { ExpressionDescription } from "$/domain/entities/ExpressionDescription";
import { ProgramExpression } from "$/domain/entities/ProgramExpression";
import { createOptionSet, createStage, createStageDataElement } from "./fixtures";

const expression = (value: string) => ProgramExpression.create({ expression: value });
const stageA = "aaaaaaaaaaa";
const stageB = "bbbbbbbbbbb";

describe("ProgramExpression", () => {
    it("isEmpty", () => {
        expect(expression("").isEmpty()).toBe(true);
        expect(expression("1").isEmpty()).toBe(false);
    });

    it("stageIds finds all forms, without repeating", () => {
        const value = `V{program_stage_id} == '${stageA}' && #{${stageB}.de} > 1 && #{${stageB}.x} && PS_EVENTDATE:ccccccccccc`;

        expect(expression(value).stageIds()).toEqual([stageA, stageB, "ccccccccccc"]);
    });

    it("stageNames", () => {
        expect(expression(`V{program_stage_name} == "Visit"`).stageNames()).toEqual(["Visit"]);
    });

    describe("withOptionNames", () => {
        const stage = createStage({
            id: stageA,
            sections: [
                {
                    id: "s",
                    name: "S",
                    dataElements: [createStageDataElement({ optionSet: createOptionSet() })],
                },
            ],
        });

        it("replaces a one-character code", () => {
            const result = expression(`#{${stageA}.de1} == '1'`).withOptionNames([stage]);

            expect(result.expression).toBe(`#{${stageA}.de1} == 'Yes'`);
        });

        it("keeps longer codes, as the kept bug P11", () => {
            const value = `#{${stageA}.de1} == '22'`;

            expect(expression(value).withOptionNames([stage]).expression).toBe(value);
        });

        it("keeps it when the stage or the option are unknown", () => {
            const value = `#{${stageB}.de1} == '1'`;

            expect(expression(value).withOptionNames([stage]).expression).toBe(value);
        });
    });
});

describe("ExpressionDescription", () => {
    const ok = (text: string) => ExpressionDescription.create({ result: { ok: true, text } });
    const error = ExpressionDescription.create({
        result: { ok: false, message: "Invalid", description: "Bad" },
    });

    it("unescapes dots on program indicators", () => {
        expect(ok("a\\.b").toDisplayText("programIndicatorExpression", "x")).toBe("a.b");
        expect(ok("a\\.b").toDisplayText("programIndicatorFilter", "x")).toBe("a.b");
    });

    it("keeps filters with a program stage id as returned, as the kept bug P11", () => {
        const text = "Program stage id == 'x\\.y'";

        expect(ok(text).toDisplayText("programIndicatorFilter", "x")).toBe(text);
    });

    it("shows errors with the expression", () => {
        expect(error.toDisplayText("programIndicatorExpression", "x")).toBe(
            "Invalid: Bad Expression: x"
        );
        expect(error.toDisplayText("programIndicatorFilter", "x")).toBe("Invalid: Bad\n Filter: x");
        expect(error.toDisplayText("indicator", "x")).toBe("Bad");
    });
});
