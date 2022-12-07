/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/
var qryPrograms = dhisUrl + "programs?fields=id,displayName,displayDescription,programStages[id]&paging=false";

var qryProgramStageSections =
    dhisUrl +
    "programStages/:programStageId?fields=id,displayName,repeatable,sortOrder,\
    programStageSections[id,displayName,dataElements[displayName,displayFormName,displayDescription,valueType,\
    optionSetValue,optionSet[name,options[displayName]]]],programStageDataElements[dataElement[displayName,displayFormName,\
    displayDescription,valueType,optionSetValue,optionSet[name,options[displayName]]]]&paging=false";

// Only public EventReports and EventCharts
var qryEventReports =
    dhisUrl + "eventReports?filter=program.id\\:eq\\::programId&fields=id,displayName,displayDescription&paging=false";
var qryEventCharts =
    dhisUrl + "eventCharts?filter=program.id\\:eq\\::programId&fields=id,displayName,displayDescription&paging=false";

dossierProgramsModule.factory("dossiersProgramsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryPrograms,
            {},
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

dossierProgramsModule.factory("dossiersProgramStageSectionsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramStageSections,
            {
                programStageId: "@programStageId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramIndicators =
    dhisUrl +
    "programs/:programId?fields=programIndicators[displayName,displayDescription,\
    filter,expression,aggregationType,analyticsType,\
    analyticsPeriodBoundaries[boundaryTarget,analyticsPeriodBoundaryType,offsetPeriods,offsetPeriodType]]&paging=false";

dossierProgramsModule.factory("dossiersProgramIndicatorsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramIndicators,
            {
                programId: "@programId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramIndicatorExpressions = dhisUrl + "programIndicators/expression/description";

dossierProgramsModule.factory("dossiersProgramExpressionFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramIndicatorExpressions,
            {},
            {
                save: {
                    method: "POST",
                    data: "@expression",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramIndicatorFilters = dhisUrl + "programIndicators/filter/description";

dossierProgramsModule.factory("dossiersProgramFilterFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramIndicatorFilters,
            {},
            {
                save: {
                    method: "POST",
                    data: "@filter",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramGlobalIndicators =
    dhisUrl +
    "indicators?fields=displayName,indicatorType[displayName],description,numerator,numeratorDescription,denominator,\
    denominatorDescription&paging=false";

datasetsModule.factory("programGlobalIndicators", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramGlobalIndicators,
            {},
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramIndicatorExpression = dhisUrl + "expressions/description?expression=:expression";

datasetsModule.factory("programIndicatorExpression", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramIndicatorExpression,
            {
                expression: "@expression",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

dossierProgramsModule.factory("dossiersProgramEventReportFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryEventReports,
            {
                programId: "@programId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

dossierProgramsModule.factory("dossiersProgramEventChartFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryEventCharts,
            {
                programId: "@programId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramTrackedEntityAttributes =
    dhisUrl +
    "programs/:programId?fields=programTrackedEntityAttributes[trackedEntityAttribute\
    [name,formName,code,description,optionSet[name,options[name]],valueType,aggregationType]]&paging=false";

dossierProgramsModule.factory("dossiersProgramTEAsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramTrackedEntityAttributes,
            {
                programId: "@programId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramRules =
    dhisUrl +
    "programRules?filter=program.id\\:eq\\::programId&fields=name,description,programStage[name],condition,\
    programRuleActions[programRuleActionType,dataElement[name],trackedEntityAttribute[name],option[name],\
    optionGroup[name],programStage[name],programStageSection[name],templateUid,content,data]&paging=false";

dossierProgramsModule.factory("dossiersProgramRulesFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramRules,
            {
                programId: "@programId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramRulesConditionDescription = dhisUrl + "programRules/condition/description?programId=:programId";

dossierProgramsModule.factory("dossiersProgramRulesConditionDescription", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramRulesConditionDescription,
            {
                programId: "@programId",
            },
            {
                save: {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain",
                    },
                    data: "@expression",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramRulesActionsTemplateName =
    dhisUrl + "programNotificationTemplates?filter=id\\:in\\:[:templateUid]&fields=id,name&paging=false";

dossierProgramsModule.factory("dossiersProgramRulesActionsTemplateName", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramRulesActionsTemplateName,
            {
                templateUid: "@templateUid",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);

var qryProgramRuleVariables =
    dhisUrl +
    "programRuleVariables?filter=program.id\\:eq\\::programId&fields=name,programRuleVariableSourceType,\
    programStage[name],dataElement[name],trackedEntityAttribute[name]&paging=false";

dossierProgramsModule.factory("dossiersProgramRuleVariablesFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramRuleVariables,
            {
                programId: "@programId",
            },
            {
                query: {
                    method: "GET",
                    isArray: false,
                },
            }
        );
    },
]);
