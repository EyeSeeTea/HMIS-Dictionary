/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/
var qryPrograms = dhisUrl + 'programs.json?fields=id,displayName,displayDescription,programStages[id]&paging=false';

var qryProgramStageSections = dhisUrl + 'programStages/:programStageId.json?fields=id,displayName,description,repeatable,sortOrder,programStageSections[id,displayName,dataElements[displayName,displayFormName,displayDescription,valueType,optionSetValue,optionSet[options[displayName]]]],programStageDataElements[dataElement[displayName,displayFormName,displayDescription,valueType,optionSetValue,optionSet[options[displayName]]]]&paging=false';

var qryProgramIndicators = dhisUrl + 'programs/:programId.json?fields=programIndicators[displayName,displayDescription,expression,filter]';

var qryProgramIndicatorExpressions = dhisUrl + 'programIndicators/expression/description'
var qryProgramIndicatorFilters = dhisUrl + 'programIndicators/filter/description'

// Only public EventReports and EventCharts
var qryEventReports = dhisUrl + 'eventReports.json?filter=program.id\\:eq\\::programId&fields=id,displayName,displayDescription&paging=false'
var qryEventCharts = dhisUrl + 'eventCharts.json?filter=program.id\\:eq\\::programId&fields=id,displayName,displayDescription&paging=false'

dossierProgramsModule.factory('dossiersProgramsFactory', ['$resource',
    function($resource) {
        return $resource(qryPrograms, {}, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);


dossierProgramsModule.factory('dossiersProgramStageSectionsFactory', ['$resource',
    function($resource) {
        return $resource(qryProgramStageSections, {
            programStageId: '@programStageId'
        }, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);

//var qryProgramIndicators = dhisUrl + 'programs/:programId.json?fields=programIndicators[displayName,displayDescription,expression,filter]';
//
//dossierProgramsModule.factory('dossiersProgramIndicatorsFactory', ['$resource',
//    function($resource) {
//        return $resource(qryProgramIndicators, {
//            programId: '@programId'
//        }, {
//            query: {
//                method: 'GET',
//                isArray: false
//            }
//        });
//    }
//]);

var qryProgramIndicatorExpressions = dhisUrl + 'programIndicators/expression/description'

dossierProgramsModule.factory('dossiersProgramExpressionFactory', ['$resource',
    function($resource) {
        return $resource(qryProgramIndicatorExpressions, {
        }, {
            save: {
                method: 'POST',
                data: '@expression',
                isArray: false
            }
        });
    }
]);

var qryProgramIndicatorFilters = dhisUrl + 'programIndicators/filter/description'

dossierProgramsModule.factory('dossiersProgramFilterFactory', ['$resource',
    function($resource) {
        return $resource(qryProgramIndicatorFilters, {
        }, {
            save: {
                method: 'POST',
                data: '@filter',
                isArray: false
            }
        });
    }
]);


var qryProgramGlobalIndicators = dhisUrl + 'indicators?fields=displayName,indicatorType[displayName],description,numerator,numeratorDescription,denominator,denominatorDescription&paging=false'

datasetsModule.factory('programGlobalIndicators', ['$resource',
    function($resource) {
        return $resource(qryProgramGlobalIndicators, {}, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);

var qryProgramIndicatorExpression = dhisUrl + 'expressions/description?expression=:expression'

datasetsModule.factory('programIndicatorExpression', ['$resource',
    function($resource) {
        return $resource(qryProgramIndicatorExpression, {
            expression: '@expression'
        }, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);

dossierProgramsModule.factory('dossiersProgramEventReportFactory', ['$resource',
    function($resource) {
        return $resource(qryEventReports, {
            programId: '@programId'
        }, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);

dossierProgramsModule.factory('dossiersProgramEventChartFactory', ['$resource',
    function($resource) {
        return $resource(qryEventCharts, {
            programId: '@programId'
        }, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);

//Récuparation des informations realtives à la tâche #16 : ADD PROGRAM RULES TO THE METADATA DOCUMENTATION APP

//Requête de récupération des données :-----------------------------------------------------------------------------------------------
// Pour programRules
var qryProgramRules = dhisUrl + 'programRules.json?filter=program.id\\:eq\\::programId&fields=name,description,priority,condition&paging=false';

//Pour  programRuleVariable
var qryProgramRuleVariables = dhisUrl + 'programRuleVariables.json?filter=program.id\\:eq\\::programId&fields=name,dataElement[valueType,optionSetValue,optionSet[options[displayName]]]&paging=false';

//Récupération des données relatives à programRules
dossierProgramsModule.factory('dossiersProgramRulesFactory',['$resource',
    function($resource){
        return $resource(qryProgramRules,{
            programId: '@programId'
        }, {
            query : {
                method : 'GET',
                isArray: false
            }
        });
    }
]);

//Récuperation des données relatives à programRuleVariables
dossierProgramsModule.factory('dossiersProgramRuleVariablesFactory',['$resource',
    function($resource){
        return $resource(qryProgramRuleVariables,{
            programId: '@programId'
        }, {
            query : {
                method : 'GET',
                isArray: false
            }
        });
    }
]);

//Task 15: Link indicators to programs

//Requête de récupération des données :
var qryProgramIndicators = dhisUrl + 'programIndicators.json?filter=program.id\\:eq\\::programId&fields=displayName,description,expression,filter&paging=false';

dossierProgramsModule.factory('dossiersProgramIndicatorsFactory', ['$resource',
    function($resource) {
        return $resource(qryProgramIndicators, {
            programId: '@programId'
        }, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);

var qryTest = dhisUrl + 'programs.json?filter=displayName\\:eq\\::displayName&fields=id,displayName,displayDescription,programStages[id]&paging=false';

dossierProgramsModule.factory('dossiersProgramsLinkTestFactory', ['$resource',
    function($resource) {
        return $resource(qryTest, {
            displayName: '@displayName'
        }, {
            query: {
                method: 'GET',
                isArray: false
            }
        });
    }
]);



