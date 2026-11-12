import { defaultMetadataIds } from "$/domain/entities/MetadataIds";
import { describe, expect, it } from "vitest";
import { DataSet } from "$/domain/entities/DataSet";
import { DossierConfigStatus } from "$/domain/entities/DossierConfigStatus";
import { HealthService } from "$/domain/entities/HealthService";
import { HealthServiceTranslations } from "$/domain/entities/HealthServiceTranslations";
import { IndicatorFormula } from "$/domain/entities/IndicatorFormula";
import { IndicatorVisualization } from "$/domain/entities/IndicatorVisualization";
import { ProgramExpression } from "$/domain/entities/ProgramExpression";
import { PeriodBoundary } from "$/domain/entities/ProgramIndicator";
import { createIndicator, createProgramIndicator, createSettings, createStage } from "./fixtures";

const formula = (expression: string) => IndicatorFormula.create({ expression });
const service = (code: string) => HealthService.create({ id: "id", code, name: "Service" });

describe("HealthService", () => {
    it("key is the third part of the code, or empty", () => {
        expect(service("OUG_HSV_CD1").key()).toBe("CD1");
        expect(service("OUG").key()).toBe("");
        expect(service("").key()).toBe("");
    });

    it("matches an attribute value by whole key", () => {
        expect(service("OUG_HSV_CD1").matchesAttributeValue("DS_CD1")).toBe(true);
        expect(service("OUG_HSV_CD1").matchesAttributeValue("DS_CD2_CD1_CD3")).toBe(true);
        expect(service("OUG_HSV_CD1").matchesAttributeValue("DS_CD11")).toBe(false);
    });

    it("never matches without a key", () => {
        expect(service("").matchesAttributeValue("DS__x")).toBe(false);
    });

    it("gets the keys from an attribute value", () => {
        expect(HealthService.keysFromAttributeValue("DS_CD1_CD2")).toEqual(["CD1", "CD2"]);
        expect(HealthService.keysFromAttributeValue("")).toEqual([]);
    });
});

describe("HealthServiceTranslations", () => {
    const translations = HealthServiceTranslations.create({
        healthServiceId: "id",
        translations: [
            { property: "DESCRIPTION", locale: "en", value: "old" },
            { property: "NAME", locale: "en", value: "name" },
            { property: "DESCRIPTION", locale: "de", value: "kept" },
        ],
    });

    it("replaces the description of that language and keeps the rest", () => {
        expect(translations.withDescription("en", "new").translations).toEqual([
            { property: "DESCRIPTION", locale: "en", value: "new" },
            { property: "NAME", locale: "en", value: "name" },
            { property: "DESCRIPTION", locale: "de", value: "kept" },
        ]);
    });

    it("empty text removes it", () => {
        expect(translations.withDescription("en", "").translations).toHaveLength(2);
    });
});

describe("DossierConfigStatus", () => {
    const attribute = {
        id: defaultMetadataIds.healthServiceAttribute,
        name: "serviceCode",
        dataSetAttribute: true,
        indicatorGroupAttribute: true,
        dataElementAttribute: false,
        programAttribute: false,
    };

    it("is complete when all checks pass", () => {
        const status = DossierConfigStatus.build(createSettings(), [service("A_B_C")], [attribute]);

        expect(status.isComplete()).toBe(true);
    });

    it("needs at least one health service, all with a code", () => {
        const settings = createSettings();

        expect(DossierConfigStatus.build(settings, [], [attribute]).healthServiceCodes).toBe(false);
        expect(
            DossierConfigStatus.build(settings, [service("A_B_C"), service("")], [attribute])
                .healthServiceCodes
        ).toBe(false);
    });

    it("needs the attribute on both data sets and indicator groups", () => {
        const status = DossierConfigStatus.build(
            createSettings(),
            [service("A_B_C")],
            [{ ...attribute, indicatorGroupAttribute: false }]
        );

        expect(status.healthServiceAttribute).toBe(false);
        expect(status.isComplete()).toBe(false);
    });

    it("checks the attribute chosen in Admin, the one Search reads, not one named serviceCode", () => {
        const other = { ...attribute, id: "other" };
        const chosen = createSettings({
            metadataIds: { ...defaultMetadataIds, healthServiceAttribute: "other" },
        });

        expect(
            DossierConfigStatus.build(createSettings(), [], [other]).healthServiceAttribute
        ).toBe(false);
        expect(
            DossierConfigStatus.build(chosen, [], [{ ...other, name: "Anything" }])
                .healthServiceAttribute
        ).toBe(true);
    });
});

