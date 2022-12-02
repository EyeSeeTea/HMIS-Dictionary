/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/

dossierProgramsModule.controller("dossierProgramsMainController", [
    "$scope",
    "$translate",
    "$anchorScroll",
    "$sce",
    "dossiersProgramsFactory",
    "dossiersProgramStageSectionsFactory",
    "dossiersProgramIndicatorsFactory",
    "dossiersProgramExpressionFactory",
    function (
        $scope,
        $translate,
        $anchorScroll,
        $sce,
        dossiersProgramsFactory,
        dossiersProgramStageSectionsFactory,
        dossiersProgramIndicatorsFactory,
        dossiersProgramExpressionFactory
    ) {
        $("#dossiersPrograms").tab("show");

        /*
         *  @alias appModule.controller~addtoTOC
         *  @type {Function}
         *  @description Add an element (section or indicator group) to the Dossier Table Of Content (TOC)
         *  @todo Move to dossier controller
         */
        addtoTOC = function (toc, items, parent, type) {
            var index = toc.entries.push({
                parent: parent,
                children: items,
            });
        };

        /*
         *  @alias appModule.controller~scrollTo
         *  @type {Function}
         *  @description Scroll to an element when clicking on the Dossier Table Of Content (TOC)
         *  @todo Move to dossier controller
         *  @todo Take header into accounts
         */
        $scope.scrollTo = function (id) {
            $anchorScroll.yOffset = 66;
            $anchorScroll(id);
        };

        $scope.trustAsHtml = function (string) {
            return $sce.trustAsHtml(string);
        };

        //service = program
        //indicatorGroups = indicators
        //Datasets = dataElements
        startLoadingState(false);
        $scope.programs = dossiersProgramsFactory.get(function () {
            endLoadingState(false);
        });

        //Clear the TOC
        $scope.$watch("selectedProgram", function () {
            ping();
            $scope.toc = {
                entries: [],
            };
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramSectionController", [
    "$scope",
    "$q",
    "$translate",
    "dossiersProgramStageSectionsFactory",
    "Ping",
    function ($scope, $q, $translate, dossiersProgramStageSectionsFactory, Ping) {
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                //Query sections and data elements
                var stageSectionPromises = $scope.selectedProgram.programStages.map(function (stage) {
                    return dossiersProgramStageSectionsFactory.get({ programStageId: stage.id }).$promise;
                });

                $q.all(stageSectionPromises).then(function (stages) {
                    $scope.stages = stages.map(function (stage, index) {
                        var toc = {
                            displayName: "Stage: " + stage.displayName + (stage.repeatable ? " (Repeatable)" : ""),
                            id: stage.id,
                            index: index,
                        };
                        if (stage.programStageSections.length == 0) return createStageWithoutSections(stage, toc);
                        else return createStageWithSections(stage, toc);
                    });
                    endLoadingState(true);
                });
            }
        });

        function createStageWithoutSections(stage, toc) {
            // Line to make it compatible with view
            stage.programStageSections = [
                {
                    displayName: "Data Elements",
                    dataElements: stage.programStageDataElements.map(function (stageDataElement) {
                        return stageDataElement.dataElement;
                    }),
                },
            ];
            /**
        for (i = 0; i < resultStage.programStageSections[0].dataElements.length; ++i) {
            resultStage.programStageSections[0].dataElements[i] = resultStage.programStageSections[0].dataElements[i].dataElement;
        }
        */
            addtoTOC($scope.toc, null, toc, "programs");
            return stage;
        }

        function createStageWithSections(stage, toc) {
            addtoTOC($scope.toc, stage.programStageSections, toc, "programs");
            return stage;
        }
    },
]);

/** 
dossierProgramsModule.controller('dossiersProgramIndicatorController', ['$scope', 'dossiersProgramExpressionFactory', 'dossiersProgramFilterFactory', 'dossiersProgramIndicatorsFactory', function($scope, dossiersProgramExpressionFactory, dossiersProgramFilterFactory, dossiersProgramIndicatorsFactory) {

    $scope.indicators4TOC = {
        displayName: "Program indicators",
        id: "IndicatorGroupsContainer",
        index: 97
        };

    //gets the "readable" expressions for each indicator expression
    recursiveAssignExpression = function(i) {
        if (i >= $scope.indicators.programIndicators.length) return;
        dossiersProgramExpressionFactory.save({}, $scope.indicators.programIndicators[i].expression,
                         function (data) {
                            $scope.indicators.programIndicators[i].expression = data.description;
                            recursiveAssignExpression(i+1);
                        });

    }

    //gets the "readable" expressions for each indicator expression and filter
    recursiveAssignFilter = function(i) {
        if (i >= $scope.indicators.programIndicators.length) return;
        if (typeof($scope.indicators.programIndicators[i].filter) === 'undefined') {
            recursiveAssignFilter(i+1);
            return;
        }
        dossiersProgramFilterFactory.save({}, $scope.indicators.programIndicators[i].filter,
                         function (data) {
                            $scope.indicators.programIndicators[i].filter = data.description;
                            recursiveAssignFilter(i+1);
                        });

    }

    $scope.$watch('selectedProgram', function() {
        ping();
        if ($scope.selectedProgram) {
            startLoadingState(false);
            //get indicators, add to TOC
            $scope.indicators = dossiersProgramIndicatorsFactory.get({
                programId: $scope.selectedProgram.id
            }, function() {
                if ($scope.indicators.programIndicators.length > 0) {
                    addtoTOC($scope.toc,null,$scope.indicators4TOC,"Indicators");
                    recursiveAssignExpression(0);
                    recursiveAssignFilter(0);
                }
                endLoadingState(true);
            });
        }
    });

}]);
*/

