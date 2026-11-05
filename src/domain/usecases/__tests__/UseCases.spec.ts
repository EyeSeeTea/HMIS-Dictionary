import { describe, expect, it, vi } from "vitest";
import {
    createIndicator,
    createProgramIndicator,
    createSettings,
    createStage,
    createOptionSet,
    createStageDataElement,
    createRule,
    createAction,
} from "$/domain/entities/__tests__/fixtures";
import { createUser } from "$/domain/entities/__tests__/userFixtures";
import { DataSet } from "$/domain/entities/DataSet";
import { ExpressionDescription } from "$/domain/entities/ExpressionDescription";
import { Future } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { HealthServiceTranslations } from "$/domain/entities/HealthServiceTranslations";
import { IndicatorFormula } from "$/domain/entities/IndicatorFormula";
import { IndicatorVisualization } from "$/domain/entities/IndicatorVisualization";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import { Program, ProgramResource } from "$/domain/entities/Program";
import { ProgramExpression } from "$/domain/entities/ProgramExpression";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";
import { AttributeRepository } from "$/domain/repositories/AttributeRepository";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { DossierRepository } from "$/domain/repositories/DossierRepository";
import { ExpressionRepository } from "$/domain/repositories/ExpressionRepository";
import { HealthServiceRepository } from "$/domain/repositories/HealthServiceRepository";
import { HealthServiceTextRepository } from "$/domain/repositories/HealthServiceTextRepository";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import { LayoutSettingsRepository } from "$/domain/repositories/LayoutSettingsRepository";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";
import { SearchRepository } from "$/domain/repositories/SearchRepository";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";
import { VisualizationRepository } from "$/domain/repositories/VisualizationRepository";
import { DescribeExpressionsUseCase } from "$/domain/usecases/DescribeExpressionsUseCase";
import { DescribeIndicatorsUseCase } from "$/domain/usecases/DescribeIndicatorsUseCase";
import { DescribeProgramIndicatorsUseCase } from "$/domain/usecases/DescribeProgramIndicatorsUseCase";
import { GetDataSetIndicatorsUseCase } from "$/domain/usecases/GetDataSetIndicatorsUseCase";
import { GetDataSetsUseCase } from "$/domain/usecases/GetDataSetsUseCase";
import { GetHealthServiceContentUseCase } from "$/domain/usecases/GetHealthServiceContentUseCase";
import { GetHealthServicesUseCase } from "$/domain/usecases/GetHealthServicesUseCase";
import { GetLayoutSettingsUseCase } from "$/domain/usecases/GetLayoutSettingsUseCase";
import { GetProgramRelatedIndicatorsUseCase } from "$/domain/usecases/GetProgramRelatedIndicatorsUseCase";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";
import { GetProgramsUseCase } from "$/domain/usecases/GetProgramsUseCase";
import { GetProgramResourcesUseCase } from "$/domain/usecases/GetProgramResourcesUseCase";
import { GetProgramRuleVariablesUseCase } from "$/domain/usecases/GetProgramRuleVariablesUseCase";
import { GetProgramStagesUseCase } from "$/domain/usecases/GetProgramStagesUseCase";
import { GetSearchCatalogUseCase } from "$/domain/usecases/GetSearchCatalogUseCase";
import { RefreshDossierConfigStatusUseCase } from "$/domain/usecases/RefreshDossierConfigStatusUseCase";
import { SaveHealthServiceTextUseCase } from "$/domain/usecases/SaveHealthServiceTextUseCase";
import { SaveIndicatorVisualizationUseCase } from "$/domain/usecases/SaveIndicatorVisualizationUseCase";
import {
    InvalidAdvancedUserGroupsError,
    SaveLayoutSettingsUseCase,
} from "$/domain/usecases/SaveLayoutSettingsUseCase";
import { ProgramRuleVariable } from "$/domain/entities/ProgramRule";

function fake<T>(methods: Partial<T>): T {
    return methods as T;
}

const success = <T>(value: T) => Future.success<Error, T>(value);
const failure = <T>(message = "failed") => Future.error<Error, T>(new Error(message));

const settings = createSettings();
const user = createUser();
const context = { user, settings };
const formula = (expression: string) => IndicatorFormula.create({ expression });

const healthService = HealthService.create({ id: "hs1", code: "A_B_CD1", name: "Surgery" });

const program: Program = {
    id: "p1",
    name: "Program",
    description: "",
    stageIds: ["stage1"],
    resourceIds: [],
};

const describing = () => {
    const describe = vi.fn((_kind: string, expression: string) =>
        success(
            ExpressionDescription.create({ result: { ok: true, text: `text of ${expression}` } })
        )
    );
    return { describe, repository: fake<ExpressionRepository>({ describe }) };
};

