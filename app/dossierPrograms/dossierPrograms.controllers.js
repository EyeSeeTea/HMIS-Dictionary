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
    "dossiersProgramsLinkTestFactory",
    function ($scope, $translate, $anchorScroll, $sce, dossiersProgramsFactory, dossiersProgramsLinkTestFactory) {
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
        if (sessionStorage.getItem("programName") !== null) {
            $scope.programName = sessionStorage.getItem("programName");
            console.log($scope.programName);
            sessionStorage.clear();

            $scope.programs = dossiersProgramsLinkTestFactory.get({ displayName: $scope.programName }, function () {
                endLoadingState(false);
            });
        } else {
            $scope.programs = dossiersProgramsFactory.get(function () {
                endLoadingState(false);
            });
        }

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
    "dossiersProgramDataService",
    function (
        $scope,
        $q,
        $translate,
        dossiersProgramStageSectionsFactory,
        dossiersProgramStageCalcModeFactory,
        Ping,
        dossiersProgramDataService
    ) {
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

                    if (hiddenSectionsArray.includes(pss.id)) {
                        if (pssDE.calcMode.type !== "programRule") {
                            pssDE.calcMode = { type: "other" };
                        }
                    }
                });
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
                                    return [pra.programStageSection.id];
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
                        dossiersProgramDataService.data.stages = $scope.stages;
                        endLoadingState(true);
                    });
                });
            }
        });
    },
]);