describe("Indicator", () => {
    const programIndicator = createProgramIndicator({
        id: "pi1",
        expression: ProgramExpression.create({ expression: "#{stage2xxxxx.de} + 1" }),
    });
    const stages = [
        createStage({ id: "stage1xxxxx", name: "One", dataElementIds: ["de1"] }),
        createStage({ id: "stage2xxxxx", name: "Two", dataElementIds: [] }),
    ];

    it("finds stage names through D{} and I{}, including hidden elements", () => {
        const indicator = createIndicator({
            numerator: formula("D{p.de1}"),
            denominator: formula("I{pi1} + I{unknown}"),
        });

        expect(indicator.stageNames(stages, [programIndicator])).toEqual(["One", "Two"]);
    });
});

describe("ProgramIndicator", () => {
    it("names known stages and the ones named in the text", () => {
        const programIndicator = createProgramIndicator({
            expression: ProgramExpression.create({ expression: "#{stage1xxxxx.de}" }),
            filter: ProgramExpression.create({
                expression: `#{nostagexxxx.de} && V{program_stage_name} == 'Named'`,
            }),
        });

        expect(
            programIndicator.stageNames([createStage({ id: "stage1xxxxx", name: "One" })])
        ).toEqual(["One", "Named"]);
    });
});

describe("PeriodBoundary", () => {
    const boundary = (target: string) =>
        PeriodBoundary.create({ target, type: "", offsetPeriods: 0, offsetPeriodType: "" });
    const stages = [{ id: "aaaaaaaaaaa", name: "Visit" }];

    it("labels the target", () => {
        expect(boundary("").targetLabel(stages)).toBe("CUSTOM");
        expect(boundary("EVENT_DATE").targetLabel(stages)).toBe("EVENT_DATE");
        expect(boundary("PS_EVENTDATE:aaaaaaaaaaa").targetLabel(stages)).toBe(
            "PS_EVENTDATE - Visit"
        );
        expect(boundary("PS_EVENTDATE:bbbbbbbbbbb").targetLabel(stages)).toBe(
            "PS_EVENTDATE - bbbbbbbbbbb"
        );
    });
});

describe("IndicatorVisualization", () => {
    it("indicators use their formula ids and their own", () => {
        const indicator = createIndicator({
            id: "i1",
            name: "Ind",
            numerator: formula("#{a}"),
            denominator: formula("I{b}"),
        });
        const visualization = IndicatorVisualization.build(indicator, "allUsers");

        expect(visualization.name).toBe("Ind - i1");
        expect(visualization.itemIds).toEqual(["a", "b", "i1"]);
        expect(visualization.allUsersGroupId).toBe("allUsers");
    });

    it("program indicators only use their own id", () => {
        const programIndicator = createProgramIndicator({ id: "pi1" });

        expect(IndicatorVisualization.build(programIndicator, undefined).itemIds).toEqual(["pi1"]);
    });
});

describe("DataSet", () => {
    it("categoryComboIds has no repeats", () => {
        const element = (combo: string) => ({
            id: "de",
            name: "DE",
            shortName: "",
            formName: "",
            description: "",
            valueType: "",
            aggregationType: "",
            optionNames: [],
            categoryCombo: { id: combo, name: combo },
        });
        const dataSet = DataSet.create({
            id: "ds",
            name: "DS",
            description: "",
            sections: [
                {
                    id: "s",
                    name: "S",
                    description: "",
                    dataElements: [element("a"), element("a"), element("b")],
                },
            ],
            hasRealSections: true,
            dataElementIds: [],
            assignedIndicatorIds: [],
        });

        expect(dataSet.categoryComboIds()).toEqual(["a", "b"]);
    });
});
