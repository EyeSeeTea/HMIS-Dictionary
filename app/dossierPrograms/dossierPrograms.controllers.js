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
    function ($scope, $translate, $anchorScroll, $sce, dossiersProgramsFactory) {
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
    "dossiersProgramStageCalcModeFactory",
    "Ping",
    function ($scope, $q, $translate, dossiersProgramStageSectionsFactory, dossiersProgramStageCalcModeFactory, Ping) {
        /*
         *  @name createStageWithoutSections
         *  @description Display stage data elements as a "phantom" stage and add stage to table of contents
         *  @scope dossiersProgramSectionController
         */
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

            addtoTOC($scope.toc, null, toc, "programs");
            return stage;
        }

        /*
         *  @name createStageWithSections
         *  @description Display stage sections data elements and add them to the table of contents
         *  @scope dossiersProgramSectionController
         */
        function createStageWithSections(stage, toc) {
            addtoTOC($scope.toc, stage.programStageSections, toc, "programs");
            return stage;
        }

        /*
         *  @name makeSectionsCalcMode
         *  @description Determine the "Calculation mode" of the stage sections data elements
         *  @scope dossiersProgramSectionController
         */
        function makeSectionsCalcMode(stage, assignedDEArray, hiddenSectionsArray) {
            stage.programStageSections.forEach(pss => {
                pss.dataElements.forEach(pssDE => {
                    assignedDEArray.forEach(adeArray => {
                        if (adeArray.ids.includes(pssDE.id)) {
                            pssDE.calcMode = { type: "programRule", name: adeArray.name };
                        } else if (!pssDE.calcMode) {
                            pssDE.calcMode = { type: "default" };
                        }
                    });
                });

                if (hiddenSectionsArray.includes(pss.id)) {
                    pss.dataElements.forEach(pssDE => {
                        if (pssDE.calcMode.type !== "programRule") {
                            pssDE.calcMode = { type: "other" };
                        }
                    });
                }
            });
        }

        /*
         *  @name makeStageCalcMode
         *  @description Determine the "Calculation mode" of the stage data elements
         *  @scope dossiersProgramSectionController
         */
        function makeStageCalcMode(stage, assignedDEArray) {
            stage.programStageDataElements.forEach(psde => {
                assignedDEArray.forEach(adeArray => {
                    if (adeArray.ids.includes(psde.dataElement.id)) {
                        psde.dataElement.calcMode = { type: "programRule", name: adeArray.name };
                    } else if (!psde.dataElement.calcMode) {
                        psde.dataElement.calcMode = { type: "default" };
                    }
                });
            });
        }

        /*
         *  @name none
         *  @description Gets the program stages information, translates it and shows it
         *  @dependencies dossiersProgramStageSectionsFactory, dossiersProgramStageCalcModeFactory
         *  @scope dossiersProgramSectionController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                //Query sections and data elements
                var stageSectionPromises = $scope.selectedProgram.programStages.map(function (stage) {
                    return dossiersProgramStageSectionsFactory.get({ programStageId: stage.id }).$promise;
                });

                $q.resolve(
                    dossiersProgramStageCalcModeFactory.get({ programId: $scope.selectedProgram.id }).$promise,
                    data => ($scope.programRules = data.programRules)
                ).then(() => {
                    $q.all(stageSectionPromises).then(function (stages) {
                        const hiddenSectionsArray = $scope.programRules.flatMap(pr => {
                            return pr.programRuleActions.flatMap(pra => {
                                if (pra.programRuleActionType === "HIDESECTION") {
                                    return pra.programStageSection.id;
                                } else {
                                    return [];
                                }
                            });
                        });

                        const assignedDEArray = $scope.programRules.flatMap(pr => {
                            const idArray = pr.programRuleActions.flatMap(pra => {
                                if (pra.programRuleActionType === "ASSIGN") {
                                    return pra.dataElement.id;
                                } else {
                                    return [];
                                }
                            });

                            return {
                                name: pr.name,
                                ids: idArray,
                            };
                        });

                        $scope.stages = stages.map(function (stage, index) {
                            var toc = {
                                displayName: "Stage: " + stage.displayName + (stage.repeatable ? " (Repeatable)" : ""),
                                id: stage.id,
                                index: index,
                            };
                            if (stage.programStageSections.length == 0) {
                                makeStageCalcMode(stage, assignedDEArray);
                                return createStageWithoutSections(stage, toc);
                            } else {
                                makeSectionsCalcMode(stage, assignedDEArray, hiddenSectionsArray);
                                return createStageWithSections(stage, toc);
                            }
                        });
                        endLoadingState(true);
                    });
                });
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramIndicatorController", [
    "$scope",
    "$rootScope",
    "dossiersProgramIndicatorExpressionFactory",
    "dossiersProgramIndicatorFilterFactory",
    "dossiersProgramIndicatorStagesFactory",
    "dossiersProgramIndicatorsFactory",
    function (
        $scope,
        $rootScope,
        dossiersProgramIndicatorExpressionFactory,
        dossiersProgramIndicatorFilterFactory,
        dossiersProgramIndicatorStagesFactory,
        dossiersProgramIndicatorsFactory
    ) {
        $scope.programIndicators4TOC = {
            displayName: "Program indicators",
            id: "IndicatorGroupsContainer",
            index: 97,
        };

        function getStageRef(filter) {
            const psdeRegex = /#{(\w+)\.\w+}/g;
            let stageRefArray = psdeRegex.exec(filter);
            if (stageRefArray && stageRefArray.length > 1) {
                stageRefArray.shift();
                return _.uniq($scope.programStages.filter(ps => stageRefArray.includes(ps.id)).flatMap(ps => ps.name));
            }
        }

        /*
         *  @name recursiveAssignExpression
         *  @description Gets the "readable" expressions for each indicator expression
         *  @scope dossiersProgramIndicatorController
         */
        function recursiveAssignExpression(i) {
            if (i >= $scope.programIndicators.length) return;
            dossiersProgramIndicatorExpressionFactory.save({}, $scope.programIndicators[i].expression, function (data) {
                $scope.programIndicators[i].expression = data.description.replaceAll("\\.", ".");
                recursiveAssignExpression(i + 1);
            });
        }

        /*
         *  @name recursiveAssignFilter
         *  @description Gets the "readable" expressions for each indicator filter
         *  @scope dossiersProgramIndicatorController
         */
        function recursiveAssignFilter(i) {
            if (i >= $scope.programIndicators.length) return;
            if (typeof $scope.programIndicators[i].filter === "undefined") {
                recursiveAssignFilter(i + 1);
                return;
            }
            $scope.programIndicators[i].stageRef = getStageRef($scope.programIndicators[i].filter);
            dossiersProgramIndicatorFilterFactory.save({}, $scope.programIndicators[i].filter, function (data) {
                $scope.programIndicators[i].filter = data.description.replaceAll("\\.", ".");
                recursiveAssignFilter(i + 1);
            });
        }

        /*
         *  @name none
         *  @description Gets the program indicator information, translates it and shows it
         *  @dependencies dossiersProgramIndicatorsFactory, dossiersProgramIndicatorStagesFactory
         *  @scope dossiersProgramIndicatorController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                //get indicators, add to TOC
                dossiersProgramIndicatorsFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        dossiersProgramIndicatorStagesFactory.get(
                            {
                                programId: $scope.selectedProgram.id,
                            },
                            function (psData) {
                                $scope.programStages = psData.programs[0].programStages.map(ps => ps);
                                if (data.programIndicators.length > 0) {
                                    $scope.programIndicators = data.programIndicators;
                                    addtoTOC($scope.toc, null, $scope.programIndicators4TOC, "Indicators");
                                    recursiveAssignExpression(0);
                                    recursiveAssignFilter(0);
                                    $rootScope.programIndicators = $scope.programIndicators.flatMap(pi => {
                                        return {
                                            id: pi.id,
                                            name: pi.displayName,
                                            expression: pi.expression,
                                        };
                                    });
                                    $rootScope.programStages = $scope.programStages;
                                }
                                endLoadingState(true);
                            }
                        );
                    }
                );
            }
        });
    },
]);

dossierProgramsModule.controller("dossierProgramGlobalIndicatorController", [
    "$scope",
    "$rootScope",
    "$translate",
    "dossiersProgramGlobalIndicatorsFactory",
    "dossiersProgramGlobalIndicatorExpressionFactory",
    "Ping",
    function (
        $scope,
        $rootScope,
        $translate,
        dossiersProgramGlobalIndicatorsFactory,
        dossiersProgramGlobalIndicatorExpressionFactory,
        Ping
    ) {
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
        function recursiveAssignNumerator(i) {
            if (i >= $scope.indicators.length) return;
            dossiersProgramGlobalIndicatorExpressionFactory.get(
                {
                    expression: $scope.indicators[i].numerator,
                },
                function (data) {
                    $scope.indicators[i].numerator = data.description;
                    recursiveAssignNumerator(i + 1);
                },
                true
            );
        }

        /*
         *  @name recursiveAssignNumerator
         *  @description Gets the "readable" expressions for each indicator denominator
         *  @scope dossierProgramGlobalIndicatorController
         */
        function recursiveAssignDenominator(i) {
            if (i >= $scope.indicators.length) return;
            dossiersProgramGlobalIndicatorExpressionFactory.get(
                {
                    expression: $scope.indicators[i].denominator,
                },
                function (data) {
                    $scope.indicators[i].denominator = data.description;
                    recursiveAssignDenominator(i + 1);
                },
                true
            );
        }

        /*
         *  @name parseExpression
         *  @description Parse numerator/denominator to identify references
         *  @scope dossierProgramGlobalIndicatorController
         */
        function parseExpression(indicator, item) {
            const regexArray = [/D{(\w+)\.?(\w+)?}/g, /A{(\w+)\.?\w+?}/g, /I{(\w+)}/g];
            let m;
            regexArray.forEach((regex, index) => {
                while ((m = regex.exec(item)) !== null) {
                    // This is necessary to avoid infinite loops with zero-width matches
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    if (index === 0) {
                        if (
                            (ps = $scope.programStages.find(ps => {
                                return ps.programStageDataElements.find(de => de.dataElement.id === m[2]) !== undefined;
                            }))
                        ) {
                            if (!indicator.stageRef) indicator.stageRef = [];
                            indicator.stageRef = indicator.stageRef.concat(ps.name);
                        }
                    }
                    if (index === 2) {
                        if ((pi = $scope.programIndicators.find(pi => pi.id === m[1]))) {
                            if (!indicator.stageRef) indicator.stageRef = [];
                            if ($scope.programStages)
                                indicator.stageRef = indicator.stageRef.concat(
                                    $scope.programStages.flatMap(ps =>
                                        pi.expression.search(ps.id) !== -1 ? ps.name : []
                                    )
                                );
                            if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                        }
                    }
                    if (m[1] == $scope.selectedProgram.id) {
                        if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                        return;
                    }
                }
            });
        }

        /*
         *  @name none
         *  @description Gets the indicator information, translates it and shows it
         *  @dependencies dossiersProgramGlobalIndicatorsFactory, dossiersProgramGlobalIndicatorExpressionFactory
         *  @scope dossierProgramGlobalIndicatorController
         */
        $scope.$watchGroup(["selectedProgram", "programIndicators", "programStages"], function () {
            ping();
            if ($scope.selectedProgram && $scope.programIndicators && $scope.programStages) {
                startLoadingState(false);
                $scope.indicators = [];

                //Query indicator information
                $scope.allIndicators = dossiersProgramGlobalIndicatorsFactory.get(function () {
                    endLoadingState(true);
                    $scope.allIndicators.indicators.forEach(function (indicator) {
                        const num = indicator.numerator;
                        const den = indicator.denominator;
                        parseExpression(indicator, num);
                        parseExpression(indicator, den);
                        if (indicator.stageRef) indicator.stageRef = _.uniq(indicator.stageRef);
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
    "dossiersProgramRulesActionsTemplateName",
    function (
        $scope,
        $translate,
        dossiersProgramRulesFactory,
        dossiersProgramRulesConditionDescription,
        dossiersProgramRulesActionsTemplateName
    ) {
        $scope.rules4TOC = {
            displayName: "Program Rules",
            id: "RuleContainer",
            index: 100,
        };

        /* 
        @name recursiveAssignConditionDescription
        @description Gets the "readable" expressions for each program rule condition
        @scope dossiersProgramRuleController
        */
        function recursiveAssignConditionDescription(i) {
            if (i >= $scope.rules.length || !$scope.rules[i].condition) return;
            dossiersProgramRulesConditionDescription.save(
                { programId: $scope.selectedProgram.id },
                $scope.rules[i].condition,
                function (data) {
                    $scope.rules[i].condition = data.description;
                    recursiveAssignConditionDescription(i + 1);
                }
            );
        }

        /* 
        @name assignProgramRulesActionsTemplateName
        @description Gets the template name for each templateUid
        @scope dossiersProgramRuleController
        */
        function assignProgramRulesActionsTemplateName() {
            const templateUid = $scope.rules.flatMap(rule =>
                rule.programRuleActions.flatMap(pra => pra.templateUid ?? [])
            );

            dossiersProgramRulesActionsTemplateName.get({ templateUid: templateUid }, function (data) {
                $scope.rules.forEach(rule => {
                    rule.programRuleActions.forEach(pra => {
                        if (pra.templateUid) {
                            pra.template = data.programNotificationTemplates.find(
                                itemToFind => itemToFind.id === pra.templateUid
                            )?.name;
                        }
                    });
                });
            });
        }

        /* 
        @name none
        @description Gets the program rules information, translates it and shows it
        @dependencies dossiersProgramRulesFactory, dossiersProgramRulesConditionDescription, dossiersProgramRulesActionsTemplateName
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
                            assignProgramRulesActionsTemplateName();
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
            index: 101,
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
            index: 102,
        };

        $scope.eventCharts4TOC = {
            displayName: "Public Event Charts",
            id: "EventChartsContainer",
            index: 103,
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
