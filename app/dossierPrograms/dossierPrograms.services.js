/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/
var qryPrograms =
    dhisUrl +
    "programs?fields=" +
    ["id", "displayName", "displayDescription", "programStages[id]"].join(",") +
    "&paging=false";

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

var qryProgramStageSections =
    dhisUrl +
    "programStages/:programStageId?fields=" +
    [
        "id",
        "displayName",
        "displayDescription",
        "repeatable",
        "sortOrder",
        [
            "programStageSections[id",
            "displayName",
            "displayDescription",
            "dataElements[id",
            "displayName",
            "displayFormName",
            "displayDescription",
            "dataElementGroups[id]",
            "valueType",
            "optionSetValue",
            "optionSet[name",
            "options[code,displayName]]]]",
        ].join(","),
        [
            "programStageDataElements[compulsory,dataElement[id",
            "displayName",
            "displayFormName",
            "displayDescription",
            "dataElementGroups[id]",
            "valueType",
            "optionSetValue",
            "optionSet[name",
            "options[code,displayName]]]]",
        ].join(","),
    ].join(",") +
    "&paging=false";

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

var qryProgramRulesDataElements =
    dhisUrl +
    [
        "programRules?filter=program.id\\:eq\\::programId",
        "filter=programRuleActions.programRuleActionType\\:in\\:[ASSIGN,HIDESECTION,HIDEFIELD]",
        "fields=",
    ].join("&") +
    [
        "name",
        "programStage",
        "condition",
        "programRuleActions[programRuleActionType",
        "dataElement[id",
        "displayName]",
        "programStageSection[id",
        "displayName]",
        "trackedEntityAttribute",
    ].join(",") +
    "&paging=false";

dossierProgramsModule.factory("dossiersProgramStageCalcModeFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramRulesDataElements,
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

var qryProgramIndicators =
    dhisUrl +
    "programs/:programId?fields=" +
    "programIndicators[" +
    [
        "id",
        "displayName",
        "displayDescription",
        "filter",
        "expression",
        "aggregationType",
        "analyticsType",
        "analyticsPeriodBoundaries[boundaryTarget",
        "analyticsPeriodBoundaryType",
        "offsetPeriods",
        "offsetPeriodType]",
    ].join(",") +
    "]&paging=false";

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

var expressionHeaders = {
    "Content-Type": "text/plain",
};

var qryProgramIndicatorExpressions = dhisUrl + "programIndicators/expression/description";

dossierProgramsModule.factory("dossiersProgramIndicatorExpressionFactory", [
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
                    headers: expressionHeaders,
                },
            }
        );
    },
]);

var qryProgramIndicatorFilters = dhisUrl + "programIndicators/filter/description";

dossierProgramsModule.factory("dossiersProgramIndicatorFilterFactory", [
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
                    headers: expressionHeaders,
                },
            }
        );
    },
]);

var qryProgramIndicatorStages =
    dhisUrl +
    "programs?filter=id\\:eq\\::programId&fields=" +
    "programStages[" +
    ["id", "name", "programStageDataElements[dataElement[id]]"].join(",") +
    "]&paging=false";