dossierProgramsModule.controller("dossierProgramGlobalIndicatorController", [
    "$scope",
    "$translate",
    "programGlobalIndicators",
    "programIndicatorExpression",
    "Ping",
    function ($scope, $translate, programGlobalIndicators, programIndicatorExpression, Ping) {
        $scope.indicators4TOC = {
            displayName: "Indicators",
            id: "indicatorContainer",
            index: 98,
        };

        /*
         *  @name recursiveAssignNumerator
         *  @description Gets the "readable" expressions for each indicator numerator
         *  @scope dossierProgramGlobalIndicatorController
         */
        recursiveAssignNumerator = function (i) {
            if (i >= $scope.indicators.length) return;
            programIndicatorExpression.get(
                {
                    expression: $scope.indicators[i].numerator,
                },
                function (data) {
                    $scope.indicators[i].numerator = data.description;
                    recursiveAssignNumerator(i + 1);
                },
                true
            );
        };

        /*
         *  @name recursiveAssignNumerator
         *  @description Gets the "readable" expressions for each indicator denominator
         *  @scope dossierProgramGlobalIndicatorController
         */
        recursiveAssignDenominator = function (i) {
            if (i >= $scope.indicators.length) return;
            programIndicatorExpression.get(
                {
                    expression: $scope.indicators[i].denominator,
                },
                function (data) {
                    $scope.indicators[i].denominator = data.description;
                    recursiveAssignDenominator(i + 1);
                },
                true
            );
        };

        /*
         *  @name none
         *  @description Gets the indicator information, translates it and shows it
         *  @dependencies programGlobalIndicators, programIndicatorExpression
         *  @scope dossierProgramGlobalIndicatorController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                $scope.indicators = [];
                //Query indicator information

                $scope.allIndicators = programGlobalIndicators.get(function () {
                    endLoadingState(true);
                    $scope.allIndicators.indicators.forEach(function (indicator) {
                        const regex = /D{(\w+)\.?\w+?}/g;
                        const num = indicator.numerator;
                        const den = indicator.denominator;
                        let m;
                        console.debug($scope.selectedProgram.id);
                        while ((m = regex.exec(num)) !== null) {
                            // This is necessary to avoid infinite loops with zero-width matches
                            if (m.index === regex.lastIndex) {
                                regex.lastIndex++;
                            }
                            console.debug(m[1]);
                            if (m[1] == $scope.selectedProgram.id) {
                                if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                                return;
                            }
                        }

                        while ((m = regex.exec(den)) !== null) {
                            // This is necessary to avoid infinite loops with zero-width matches
                            if (m.index === regex.lastIndex) {
                                regex.lastIndex++;
                            }
                            if (m[1] == $scope.selectedProgram.id) {
                                if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                                return;
                            }
                        }
                    }, this);
                    if ($scope.indicators.length > 0) {
                        addtoTOC($scope.toc, null, $scope.indicators4TOC, "Indicators");
                        recursiveAssignNumerator(0);
                        recursiveAssignDenominator(0);
                    }
                });
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramTEAController", [
    "$scope",
    "$translate",
    "dossiersProgramTEAsFactory",
    function ($scope, $translate, dossiersProgramTEAsFactory) {
        $scope.trackedEntityAttributes4TOC = {
            displayName: "Tracked Entity Attributes",
            id: "trackedEntityAttributeContainer",
            index: 99,
        };

        /*
    @name none
    @description Gets the tracked entity attributes information, translates it and shows it
    @dependencies dossiersProgramTEAsFactory
    @scope dossiersProgramTEAController
    */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);

                dossiersProgramTEAsFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        $scope.trackedEntityAttributes = data.programTrackedEntityAttributes.map(teas => ({
                            ...teas.trackedEntityAttribute,
                        }));

                        if ($scope.trackedEntityAttributes.length > 0) {
                            addtoTOC($scope.toc, null, $scope.trackedEntityAttributes4TOC, "Tracked Entity Attributes");
                        }

                        endLoadingState(true);
                    }
                );
            }
        });
    },
]);


