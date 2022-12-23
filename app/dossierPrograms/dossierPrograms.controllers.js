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
    function ($scope, $window, dossiersProgramVisualizationTableFactory) {
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
                        if (tbl.visualizations[0].id) {
                            console.log("Updating Table");
                            payload.id = tbl.visualizations[0].id;
                            sharing.object.id = tbl.visualizations[0].id;
                            sharing.object.name = tbl.visualizations[0].name;

                            dossiersProgramVisualizationTableFactory.upd_table.query(
                                {
                                    uid: tbl.visualizations[0].id,
                                },
                                payload,
                                function (response) {
                                    dossiersProgramVisualizationTableFactory.upd_sharing.query(
                                        { uid: tbl.visualizations[0].id },
                                        sharing,
                                        function (res) { }
                                    );

                                    const uid = tbl.visualizations[0].id;

                                    $window.open(dhisroot + "/dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                                }
                            );
                        }
                    }

                    if (tbl.visualizations[0] == undefined) {
                        console.log("Creating Table");
                        dossiersProgramVisualizationTableFactory.set_table.query(payload, function (response) {
                            const uid = response.response.uid;
                            dossiersProgramVisualizationTableFactory.upd_sharing.query(
                                { uid: uid },
                                sharing,
                                function (res) { }
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

dossierProgramsModule.controller("dossierProgramRulesController2", [
    "$scope",
    "$q",
    "dossiersProgramRulesFactory2",
    "dossiersProgramRuleVariablesFactory2",
    function ($scope, $q, dossiersProgramRulesFactory, dossiersProgramRuleVariablesFactory2) {
        $scope.programRules4TOC = {
            displayName: "Program Rules",
            id: "programRulesAll",
            index: 101,
        };

        //creation d'une fonction récuperer les données des conditions des programRules
        getProgramRuleCondtion = function (programRuleCondition) {
            var i = 0;
            var tab = [];
            var rule = "";

            while (i < programRuleCondition.length) {
                if (programRuleCondition.charAt(i) == "{") {
                    var y = i;

                    while (programRuleCondition.charAt(y) != "}") {
                        y++;
                    }

                    //formation du mot
                    rule = programRuleCondition.substr(i + 1, y - i - 1);

                    var ok = true;

                    //On va comparer la nouvelle valeur avec les valeur deja dans le tableau
                    if (tab.length === 0) {
                        // Si le tableau n'a pas valeur, ajout automatique
                        ok = true;
                    } else {
                        //boucle qui parcours les valeurs du tableau pour savoir si la rule n'est pas en double
                        for (var j = 0; j <= tab.length; j++) {
                            if (tab[j] == rule) {
                                ok = false;
                            }
                        }
                    }

                    if (ok === true) {
                        tab.push(rule);
                    }
                }
                i++;
            }
            return tab; //retourne un tableau avec toutes les variables.
        };

        getDataElement = function (tabVariable, variableName, variableDataElement) {
            var tabDataElement = [];

            // Prendre le cas ou il y a plusieurs variable dans le tableau Array
            for (
                var i = 0;
                i < tabVariable.length;
                i++ // Index de la position de la variable dans programRules
            ) {
                var y = 0; //Index de la position de la variable dans programRuleVariables
                while (tabVariable[i] != variableName[y]) {
                    y++;
                    if (y > variableName.length) {
                        break;
                    }
                }
                tabDataElement.push(variableDataElement[y]);
            }
            return tabDataElement;
        };

        getOptions = function (tabVariable, variableName, variableOptions, variableOptionSetValue) {
            var tabOptions = [];
            var tabPosition = [];
            // Prendre le cas ou il y a plusieurs variable dans le tableau Array
            for (
                var i = 0;
                i < tabVariable.length;
                i++ // Index de la position de la variable dans programRules
            ) {
                var y = 0; //Index de la position de la variable dans programRuleVariables
                while (tabVariable[i] != variableName[y]) {
                    y++;
                    if (y > variableName.length) {
                        break;
                    }
                }
                tabOptions.push(variableOptions[y]);
                tabPosition.push(y);
            }

            for (var z = 0; z < tabPosition.length; z++) {
                if (variableOptionSetValue[tabPosition[z]] === true) {
                    var tabOptionsRegroup = [];
                    for (i = 0; i < tabOptions.length; i++) {
                        if (tabOptions[i] !== undefined) {
                            for (y = 0; y < tabOptions[i].length; y++) {
                                tabOptionsRegroup.push(tabOptions[i][y]);
                            }
                        }
                    }
                }
            }
            return tabOptionsRegroup;
        };

        //var programRulesVariablesPromises = [];
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                var programRulesPromises = [
                    dossiersProgramRulesFactory2.get({ programId: $scope.selectedProgram.id }).$promise,
                    dossiersProgramRuleVariablesFactory2.get({ programId: $scope.selectedProgram.id }).$promise,
                ];

                $q.all(programRulesPromises).then(function (
                    data // Le data est très important
                ) {
                    // From 1st promise : GET THE DATA TO CREATE A NEW TABLE
                    $scope.programRulesName = data[0].programRules.map(function (
                        programRule //data[0]
                    ) {
                        return programRule.name;
                    });

                    $scope.programRulesDescription = data[0].programRules.map(function (
                        programRule //data[0]
                    ) {
                        return programRule.description;
                    });

                    $scope.programRulesPriority = data[0].programRules.map(function (
                        programRule //data[0]
                    ) {
                        return programRule.priority;
                    });

                    $scope.programRulesVariable = data[0].programRules.map(function (
                        programRule //data[0]
                    ) {
                        programRule.variable = getProgramRuleCondtion(programRule.condition);
                        return programRule.variable;
                    });
                    //**** End 1st promise

                    // From 2nd promise : GET THE DATA
                    $scope.programRuleVariableName = data[1].programRuleVariables.map(function (programRuleVariable) {
                        return programRuleVariable.name;
                    });

                    $scope.programRuleVariablesDataElement = data[1].programRuleVariables.map(function (
                        programRuleVariableMap
                    ) {
                        return programRuleVariableMap.dataElement;
                    });

                    // End 2nd promise

                    //Map DataElement
                    $scope.programRuleVariablesValueTypes = $scope.programRuleVariablesDataElement.map(function (
                        programRuleVariablesValueType
                    ) {
                        if (programRuleVariablesValueType !== undefined) {
                            return programRuleVariablesValueType.valueType;
                        } else {
                            return "No value Type";
                        }
                    });

                    $scope.programRuleVariablesOptionSetValues = $scope.programRuleVariablesDataElement.map(function (
                        programRuleVariablesOptionSetValue
                    ) {
                        if (programRuleVariablesOptionSetValue !== undefined) {
                            return programRuleVariablesOptionSetValue.optionSetValue;
                        }
                    });

                    $scope.programRuleVariablesOptions = $scope.programRuleVariablesDataElement.map(function (
                        programRuleVariablesOption
                    ) {
                        if (programRuleVariablesOption !== undefined) {
                            if (programRuleVariablesOption.optionSetValue === true) {
                                return programRuleVariablesOption.optionSet.options;
                            }
                        }
                    });
                    // End Map DataElement

                    $scope.programRulesAll = tabFin();

                    function tabFin() {
                        var tab = [];
                        for (var i = 0; i < $scope.programRulesName.length; i++) {
                            tab.push({
                                name: $scope.programRulesName[i],
                                description: $scope.programRulesDescription[i],
                                priority: $scope.programRulesPriority[i],
                                variable: $scope.programRulesVariable[i],
                                dataElementValueType: getDataElement(
                                    $scope.programRulesVariable[i],
                                    $scope.programRuleVariableName,
                                    $scope.programRuleVariablesValueTypes
                                ),
                                options: getOptions(
                                    $scope.programRulesVariable[i],
                                    $scope.programRuleVariableName,
                                    $scope.programRuleVariablesOptions,
                                    $scope.programRuleVariablesOptionSetValues
                                ),
                            });
                        }
                        return tab;
                    }

                    if ($scope.programRulesAll.length > 0) {
                        addtoTOC($scope.toc, null, $scope.programRules4TOC, "Program Rules");
                    }
                });
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramRuleVariablesController", [
    "$scope",
    "$translate",
    "dossiersProgramRuleVariablesFactory2",
    function ($scope, $translate, dossiersProgramRuleVariablesFactory2) {
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

                dossiersProgramRuleVariablesFactory2.get(
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