describe("DescribeExpressionsUseCase", () => {
    it("makes one request per unique expression, and reports progress", async () => {
        const { describe: describeFn, repository } = describing();
        const onProgress = vi.fn();

        const texts = await new DescribeExpressionsUseCase(repository)
            .execute("indicator", ["a", "b", "a", ""], onProgress)
            .toPromise();

        expect(describeFn).toHaveBeenCalledTimes(2);
        expect(texts.get("a")).toBe("text of a");
        expect(texts.get("b")).toBe("text of b");
        expect(onProgress).toHaveBeenLastCalledWith({ current: 2, total: 2 });
    });
});

describe("DescribeIndicatorsUseCase", () => {
    it("fills the texts", async () => {
        const { repository } = describing();
        const useCase = new DescribeIndicatorsUseCase(new DescribeExpressionsUseCase(repository));
        const indicator = createIndicator({
            numerator: formula("#{a}"),
            denominator: formula("2"),
        });

        const [result] = await useCase.execute([indicator]).toPromise();

        expect(result?.numeratorText).toBe("text of #{a}");
        expect(result?.denominatorText).toBe("text of 2");
        expect(result?.numerator.expression).toBe("#{a}");
    });
});

describe("DescribeProgramIndicatorsUseCase", () => {
    it("rewrites filters with the given stages before describing them", async () => {
        const { describe: describeFn, repository } = describing();
        const useCase = new DescribeProgramIndicatorsUseCase(
            new DescribeExpressionsUseCase(repository)
        );
        const stage = createStage({
            id: "aaaaaaaaaaa",
            sections: [
                {
                    id: "s",
                    name: "S",
                    dataElements: [createStageDataElement({ optionSet: createOptionSet() })],
                },
            ],
        });
        const programIndicator = createProgramIndicator({
            expression: ProgramExpression.create({ expression: "1" }),
            filter: ProgramExpression.create({ expression: "#{aaaaaaaaaaa.de1} == '1'" }),
        });

        const [result] = await useCase.execute([programIndicator], [stage]).toPromise();

        expect(describeFn).toHaveBeenCalledWith(
            "programIndicatorFilter",
            "#{aaaaaaaaaaa.de1} == 'Yes'"
        );
        expect(result?.filterText).toBe("text of #{aaaaaaaaaaa.de1} == 'Yes'");
        expect(result?.expressionText).toBe("text of 1");
    });
});

describe("GetLayoutSettingsUseCase", () => {
    const defaults = LayoutSettings.defaults("indicators");

    it("merges what is stored over the defaults, without saving", async () => {
        const save = vi.fn(() => success(undefined));
        const stored = defaults.update(defaults.sections.slice(0, 1), ["group"]);
        const repository = fake<LayoutSettingsRepository>({ get: () => success(stored), save });

        const result = await new GetLayoutSettingsUseCase(repository)
            .execute("indicators")
            .toPromise();

        expect(result.sections).toHaveLength(3);
        expect(result.advancedUserGroupIds).toEqual(["group"]);
        expect(save).not.toHaveBeenCalled();
    });

    it("saves the defaults on first view", async () => {
        const save = vi.fn(() => success(undefined));
        const repository = fake<LayoutSettingsRepository>({ get: () => success(undefined), save });

        await new GetLayoutSettingsUseCase(repository).execute("indicators").toPromise();

        expect(save).toHaveBeenCalledTimes(1);
    });

    it("still gives the defaults if saving or reading fails", async () => {
        const failingSave = fake<LayoutSettingsRepository>({
            get: () => success(undefined),
            save: () => failure(),
        });
        const failingGet = fake<LayoutSettingsRepository>({ get: () => failure() });

        for (const repository of [failingSave, failingGet]) {
            const result = await new GetLayoutSettingsUseCase(repository)
                .execute("indicators")
                .toPromise();
            expect(result.sections).toEqual(defaults.sections);
        }
    });
});

describe("SaveLayoutSettingsUseCase", () => {
    const layout = LayoutSettings.defaults("search").update([], ["g1"]);
    const run = (groupId: string) => {
        const save = vi.fn(() => success(undefined));
        const useCase = new SaveLayoutSettingsUseCase(
            fake<LayoutSettingsRepository>({ save }),
            fake<UserGroupRepository>({ getAll: () => success([{ id: groupId, name: "G" }]) })
        );
        return { save, result: useCase.execute(layout).toPromise() };
    };

    it("saves when the advanced groups exist", async () => {
        const { save, result } = run("g1");

        await result;
        expect(save).toHaveBeenCalledWith(layout);
    });

    it("fails when one does not exist", async () => {
        const { save, result } = run("other");

        await expect(result).rejects.toBeInstanceOf(InvalidAdvancedUserGroupsError);
        expect(save).not.toHaveBeenCalled();
    });
});

