import { Repositories } from "$/CompositionRoot";
import { AppSettings } from "$/domain/entities/AppSettings";
import { DataSet } from "$/domain/entities/DataSet";
import { ExpressionDescription } from "$/domain/entities/ExpressionDescription";
import { Future } from "$/domain/entities/generic/Future";
import { HealthServiceTranslations } from "$/domain/entities/HealthServiceTranslations";
import { UserTestRepository } from "./UserTestRepository";

const success = <T>(value: T) => Future.success<Error, T>(value);

const empty = () => success([]);

/** Empty repositories, so tests only have to give the ones they care about. */
export function getTestRepositories(): Repositories {
    return {
        userRepository: new UserTestRepository(),
        userGroupRepository: { getAll: empty, exists: () => success(true) },
        appSettingsRepository: {
            get: () => success(emptySettings),
            update: () => success(undefined),
        },
        layoutSettingsRepository: {
            get: () => success(undefined),
            save: () => success(undefined),
        },
        sessionRepository: { isActive: () => success(true) },
        expressionRepository: {
            describe: (_kind, expression) =>
                success(ExpressionDescription.create({ result: { ok: true, text: expression } })),
        },
        healthServiceRepository: { getGroupSets: empty, getHealthServices: empty },
        attributeRepository: { getAll: empty },
        dossierRepository: {
            getDataSets: empty,
            getIndicatorGroups: empty,
            getSections: empty,
            getIndicators: empty,
        },
        healthServiceTextRepository: {
            getText: () => success(""),
            getTranslations: healthServiceId =>
                success(HealthServiceTranslations.create({ healthServiceId, translations: [] })),
            saveTranslations: () => success(undefined),
        },
        searchRepository: {
            getDataElements: empty,
            getPrograms: empty,
            getCategoryOptionCombos: empty,
            getProgramIndicators: empty,
            getIndicators: empty,
        },
        dataSetRepository: {
            getAll: empty,
            getAllInOrgUnits: empty,
            getByName: empty,
            get: id =>
                success(
                    DataSet.create({
                        id,
                        name: "",
                        description: "",
                        sections: [],
                        hasRealSections: false,
                        dataElementIds: [],
                    })
                ),
            getCategoryCombos: empty,
        },
        indicatorRepository: {
            getForIndicatorsScreen: empty,
            getForDataSets: empty,
            getForPrograms: empty,
        },
        formulaRepository: {
            getReferences: () => success({ names: new Map(), dataSetNames: new Map() }),
        },
        programRepository: {
            getAll: empty,
            getAllInOrgUnits: empty,
            getByName: empty,
            getStages: empty,
            getAttributes: empty,
            getIndicators: empty,
            getRules: empty,
            getRuleVariables: empty,
            getResources: empty,
            getEventResources: empty,
            getOptionIdsOfGroups: () => success(new Set()),
        },
        visualizationRepository: { save: () => success("visualizationId") },
        orgUnitRepository: { getAssigned: empty, getNames: empty, getUserRootIds: empty },
    };
}

const emptySettings = AppSettings.create({
    adminGroup: undefined,
    healthServiceGroupSet: undefined,
    dossierConfigComplete: false,
    blacklist: {
        dataElementGroupIds: [],
        dataSetIds: [],
        programIds: [],
        indicatorGroupIds: [],
        tag: "Blacklisted",
    },
    notInUse: { indicatorGroupIds: [], programIndicatorGroupIds: [], tag: "Not in Use" },
    legacy: { dataElementGroupIds: [], optionGroupIds: [] },
    limitSelectorsToUserOrgUnits: false,
});