dossierProgramsModule.controller("dossiersProgramRuleController", [
    "$scope",
    "$translate",
    "dossiersProgramRulesFactory",
    "dossiersProgramRulesConditionDescription",
    function ($scope, $translate, dossiersProgramRulesFactory, dossiersProgramRulesConditionDescription) {
        $scope.rules4TOC = {
            displayName: "Program Rules",
            id: "RuleContainer",
            index: 121,
        };

        /* 
        @name recursiveAssignConditionDescription
        @description Gets the "readable" expressions for each program rule condition
        @scope dossiersProgramRuleController
        */
        recursiveAssignConditionDescription = function (i) {
            if (i >= $scope.rules.length) return;
            dossiersProgramRulesConditionDescription.save(
                { programId: $scope.selectedProgram.id },
                $scope.rules[i].condition,
                function (data) {
                    $scope.rules[i].condition = data.description;
                    recursiveAssignConditionDescription(i + 1);
                }
            );
        };

        /* 
        @name none
        @description Gets the program rules information, translates it and shows it
        @dependencies dossiersProgramRulesFactory, dossiersProgramRulesConditionDescription
        @scope dossiersProgramRuleController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);

                dossiersProgramRulesFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        $scope.rules = data.programRules.map(rule => ({ ...rule }));

                        if ($scope.rules.length > 0) {
                            addtoTOC($scope.toc, null, $scope.rules4TOC, "Program Rules");
                            recursiveAssignConditionDescription(0);
                        }

                        endLoadingState(true);
                    }
                );
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramRuleVariablesController", [
    "$scope",
    "$translate",
    "dossiersProgramRuleVariablesFactory",
    function ($scope, $translate, dossiersProgramRuleVariablesFactory) {
        $scope.ruleVariables4TOC = {
            displayName: "Program Rule Variables",
            id: "RuleVariablesContainer",
            index: 122,
        };

        /* 
        @name none
        @description Gets the program rules variables information, translates it and shows it
        @dependencies dossiersProgramRuleVariablesFactory
        @scope dossiersProgramRuleVariablesController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);

                dossiersProgramRuleVariablesFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        $scope.ruleVariables = data.programRuleVariables.map(rule => ({ ...rule }));
                        console.debug(`$scope.ruleVariables: ${JSON.stringify($scope.ruleVariables)}`);

                        if ($scope.ruleVariables.length > 0) {
                            addtoTOC($scope.toc, null, $scope.ruleVariables4TOC, "Program Rules");
                        }

                        endLoadingState(true);
                    }
                );
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramAnalysisController", [
    "$scope",
    "$q",
    "dossiersProgramEventReportFactory",
    "dossiersProgramEventChartFactory",
    function ($scope, $q, dossiersProgramEventReportFactory, dossiersProgramEventChartFactory) {
        $scope.eventReports4TOC = {
            displayName: "Public Event Reports",
            id: "EventReportsContainer",
            index: 120,
        };

        $scope.eventCharts4TOC = {
            displayName: "Public Event Charts",
            id: "EventChartsContainer",
            index: 121,
        };

        getEventReportUrl = function (eventReportId) {
            return dhisroot + "/dhis-web-event-reports/index.html?id=" + eventReportId;
        };

        getEventChartUrl = function (eventChartId) {
            return dhisroot + "/dhis-web-event-visualizer/index.html?id=" + eventChartId;
        };

        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                var analysisElementPromises = [
                    dossiersProgramEventReportFactory.get({ programId: $scope.selectedProgram.id }).$promise,
                    dossiersProgramEventChartFactory.get({ programId: $scope.selectedProgram.id }).$promise,
                ];

                $q.all(analysisElementPromises).then(function (data) {
                    $scope.eventReports = data[0].eventReports.map(function (eventReport) {
                        eventReport.url = getEventReportUrl(eventReport.id);
                        return eventReport;
                    });
                    $scope.eventCharts = data[1].eventCharts.map(function (eventChart) {
                        eventChart.url = getEventChartUrl(eventChart.id);
                        return eventChart;
                    });

                    if ($scope.eventReports.length > 0) {
                        addtoTOC($scope.toc, null, $scope.eventReports4TOC, "Event Reports");
                    }
                    if ($scope.eventCharts.length > 0) {
                        addtoTOC($scope.toc, null, $scope.eventCharts4TOC, "Event Charts");
                    }
                });
            }
        });
    },
]);