describe("GetHealthServicesUseCase", () => {
    const repository = fake<HealthServiceRepository>({
        getHealthServices: () => success([healthService]),
    });

    it("loads them even when the config flag is off, as Dossiers needs them", async () => {
        const flagOff = createSettings({ dossierConfigComplete: false });
        const result = await new GetHealthServicesUseCase(repository).execute(flagOff).toPromise();

        expect(result).toEqual([healthService]);
    });

    it("gives none without a group set (P5)", async () => {
        const noGroupSet = createSettings({ healthServiceGroupSet: undefined });
        const result = await new GetHealthServicesUseCase(repository)
            .execute(noGroupSet)
            .toPromise();

        expect(result).toEqual([]);
    });
});

describe("GetHealthServiceContentUseCase", () => {
    it("loads content only for what matches, without the excluded section", async () => {
        const getSections = vi.fn(() =>
            success([
                { id: "s1", name: "Section", dataElements: [] },
                { id: "s2", name: "Comments", dataElements: [] },
            ])
        );
        const getIndicators = vi.fn(() => success([]));
        const value = (text: string) => [{ attributeId: "any", value: text }];
        const repository = fake<DossierRepository>({
            getDataSets: () =>
                success([
                    { id: "ds1", name: "Match", attributeValues: value("DS_CD1") },
                    { id: "ds2", name: "No match", attributeValues: value("DS_CD2") },
                ]),
            getIndicatorGroups: () =>
                success([{ id: "ig1", name: "Match", attributeValues: value("ING_X_CD1") }]),
            getSections,
            getIndicators,
        });

        const content = await new GetHealthServiceContentUseCase(repository)
            .execute(healthService, "Comments")
            .toPromise();

        expect(getSections).toHaveBeenCalledTimes(1);
        expect(getSections).toHaveBeenCalledWith("ds1");
        expect(content.dataSets[0]?.sections.map(section => section.name)).toEqual(["Section"]);
        expect(content.indicatorGroups.map(group => group.id)).toEqual(["ig1"]);
    });
});

describe("SaveHealthServiceTextUseCase", () => {
    it("reads the translations, changes the description and saves", async () => {
        const saveTranslations = vi.fn(() => success(undefined));
        const repository = fake<HealthServiceTextRepository>({
            getTranslations: () =>
                success(
                    HealthServiceTranslations.create({
                        healthServiceId: "hs1",
                        translations: [{ property: "DESCRIPTION", locale: "fr", value: "kept" }],
                    })
                ),
            saveTranslations,
        });

        await new SaveHealthServiceTextUseCase(repository).execute("hs1", "en", "new").toPromise();

        const [saved] = saveTranslations.mock.calls[0] as unknown as [HealthServiceTranslations];
        expect(saved.translations).toHaveLength(2);
    });
});

describe("GetSearchCatalogUseCase", () => {
    const search = fake<SearchRepository>({
        getDataElements: () => success([]),
        getPrograms: () => success([]),
        getCategoryOptionCombos: () => success([]),
        getProgramIndicators: () => success([]),
        getIndicators: () => success([]),
    });

    it("reports the steps in order", async () => {
        const onStep = vi.fn();
        const useCase = new GetSearchCatalogUseCase(
            fake<HealthServiceRepository>({ getHealthServices: () => success([]) }),
            search
        );

        await useCase.execute(context, onStep).toPromise();

        expect(onStep.mock.calls.map(([step]) => step)).toEqual([
            "dataElements",
            "programs",
            "categoryOptionCombos",
            "programIndicators",
            "indicators",
        ]);
    });

    it("only loads health services when the flag is on and there is a group set", async () => {
        const run = async (attrs: Parameters<typeof createSettings>[0]) => {
            const getHealthServices = vi.fn(() => success([healthService]));
            await new GetSearchCatalogUseCase(
                fake<HealthServiceRepository>({ getHealthServices }),
                search
            )
                .execute({ user, settings: createSettings(attrs) })
                .toPromise();
            return getHealthServices.mock.calls.length;
        };

        expect(await run({})).toBe(1);
        expect(await run({ dossierConfigComplete: false })).toBe(0);
        expect(await run({ healthServiceGroupSet: undefined })).toBe(0);
    });
});

