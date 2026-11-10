import { UserD2Repository } from "./data/repositories/UserD2Repository";
import { UserGroupD2Repository } from "./data/repositories/UserGroupD2Repository";
import { AppSettingsD2Repository } from "./data/repositories/AppSettingsD2Repository";
import { LayoutSettingsD2Repository } from "./data/repositories/LayoutSettingsD2Repository";
import { SessionD2Repository } from "./data/repositories/SessionD2Repository";
import { ExpressionD2Repository } from "./data/repositories/ExpressionD2Repository";
import { HealthServiceD2Repository } from "./data/repositories/HealthServiceD2Repository";
import { AttributeD2Repository } from "./data/repositories/AttributeD2Repository";
import { ConstantD2Repository } from "./data/repositories/ConstantD2Repository";
import { DossierD2Repository } from "./data/repositories/DossierD2Repository";
import { HealthServiceTextD2Repository } from "./data/repositories/HealthServiceTextD2Repository";
import { IndexedDbCache } from "./data/IndexedDbCache";
import { getMetadataSignature } from "./data/repositories/metadataSignature";
import { SearchCachedRepository } from "./data/repositories/SearchCachedRepository";
import { SearchD2Repository } from "./data/repositories/SearchD2Repository";
import { DataSetD2Repository } from "./data/repositories/DataSetD2Repository";
import { IndicatorD2Repository } from "./data/repositories/IndicatorD2Repository";
import { FormulaD2Repository } from "./data/repositories/FormulaD2Repository";
import { ProgramD2Repository } from "./data/repositories/ProgramD2Repository";
import { VisualizationD2Repository } from "./data/repositories/VisualizationD2Repository";
import { OrgUnitD2Repository } from "./data/repositories/OrgUnitD2Repository";
import { getTestRepositories } from "./data/repositories/testRepositories";
import { UserRepository } from "./domain/repositories/UserRepository";
import { UserGroupRepository } from "./domain/repositories/UserGroupRepository";
import { AppSettingsRepository } from "./domain/repositories/AppSettingsRepository";
import { LayoutSettingsRepository } from "./domain/repositories/LayoutSettingsRepository";
import { SessionRepository } from "./domain/repositories/SessionRepository";
import { ExpressionRepository } from "./domain/repositories/ExpressionRepository";
import { HealthServiceRepository } from "./domain/repositories/HealthServiceRepository";
import { AttributeRepository } from "./domain/repositories/AttributeRepository";
import { ConstantRepository } from "./domain/repositories/ConstantRepository";
import { DossierRepository } from "./domain/repositories/DossierRepository";
import { HealthServiceTextRepository } from "./domain/repositories/HealthServiceTextRepository";
import { SearchRepository } from "./domain/repositories/SearchRepository";
import { DataSetRepository } from "./domain/repositories/DataSetRepository";
import { IndicatorRepository } from "./domain/repositories/IndicatorRepository";
import { FormulaRepository } from "./domain/repositories/FormulaRepository";
import { ProgramRepository } from "./domain/repositories/ProgramRepository";
import { VisualizationRepository } from "./domain/repositories/VisualizationRepository";
import { OrgUnitRepository } from "./domain/repositories/OrgUnitRepository";
import { CheckSessionUseCase } from "./domain/usecases/CheckSessionUseCase";
import { DescribeExpressionsUseCase } from "./domain/usecases/DescribeExpressionsUseCase";
import { DescribeIndicatorsUseCase } from "./domain/usecases/DescribeIndicatorsUseCase";
import { DescribeProgramIndicatorsUseCase } from "./domain/usecases/DescribeProgramIndicatorsUseCase";
import { GetAdminOptionsUseCase } from "./domain/usecases/GetAdminOptionsUseCase";
import { GetAppSettingsUseCase } from "./domain/usecases/GetAppSettingsUseCase";
import { GetCategoryCombosUseCase } from "./domain/usecases/GetCategoryCombosUseCase";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { GetDataSetUseCase } from "./domain/usecases/GetDataSetUseCase";
import { GetDataSetIndicatorsUseCase } from "./domain/usecases/GetDataSetIndicatorsUseCase";
import { GetDataSetsUseCase } from "./domain/usecases/GetDataSetsUseCase";
import { GetFormulaBreakdownUseCase } from "./domain/usecases/GetFormulaBreakdownUseCase";
import { GetHealthServiceContentUseCase } from "./domain/usecases/GetHealthServiceContentUseCase";
import { GetHealthServiceTextUseCase } from "./domain/usecases/GetHealthServiceTextUseCase";
import { GetHealthServicesUseCase } from "./domain/usecases/GetHealthServicesUseCase";
import { GetLayoutSettingsUseCase } from "./domain/usecases/GetLayoutSettingsUseCase";
import { GetLegacyOptionIdsUseCase } from "./domain/usecases/GetLegacyOptionIdsUseCase";
import { GetProgramAttributesUseCase } from "./domain/usecases/GetProgramAttributesUseCase";
import { GetProgramIndicatorsUseCase } from "./domain/usecases/GetProgramIndicatorsUseCase";
import { GetProgramRelatedIndicatorsUseCase } from "./domain/usecases/GetProgramRelatedIndicatorsUseCase";
import { GetOrgUnitTreeUseCase } from "./domain/usecases/GetOrgUnitTreeUseCase";
import { GetProgramResourcesUseCase } from "./domain/usecases/GetProgramResourcesUseCase";
import { GetProgramRuleVariablesUseCase } from "./domain/usecases/GetProgramRuleVariablesUseCase";
import { GetProgramRulesUseCase } from "./domain/usecases/GetProgramRulesUseCase";
import { GetProgramStagesUseCase } from "./domain/usecases/GetProgramStagesUseCase";
import { GetProgramsUseCase } from "./domain/usecases/GetProgramsUseCase";
import { GetSearchCatalogUseCase } from "./domain/usecases/GetSearchCatalogUseCase";
import { GetVisibleIndicatorsUseCase } from "./domain/usecases/GetVisibleIndicatorsUseCase";
import { RefreshDossierConfigStatusUseCase } from "./domain/usecases/RefreshDossierConfigStatusUseCase";
import { SaveHealthServiceTextUseCase } from "./domain/usecases/SaveHealthServiceTextUseCase";
import { SaveIndicatorVisualizationUseCase } from "./domain/usecases/SaveIndicatorVisualizationUseCase";
import { SaveLayoutSettingsUseCase } from "./domain/usecases/SaveLayoutSettingsUseCase";
import { UpdateAppSettingsUseCase } from "./domain/usecases/UpdateAppSettingsUseCase";
import { D2Api } from "./types/d2-api";