dossierProgramsModule.controller("makeIndicatorVisualizations", [
    "$scope",
    "$window",
    "dossiersProgramVisualizationTableFactory",
    "dossiersProgramDataService",
    function ($scope, $window, dossiersProgramVisualizationTableFactory, dossiersProgramDataService) {
        $scope.getTable = function (name, id, rowItems) {
            const payload = {
                name: "TEST",
                showData: false,
                fixRowHeaders: false,
                numberType: "VALUE",
                legend: {
                    showKey: false,
                    style: "FILL",
                    strategy: "FIXED",
                },
                publicAccess: "--------",
                type: "PIVOT_TABLE",
                hideEmptyColumns: false,
                hideEmptyRows: false,
                subscribed: false,
                parentGraphMap: {},
                rowSubTotals: true,
                displayDensity: "NORMAL",
                displayDescription: "Created with HMIS Dictionary",
                regressionType: "NONE",
                completedOnly: false,
                cumulativeValues: false,
                colTotals: true,
                showDimensionLabels: true,
                sortOrder: 0,
                fontSize: "NORMAL",
                favorite: false,
                topLimit: 0,
                hideEmptyRowItems: "NONE",
                aggregationType: "DEFAULT",
                displayName: "TEST",
                hideSubtitle: false,
                description: "Created with HMIS Dictionary",
                fixColumnHeaders: false,
                percentStackedValues: false,
                colSubTotals: true,
                noSpaceBetweenColumns: false,
                showHierarchy: false,
                rowTotals: true,
                seriesKey: {
                    hidden: false,
                },
                digitGroupSeparator: "SPACE",
                hideTitle: false,
                regression: false,
                colorSet: "DEFAULT",
                skipRounding: false,

                fontStyle: {},
                access: {
                    read: true,
                    update: true,
                    externalize: true,
                    delete: true,
                    write: true,
                    manage: true,
                },
                reportingParams: {
                    organisationUnit: false,
                    reportingPeriod: false,
                    parentOrganisationUnit: false,
                    grandParentOrganisationUnit: false,
                },

                axes: [],
                translations: [],
                yearlySeries: [],
                interpretations: [],
                userGroupAccesses: [
                    {
                        access: "rw------",
                        userGroupUid: "epFY01iJN0Z",
                        displayName: "ALL USERS",
                        id: "epFY01iJN0Z",
                    },
                ],
                subscribers: [],
                userAccesses: [],
                favorites: [],
                columns: [
                    {
                        dimension: "pe",
                        items: [
                            {
                                id: "THIS_YEAR",
                            },
                        ],
                    },
                    {
                        dimension: "BtFXTpKRl6n",
                        items: [
                            {
                                id: "ALL_ITEMS",
                            },
                        ],
                    },
                ],
                filters: [
                    {
                        dimension: "ou",
                        items: [
                            {
                                id: "USER_ORGUNIT",
                            },
                        ],
                    },
                ],
                rows: [
                    {
                        dimension: "dx",
                        items: [
                            {
                                id: "DqqSJFWB392",
                            },
                            {
                                id: "qywsusOdy33",
                            },
                        ],
                    },
                ],
                series: [],
                outlierAnalysis: null,
                cumulative: false,
            };

            const sharing = {
                object: {
                    id: "LEP0WHTGYUe",
                    name: "name",
                    publicAccess: "--------",
                    externalAccess: false,
                    userGroupAccesses: [{ id: "epFY01iJN0Z", name: "ALL USERS", access: "rw------" }],
                },
            };

            let items = [{ id: id }];

            payload.name = name + " - " + id;
            payload.rows[0].items = rowItems ? items.concat(rowItems.map(id => ({ id: id }))) : items;

            $scope.table = dossiersProgramVisualizationTableFactory.get_table.query(
                {
                    filter: "name:eq:" + payload.name,
                },
                function (tbl) {
                    if (tbl && tbl.visualizations[0]) {
                        const visualizationId = tbl.visualizations[0].id;
                        if (visualizationId) {
                            console.log("Updating Table");
                            payload.id = visualizationId;
                            sharing.object.id = visualizationId;
                            sharing.object.name = tbl.visualizations[0].name;

                            dossiersProgramVisualizationTableFactory.upd_table.query(
                                {
                                    uid: visualizationId,
                                },
                                payload,
                                function (response) {
                                    dossiersProgramVisualizationTableFactory.upd_sharing.query(
                                        { uid: visualizationId },
                                        sharing,
                                        function (res) {}
                                    );

                                    const uid = visualizationId;

                                    $window.open(dhisroot + "/dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                                }
                            );
                        }
                    } else if (tbl.visualizations[0] === undefined) {
                        console.log("Creating Table");
                        dossiersProgramVisualizationTableFactory.set_table.query(payload, function (response) {
                            const uid = response.response.uid;
                            dossiersProgramVisualizationTableFactory.upd_sharing.query(
                                { uid: uid },
                                sharing,
                                function (res) {}
                            );
                            $window.open(dhisroot + "/dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                        });
                    }
                }
            );
        };
    },
]);

dossierProgramsModule.controller("dossiersProgramIndicatorController", [
    "$scope",
    "$rootScope",
    "dossiersProgramIndicatorExpressionFactory",
    "dossiersProgramIndicatorFilterFactory",
    "dossiersProgramIndicatorStagesFactory",
    "dossiersProgramIndicatorsFactory",
    "dossiersProgramDataService",
    function (
        $scope,
        $rootScope,
        dossiersProgramIndicatorExpressionFactory,
        dossiersProgramIndicatorFilterFactory,
        dossiersProgramIndicatorStagesFactory,
        dossiersProgramIndicatorsFactory,
        dossiersProgramDataService
    ) {
        $scope.programIndicators4TOC = {
            displayName: "Program indicators",
            id: "IndicatorGroupsContainer",
            index: 97,
        };

        /*
         *  @name getStageRef
         *  @description Gets the stages referenced by the filter.
         *  @scope dossiersProgramIndicatorController
         */
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
                                    dossiersProgramDataService.data.programIndicators = $scope.programIndicators;
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
    "dossiersProgramDataService",
    function (
        $scope,
        $rootScope,
        $translate,
        dossiersProgramGlobalIndicatorsFactory,
        dossiersProgramGlobalIndicatorExpressionFactory,
        Ping,
        dossiersProgramDataService
    ) {
        $scope.indicators4TOC = {
            displayName: "Indicators",
            id: "indicatorContainer",
            index: 98,
        };

        /*
         *  @name extractVisItemsFromInd
         *  @description Get the visualization aditional items IDs for numerator and denominator
         *  @scope dossierProgramGlobalIndicatorController
         */
        function extractVisItemsFromInd(numerator, denominator) {
            const de_num = extractVisItemsFromFormula(numerator);
            const de_den = extractVisItemsFromFormula(denominator);

            return de_num.concat(de_den);
        }

        /*
         *  @name extractVisItemsFromFormula
         *  @description Get the visualization aditional items IDs for expression
         *  @scope dossierProgramGlobalIndicatorController
         */
        function extractVisItemsFromFormula(formula) {
            let items = [];
            const regexArray = [/#{(\w+)}/g, /I{(\w+)}/g];

            regexArray.forEach(regex => {
                while ((results = regex.exec(formula))) {
                    items.push(results[1]);
                }
            });

            return items;
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

                        indicator.rowItems = extractVisItemsFromInd(num, den);
                    }, this);
                    if ($scope.indicators.length > 0) {
                        addtoTOC($scope.toc, null, $scope.indicators4TOC, "Indicators");
                        recursiveAssignNumerator(0);
                        recursiveAssignDenominator(0);
                        dossiersProgramDataService.data.indicators = $scope.indicators;
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
    "dossiersProgramDataService",
    function ($scope, $translate, dossiersProgramTEAsFactory, dossiersProgramDataService) {
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
                            dossiersProgramDataService.data.trackedEntityAttributes = $scope.trackedEntityAttributes;
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
    "dossiersProgramDataService",
    function (
        $scope,
        $translate,
        dossiersProgramRulesFactory,
        dossiersProgramRulesConditionDescription,
        dossiersProgramRulesActionsTemplateName,
        dossiersProgramDataService
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
                            dossiersProgramDataService.data.rules = $scope.rules;
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
    "dossiersProgramDataService",
    function ($scope, $translate, dossiersProgramRuleVariablesFactory, dossiersProgramDataService) {
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
                            dossiersProgramDataService.data.ruleVariables = $scope.ruleVariables;
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

dossierProgramsModule.controller("dossiersProgramExport", [
    "$scope",
    "$translate",
    "dossiersProgramDataService",
    "$filter",
    function ($scope, $translate, dossiersProgramDataService, $filter) {
        /* 
        @name translate
        @description $translate.instant() wrapper
        @scope dossiersProgramExport
        */
        function translate(tag) {
            return $translate.instant(tag);
        }

        /* 
        @name joinAndTrim
        @description join array and trim to 32767 chars (cell maximum)
        @scope dossiersProgramExport
        */
        function joinAndTrim(array) {
            if (array === undefined) return;

            let count = 0;
            let index = 0;
            for (const item of array) {
                count += item.length;
                if (count < 32733) {
                    // Separator chars
                    count += 3;
                    index += 1;
                } else {
                    return "Not all entries fit in the cell | " + array.slice(0, index).join(" | ");
                }
            }

            return array.join(" | ");
        }

        /* 
        @name makeCalcMode
        @description Makes Calculation Mode text from type
        @scope dossiersProgramExport
        */
        function makeCalcMode(calcMode) {
            if (calcMode?.type === "programRule") {
                return `${translate("dos_ProgramRule")}: ${calcMode.name}`;
            } else if (calcMode?.type === "other") {
                return `${translate("dos_Other")}`;
            } else {
                return `${translate("dos_DirectDataEntry")}`;
            }
        }

        /* 
        @name makeStageSectionWorksheet
        @description Makes a worksheet from Stage Section / Data Elements data
        @scope dossiersProgramExport
        */
        function makeStageSectionWorksheet(dataElements) {
            var data = dataElements?.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.displayName,
                    [translate("dos_FormNameElement")]: item?.displayFormName,
                    [translate("dos_DescriptionElement")]: item?.displayDescription,
                    [translate("dos_ValueType")]: item?.valueType,
                    [translate("dos_CalculationMode")]: makeCalcMode(item?.calcMode),
                    [translate("dos_OptionSetName")]: item?.optionSet?.name,
                    [translate("dos_OptionSetOptions")]: joinAndTrim(
                        item?.optionSet?.options?.map(opt => opt.displayName)
                    ),
                };
            });

            return XLSX.utils.json_to_sheet(data);
        }

        /* 
        @name makeStagesWorksheets
        @description Makes a worksheet from Stage Section / Data Elements data
        @scope dossiersProgramExport
        */
        function makeStagesWorksheets(stages, workbook) {
            stages.forEach((stage, stgIndex) => {
                stage.programStageSections.forEach((section, secIndex) => {
                    var worksheet = makeStageSectionWorksheet(section.dataElements);
                    XLSX.utils.book_append_sheet(workbook, worksheet, `Stage ${stgIndex + 1}-Section ${secIndex + 1}`);
                });
            });
        }

        /* 
        @name makeTEAWorksheet
        @description Makes a worksheet from Tracked Entity Attributes data
        @scope dossiersProgramExport
        */
        function makeTEAWorksheet(trackedEntityAttributes) {
            var data = trackedEntityAttributes.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.name,
                    [translate("dos_FormNameElement")]: item?.formName,
                    [translate("dos_Code")]: item?.code,
                    [translate("dos_DescriptionElement")]: item?.description,
                    [translate("dos_AggregationType")]: item?.aggregationType,
                    [translate("dos_ValueType")]: item?.valueType,
                    [translate("dos_OptionSetName")]: item?.optionSet?.name,
                    [translate("dos_OptionSetOptions")]: joinAndTrim(item?.optionSet?.options.map(option => option.name)),
                };
            });

            return XLSX.utils.json_to_sheet(data);
        }

        /* 
        @name makeIndicatorsWorksheet
        @description Makes a worksheet from Indicators data
        @scope dossiersProgramExport
        */
        function makeIndicatorsWorksheet(indicators) {
            var data = indicators.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.displayName,
                    [translate("dos_DescriptionElement")]: item?.displayDescription,
                    [translate("dos_Type")]: item?.indicatorType?.displayName,
                    [translate("dos_NumeratorIndicator")]: item?.numerator,
                    [translate("dos_NumeratorDescription")]: item?.numeratorDescription,
                    [translate("dos_DenominatorIndicator")]: item?.denominator,
                    [translate("dos_DenominatorDescription")]: item?.denominatorDescription,
                    [translate("dos_StagesReferenced")]: joinAndTrim(item?.stageRef),
                };
            });

            return XLSX.utils.json_to_sheet(data);
        }

        /* 
        @name makeProgramIndicatorsWorksheet
        @description Makes a worksheet from Program Indicators data
        @scope dossiersProgramExport
        */
        function makeProgramIndicatorsWorksheet(programIndicators) {
            var data = programIndicators.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.displayName,
                    [translate("dos_DescriptionElement")]: item?.displayDescription,
                    [translate("dos_Filter")]: item?.filter,
                    [translate("dos_Calculation")]: item?.expression,
                    [translate("dos_AggregationType")]: item?.aggregationType,
                    [translate("dos_TypeOfProgramIndicator")]: item?.analyticsType,
                    [translate("dos_StagesReferenced")]: item?.stageRef?.join(" | "),
                    [translate("dos_Boundaries")]: joinAndTrim(
                        item?.analyticsPeriodBoundaries?.map(apb => JSON.stringify(_.omit(apb, "$$hashKey")))
                    ),
                };
            });

            return XLSX.utils.json_to_sheet(data);
        }

        /* 
        @name makeRulesWorksheet
        @description Makes a worksheet from Program Rules data
        @scope dossiersProgramExport
        */
        function makeRulesWorksheet(rules) {
            var data = rules.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.name,
                    [translate("dos_DescriptionElement")]: item?.description,
                    [translate("dos_ProgramStage")]: item?.programStage?.name,
                    [translate("dos_Condition")]: item?.condition,
                    [translate("dos_ProgramRuleActions")]: joinAndTrim(
                        item?.programRuleActions?.map(pra => pra.programRuleActionType)
                    ),
                };
            });

            return XLSX.utils.json_to_sheet(data);
        }

        /* 
        @name makeRuleVariablesWorksheet
        @description Makes a worksheet from Program Rules Variables data
        @scope dossiersProgramExport
        */
        function makeRuleVariablesWorksheet(ruleVariables) {
            var data = ruleVariables.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.name,
                    [translate("dos_SourceType")]: item?.programRuleVariableSourceType,
                    [translate("dos_ProgramStage")]: item?.programStage?.name,
                    [translate("dos_DataElement")]: item?.dataElement?.name,
                    [translate("dos_TrackedEntityAttributes")]: item?.trackedEntityAttribute?.name,
                };
            });

            return XLSX.utils.json_to_sheet(data);
        }

        /* 
        @name makeFilename
        @description Makes xlsx file name from program name and timestamp
        @scope dossiersProgramExport
        */
        function makeFilename() {
            const filename = $scope.selectedProgram.displayName.replace(/[<>:"\\\/\|?\*]/g, "_");
            return `${filename}-${$filter("date")(Date.now(), "dd-MM-yy_H-mm")}.xlsx`;
        }

        /* 
        @name exportToExcel
        @description Exports program dossier to xlsx spreadsheet
        @scope dossiersProgramExport
        */
        $scope.exportToExcel = function () {
            $scope.$watchGroup(["selectedProgram", "dossiersProgramDataService"], function () {
                ping();
                if ($scope.selectedProgram && $scope.button.clicked) {
                    var workbook = XLSX.utils.book_new();

                    for (const [key, value] of Object.entries(dossiersProgramDataService.data)) {
                        if (value === undefined) continue;
                        switch (key) {
                            case "stages":
                                makeStagesWorksheets(value, workbook);
                                break;
                            case "programIndicators":
                                var worksheet = makeProgramIndicatorsWorksheet(value);
                                XLSX.utils.book_append_sheet(workbook, worksheet, "Program Indicators");
                                break;
                            case "indicators":
                                var worksheet = makeIndicatorsWorksheet(value);
                                XLSX.utils.book_append_sheet(workbook, worksheet, "Indicators");
                                break;
                            case "trackedEntityAttributes":
                                var worksheet = makeTEAWorksheet(value);
                                XLSX.utils.book_append_sheet(workbook, worksheet, "Tracked Entity Attributes");
                                break;
                            case "rules":
                                var worksheet = makeRulesWorksheet(value);
                                XLSX.utils.book_append_sheet(workbook, worksheet, "Program Rules");
                                break;
                            case "ruleVariables":
                                var worksheet = makeRuleVariablesWorksheet(value);
                                XLSX.utils.book_append_sheet(workbook, worksheet, "Program Rules Variables");
                                break;
                            default:
                        }
                    }

                    XLSX.writeFile(workbook, makeFilename());
                    $scope.button.clicked = false;
                }
            });
        };
    },
]);