describe("GetProgramsUseCase", () => {
    it("leaves out blacklisted programs, unless linked by name", async () => {
        const listed = [program, { ...program, id: "blacklistedProgram" }];
        const useCase = new GetProgramsUseCase(
            fake<ProgramRepository>({
                getAll: () => success(listed),
                getByName: () => success(listed),
            }),
            fake<OrgUnitRepository>({})
        );

        const all = await useCase.execute(settings).toPromise();
        expect(all.map(({ id }) => id)).toEqual([program.id]);

        const linked = await useCase.execute(settings, { name: "Linked" }).toPromise();
        expect(linked).toHaveLength(2);
    });
});

describe("GetDataSetsUseCase", () => {
    it("limits the list to the org units of the user only when the setting is on", async () => {
        const getAll = vi.fn(() => success([]));
        const getAllInOrgUnits = vi.fn(() => success([]));
        const useCase = new GetDataSetsUseCase(
            fake<DataSetRepository>({ getAll, getAllInOrgUnits }),
            fake<OrgUnitRepository>({ getUserRootIds: () => success(["root"]) })
        );

        await useCase.execute(createSettings({ limitSelectorsToUserOrgUnits: true })).toPromise();

        expect(getAllInOrgUnits).toHaveBeenCalledWith(["blacklistedDs"], ["root"]);
        expect(getAll).not.toHaveBeenCalled();
    });

    it("excludes blacklisted data sets, unless linked by name", async () => {
        const getAll = vi.fn(() => success([]));
        const getByName = vi.fn(() => success([]));
        const useCase = new GetDataSetsUseCase(
            fake<DataSetRepository>({ getAll, getByName }),
            fake<OrgUnitRepository>({})
        );

        await useCase.execute(settings).toPromise();
        expect(getAll).toHaveBeenCalledWith(["blacklistedDs"]);

        await useCase.execute(settings, { name: "Linked" }).toPromise();
        expect(getByName).toHaveBeenCalledWith("Linked");
    });
});

describe("GetDataSetIndicatorsUseCase", () => {
    it("keeps visible indicators using its elements through #{de.coc}, also outside sections", async () => {
        const dataSet = DataSet.create({
            id: "ds",
            name: "DS",
            description: "",
            sections: [],
            hasRealSections: false,
            dataElementIds: ["outside"],
            assignedIndicatorIds: ["assigned", "assignedHidden"],
        });
        const indicators = [
            createIndicator({ id: "yes", numerator: formula("#{outside.coc}") }),
            createIndicator({ id: "bare", numerator: formula("#{outside}") }),
            createIndicator({ id: "assigned", numerator: formula("1") }),
            createIndicator({
                id: "assignedHidden",
                numerator: formula("1"),
                groupIds: ["blacklistedIg"],
            }),
            createIndicator({
                id: "hidden",
                numerator: formula("#{outside.coc}"),
                groupIds: ["blacklistedIg"],
            }),
        ];
        const repository = fake<IndicatorRepository>({ getForDataSets: () => success(indicators) });

        const result = await new GetDataSetIndicatorsUseCase(repository)
            .execute(dataSet, context)
            .toPromise();

        expect(result.map(indicator => indicator.id)).toEqual(["yes", "assigned"]);
    });
});