export type CompositionRoot = ReturnType<typeof getCompositionRoot>;

export type Repositories = {
    userRepository: UserRepository;
    userGroupRepository: UserGroupRepository;
    appSettingsRepository: AppSettingsRepository;
    layoutSettingsRepository: LayoutSettingsRepository;
    sessionRepository: SessionRepository;
    expressionRepository: ExpressionRepository;
    healthServiceRepository: HealthServiceRepository;
    attributeRepository: AttributeRepository;
    constantRepository: ConstantRepository;
    dossierRepository: DossierRepository;
    healthServiceTextRepository: HealthServiceTextRepository;
    searchRepository: SearchRepository;
    dataSetRepository: DataSetRepository;
    indicatorRepository: IndicatorRepository;
    formulaRepository: FormulaRepository;
    programRepository: ProgramRepository;
    visualizationRepository: VisualizationRepository;
    orgUnitRepository: OrgUnitRepository;
};

function getCompositionRoot(repositories: Repositories) {
    const describeExpressions = new DescribeExpressionsUseCase(repositories.expressionRepository);

    return {
        users: {
            getCurrent: new GetCurrentUserUseCase(repositories.userRepository),
        },
        app: {
            getSettings: new GetAppSettingsUseCase(repositories.appSettingsRepository),
            checkSession: new CheckSessionUseCase(repositories.sessionRepository),
        },
        layout: {
            get: new GetLayoutSettingsUseCase(repositories.layoutSettingsRepository),
            save: new SaveLayoutSettingsUseCase(
                repositories.layoutSettingsRepository,
                repositories.userGroupRepository
            ),
        },
        visualizations: {
            save: new SaveIndicatorVisualizationUseCase(
                repositories.userGroupRepository,
                repositories.visualizationRepository
            ),
        },
        dossiers: {
            getHealthServices: new GetHealthServicesUseCase(repositories.healthServiceRepository),
            getContent: new GetHealthServiceContentUseCase(repositories.dossierRepository),
            getText: new GetHealthServiceTextUseCase(repositories.healthServiceTextRepository),
            saveText: new SaveHealthServiceTextUseCase(repositories.healthServiceTextRepository),
        },
        search: {
            getCatalog: new GetSearchCatalogUseCase(
                repositories.healthServiceRepository,
                repositories.searchRepository
            ),
        },
        dataSets: {
            getAll: new GetDataSetsUseCase(
                repositories.dataSetRepository,
                repositories.orgUnitRepository
            ),
            get: new GetDataSetUseCase(repositories.dataSetRepository),
            getCategoryCombos: new GetCategoryCombosUseCase(repositories.dataSetRepository),
            getIndicators: new GetDataSetIndicatorsUseCase(repositories.indicatorRepository),
        },
        indicators: {
            getVisible: new GetVisibleIndicatorsUseCase(repositories.indicatorRepository),
            getFormulaBreakdown: new GetFormulaBreakdownUseCase(repositories.formulaRepository),
        },
        programs: {
            getAll: new GetProgramsUseCase(
                repositories.programRepository,
                repositories.orgUnitRepository
            ),
            getLegacyOptionIds: new GetLegacyOptionIdsUseCase(repositories.programRepository),
            getStages: new GetProgramStagesUseCase(repositories.programRepository),
            getAttributes: new GetProgramAttributesUseCase(repositories.programRepository),
            getIndicators: new GetProgramIndicatorsUseCase(repositories.programRepository),
            getRelatedIndicators: new GetProgramRelatedIndicatorsUseCase(
                repositories.indicatorRepository
            ),
            getRules: new GetProgramRulesUseCase(repositories.programRepository),
            getRuleVariables: new GetProgramRuleVariablesUseCase(repositories.programRepository),
            getResources: new GetProgramResourcesUseCase(repositories.programRepository),
        },
        orgUnits: {
            getTree: new GetOrgUnitTreeUseCase(repositories.orgUnitRepository),
        },
        admin: {
            getOptions: new GetAdminOptionsUseCase(
                repositories.healthServiceRepository,
                repositories.userGroupRepository,
                repositories.attributeRepository,
                repositories.constantRepository
            ),
            updateSettings: new UpdateAppSettingsUseCase(repositories.appSettingsRepository),
            refreshDossierConfigStatus: new RefreshDossierConfigStatusUseCase(
                repositories.appSettingsRepository,
                repositories.attributeRepository,
                repositories.healthServiceRepository
            ),
        },
        expressions: {
            describe: describeExpressions,
            describeIndicators: new DescribeIndicatorsUseCase(describeExpressions),
            describeProgramIndicators: new DescribeProgramIndicatorsUseCase(describeExpressions),
        },
    };
}