dossierProgramsModule.factory("dossiersProgramIndicatorStagesFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramIndicatorStages,
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

var qryProgramGlobalIndicators =
    dhisUrl +
    "indicators?fields=" +
    [
        "id",
        "displayName",
        "displayDescription",
        "indicatorType[displayName]",
        "indicatorGroups[id]",
        "description",
        "numerator",
        "denominator",
    ].join(",") +
    "&paging=false";

dossierProgramsModule.factory("dossiersProgramGlobalIndicatorsFactory", [
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

var qryProgramGlobalIndicatorExpression = dhisUrl + "expressions/description?expression=:expression";

dossierProgramsModule.factory("dossiersProgramGlobalIndicatorExpressionFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramGlobalIndicatorExpression,
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

var qryProgramTrackedEntityAttributesRules =
    dhisUrl +
    [
        "programRules?filter=program.id\\:eq\\::programId",
        "filter=programRuleActions.programRuleActionType\\:in\\:[ASSIGN]",
        "filter=programRuleActions.trackedEntityAttribute.id\\:in\\:[:teasIds]",
        "fields=",
    ].join("&") +
    ["name", "trackedEntityAttribute"].join(",") +
    "&paging=false";

dossierProgramsModule.factory("dossiersProgramTEAsRulesFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramTrackedEntityAttributesRules,
            {
                programId: "@programId",
                teasIds: "@teasIds",
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
    "programs/:programId?fields=" +
    [
        "programTrackedEntityAttributes[mandatory,trackedEntityAttribute[id,name",
        "formName",
        "description",
        "optionSet[name",
        "options[name]]",
        "valueType",
        "aggregationType]]",
    ].join(",") +
    "&paging=false";

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
    "programRules?filter=program.id\\:eq\\::programId&fields=" +
    [
        "name",
        "description",
        "programStage[name]",
        "condition",
        "programRuleActions[programRuleActionType",
        "dataElement[name]",
        "trackedEntityAttribute[name]",
        "option[name]",
        "optionGroup[name]",
        "programStage[name]",
        "programStageSection[name]",
        "templateUid",
        "content",
        "data]",
    ].join(",") +
    "&paging=false";

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
    "programRuleVariables?filter=program.id\\:eq\\::programId&fields=" +
    [
        "name",
        "programRuleVariableSourceType",
        "programStage[name]",
        "dataElement[name]",
        "trackedEntityAttribute[name]",
    ].join(",") +
    "&paging=false";

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

var qryTables = dhisUrl + "visualizations";
var qryTableUpdate = dhisUrl + "visualizations/:uid";
var qrySharing = dhisUrl + "sharing?type=visualization&id=:uid";

searchModule.factory("dossiersProgramVisualizationTableFactory", [
    "$resource",
    function ($resource) {
        return {
            get_table: $resource(qryTables, {}, { query: { method: "GET", isArray: false } }),
            set_table: $resource(qryTables, {}, { query: { method: "POST", isArray: false } }),
            upd_table: $resource(qryTableUpdate, { uid: "@uid" }, { query: { method: "PUT", isArray: false } }),
            upd_sharing: $resource(qrySharing, { uid: "@uid" }, { query: { method: "PUT" } }),
        };
    },
]);

var qryTest =
    dhisUrl +
    "programs.json?filter=displayName\\:eq\\::displayName&fields=id,displayName,displayDescription,programStages[id]&paging=false";

dossierProgramsModule.factory("dossiersProgramsLinkTestFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryTest,
            {
                displayName: "@displayName",
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

var qryProgramResourcesAttribute =
    dhisUrl + "programs/:programId?fields=id,name,attributeValues[value,attribute[id,code]]";

dossierProgramsModule.factory("dossiersProgramResourcesAttributeFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramResourcesAttribute,
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

var qryProgramResourcesElements =
    dhisUrl + "metadata?filter=id\\:in\\:[:resourcesIDs]&fields=id,displayName,displayDescription";

dossierProgramsModule.factory("dossiersProgramResourcesElementsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryProgramResourcesElements,
            {
                resourcesIDs: "@resourcesIDs",
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

dossierProgramsModule.service("dossiersProgramDataService", function () {
    this.data = {
        stages: undefined,
        programIndicators: undefined,
        indicators: undefined,
        trackedEntityAttributes: undefined,
        rules: undefined,
        ruleVariables: undefined,
    };
});

dossierProgramsModule.service("dossiersProgramLoadingService", function () {
    this.loading = {
        programs: undefined,
        programIndicators: undefined,
        indicators: undefined,
        trackedEntityAttributes: undefined,
        rules: undefined,
        ruleVariables: undefined,
        resources: undefined,
    };

    this.resetState = function () {
        this.loading = {
            programs: undefined,
            programIndicators: undefined,
            indicators: undefined,
            trackedEntityAttributes: undefined,
            rules: undefined,
            ruleVariables: undefined,
            resources: undefined,
        };
    };

    this.done = function () {
        if (Object.values(this.loading).every(Boolean)) {
            this.resetState();
            return true;
        }
        return false;
    };
});