describe("Programs", () => {
    it("GetProgramStages applies the rules, then filters for display", async () => {
        const stage = createStage({
            sections: [
                {
                    id: "section1",
                    name: "S",
                    dataElements: [
                        createStageDataElement({ id: "de1" }),
                        createStageDataElement({ id: "legacy", groupIds: ["legacyDeg"] }),
                    ],
                },
            ],
        });
        const rule = createRule({
            name: "Rule",
            actions: [createAction({ type: "ASSIGN", dataElement: { id: "de1", name: "D" } })],
        });
        const repository = fake<ProgramRepository>({ getStages: () => success([stage]) });

        const [result] = await new GetProgramStagesUseCase(repository)
            .execute(program, [rule], settings, { showLegacy: false, legacyOptionIds: new Set() })
            .toPromise();
        const elements = result?.sections[0]?.dataElements;

        expect(elements?.map(element => element.id)).toEqual(["de1"]);
        expect(elements?.[0]?.calculation).toEqual({ type: "programRule", ruleNames: ["Rule"] });
    });

    it("GetProgramRelatedIndicators keeps visible ones referencing the program", async () => {
        const indicators = [
            createIndicator({ id: "byProgram", numerator: formula("D{p1.de}") }),
            createIndicator({ id: "byIndicator", denominator: formula("I{pi1}") }),
            createIndicator({ id: "other", numerator: formula("D{p2.de}") }),
        ];
        const repository = fake<IndicatorRepository>({ getForPrograms: () => success(indicators) });

        const result = await new GetProgramRelatedIndicatorsUseCase(repository)
            .execute(program, [createProgramIndicator({ id: "pi1" })], context)
            .toPromise();

        expect(result.map(indicator => indicator.id)).toEqual(["byProgram", "byIndicator"]);
    });

    it("GetProgramRuleVariables fills the associated rules", async () => {
        const variable = ProgramRuleVariable.create({
            name: "var",
            sourceType: "",
            stage: undefined,
            dataElement: undefined,
            attribute: undefined,
            associatedRuleNames: [],
        });
        const rule = createRule({
            name: "Assigns",
            actions: [createAction({ type: "ASSIGN", content: "#{var}" })],
        });
        const repository = fake<ProgramRepository>({ getRuleVariables: () => success([variable]) });

        const [result] = await new GetProgramRuleVariablesUseCase(repository)
            .execute(program, [rule])
            .toPromise();

        expect(result?.associatedRuleNames).toEqual(["Assigns"]);
    });

    it("GetProgramResources makes no request without resources", async () => {
        const getResources = vi.fn(() => success([]));
        const getEventResources = vi.fn(() => success([]));
        const repository = fake<ProgramRepository>({ getResources, getEventResources });

        await new GetProgramResourcesUseCase(repository).execute(program).toPromise();

        expect(getResources).not.toHaveBeenCalled();
    });

    it("GetProgramResources lists the chosen ones first, without repeating them", async () => {
        const resource = (id: string, type: ProgramResource["type"]): ProgramResource => ({
            id,
            name: id,
            description: "",
            type,
        });
        const repository = fake<ProgramRepository>({
            getResources: () =>
                success([resource("dash", "dashboards"), resource("chart", "eventCharts")]),
            getEventResources: () =>
                success([resource("chart", "eventCharts"), resource("report", "eventReports")]),
        });

        const resources = await new GetProgramResourcesUseCase(repository)
            .execute({ ...program, resourceIds: ["dash", "chart"] })
            .toPromise();

        expect(resources.map(({ id }) => id)).toEqual(["dash", "chart", "report"]);
    });
});

describe("RefreshDossierConfigStatusUseCase", () => {
    const attribute = {
        id: "a",
        name: "serviceCode",
        dataSetAttribute: true,
        indicatorGroupAttribute: true,
    };

    const run = async (options: {
        attributes: (typeof attribute)[];
        healthServices: HealthService[];
        flag: boolean;
    }) => {
        const update = vi.fn(() => success(undefined));
        const useCase = new RefreshDossierConfigStatusUseCase(
            fake<AppSettingsRepository>({ update }),
            fake<AttributeRepository>({ getAll: () => success(options.attributes) }),
            fake<HealthServiceRepository>({
                getHealthServices: () => success(options.healthServices),
            })
        );
        const result = await useCase
            .execute(createSettings({ dossierConfigComplete: options.flag }))
            .toPromise();
        return { update, result };
    };

    it("saves true when everything passes and the flag was false", async () => {
        const { update, result } = await run({
            attributes: [attribute],
            healthServices: [healthService],
            flag: false,
        });

        expect(update).toHaveBeenCalledWith({ dossierConfigComplete: true });
        expect(result.changed).toBe(true);
    });

    it("saves false when another check fails, with the attribute check passing", async () => {
        const { update, result } = await run({
            attributes: [attribute],
            healthServices: [],
            flag: true,
        });

        expect(update).toHaveBeenCalledWith({ dossierConfigComplete: false });
        expect(result.changed).toBe(true);
    });

    it("does not write when the attribute check fails, so the flag can stay true", async () => {
        const { update, result } = await run({
            attributes: [],
            healthServices: [healthService],
            flag: true,
        });

        expect(update).not.toHaveBeenCalled();
        expect(result.changed).toBe(false);
    });

    it("does not write when nothing changes", async () => {
        const { update } = await run({
            attributes: [attribute],
            healthServices: [healthService],
            flag: true,
        });

        expect(update).not.toHaveBeenCalled();
    });
});

describe("SaveIndicatorVisualizationUseCase", () => {
    it("shares it with all users only if the group exists", async () => {
        const save = vi.fn((_visualization: IndicatorVisualization) => success("uid"));
        const useCase = new SaveIndicatorVisualizationUseCase(
            fake<UserGroupRepository>({ exists: () => success(false) }),
            fake<VisualizationRepository>({ save })
        );

        const id = await useCase.execute(createIndicator()).toPromise();

        expect(id).toBe("uid");
        expect(save.mock.calls[0]?.[0].sharedWithAllUsers).toBe(false);
    });
});