export function getWebappCompositionRoot(api: D2Api) {
    return getCompositionRoot({
        userRepository: new UserD2Repository(api),
        userGroupRepository: new UserGroupD2Repository(api),
        appSettingsRepository: new AppSettingsD2Repository(api),
        layoutSettingsRepository: new LayoutSettingsD2Repository(api),
        sessionRepository: new SessionD2Repository(api),
        expressionRepository: new ExpressionD2Repository(api),
        healthServiceRepository: new HealthServiceD2Repository(api),
        attributeRepository: new AttributeD2Repository(api),
        constantRepository: new ConstantD2Repository(api),
        dossierRepository: new DossierD2Repository(api),
        healthServiceTextRepository: new HealthServiceTextD2Repository(api),
        searchRepository: new SearchCachedRepository(
            new SearchD2Repository(api),
            getMetadataSignature(api),
            new IndexedDbCache()
        ),
        dataSetRepository: new DataSetD2Repository(api),
        indicatorRepository: new IndicatorD2Repository(api),
        formulaRepository: new FormulaD2Repository(api),
        programRepository: new ProgramD2Repository(api),
        visualizationRepository: new VisualizationD2Repository(api),
        orgUnitRepository: new OrgUnitD2Repository(api),
    });
}

export function getTestCompositionRoot(repositories: Partial<Repositories> = {}) {
    return getCompositionRoot({ ...getTestRepositories(), ...repositories });
}
