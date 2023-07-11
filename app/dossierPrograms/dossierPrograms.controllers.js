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
    "dossiersProgramLoadingService",
    function (
        $scope,
        $q,
        $translate,
        dossiersProgramStageSectionsFactory,
        dossiersProgramStageCalcModeFactory,
        Ping,
        dossiersProgramDataService,
        dossiersProgramLoadingService
    ) {
        /*
         *  @name makeDEVisibility
         *  @description Determine if HIDEFIELD actions affecs the stage DEs
         *  @scope dossiersProgramSectionController
         */
        function makeDEVisibility(stageDataElementId, hiddenDEArray, stageId) {
            if (!hiddenDEArray) return [];

            return hiddenDEArray.flatMap(hiddenDE => {
                if (hiddenDE.ids.includes(stageDataElementId)) {
                    if (!hiddenDE.stageId || stageId === hiddenDE.stageId) {
                        return {
                            type: "HIDEFIELD",
                            name: hiddenDE.name,
                        };
                    }
                }

                return [];
            });
        }

        /*
         *  @name makeStageVisibility
         *  @description Determine if HIDESECTION actions affecs the section DEs
         *  @scope dossiersProgramSectionController
         */
        function makeSectionVisibility(stageSectionId, hiddenSectionsArray, stageId) {
            if (!hiddenSectionsArray) return [];

            return hiddenSectionsArray.flatMap(hs => {
                if (hs.ids.includes(stageSectionId)) {
                    if (!hs.stageId || stageId === hs.stageId) {
                        return {
                            type: "HIDESECTION",
                            name: hs.name,
                        };
                    }
                }

                return [];
            });
        }

        /*
         *  @name createStageWithoutSections
         *  @description Display stage data elements as a "phantom" stage and add stage to table of contents
         *  @scope dossiersProgramSectionController
         */
        function createStageWithoutSections(stage, toc, hiddenDEArray) {
            // Line to make it compatible with view
            stage.programStageSections = [
                {
                    displayName: "Data Elements",
                    dataElements: stage.programStageDataElements.map(stageDataElement => {
                        return {
                            ...stageDataElement.dataElement,
                            compulsory: stageDataElement.compulsory,
                            visibility: makeDEVisibility(stageDataElement.dataElement.id, hiddenDEArray, stage.id),
                        };
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
        function createStageWithSections(stage, toc, hiddenSectionsArray, hiddenDEArray) {
            stage.programStageSections.forEach(stageSection => {
                const sectionVisibility = makeSectionVisibility(stageSection.id, hiddenSectionsArray, stage.id);

                stageSection.dataElements.forEach(sectionDataElement => {
                    sectionDataElement.compulsory =
                        stage.programStageDataElements.find(psdeToFind => {
                            return psdeToFind.dataElement.id === sectionDataElement.id;
                        })?.compulsory ?? false;

                    sectionDataElement.visibility = makeDEVisibility(
                        sectionDataElement.id,
                        hiddenDEArray,
                        stage.id
                    ).concat(sectionVisibility);
                });
            });

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
                        if (adeArray.ids?.includes(pssDE.id) && adeArray.stageId === stage.id) {
                            if (!pssDE.calcMode || pssDE.calcMode.type === "default") {
                                pssDE.calcMode = { type: "programRule", names: [adeArray.name] };
                            } else {
                                pssDE.calcMode.names.push(adeArray.name);
                            }
                        } else if (!pssDE.calcMode) {
                            pssDE.calcMode = { type: "default" };
                        }
                    });

                    hiddenSectionsArray.forEach(hsArray => {
                        if (hsArray.ids.includes(pss.id)) {
                            if (pssDE.calcMode.type !== "programRule" && hsArray.allwaysHidden) {
                                pssDE.calcMode = { type: "other" };
                            }
                        }
                    });
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
                    if (adeArray.ids.includes(psde.dataElement.id) && adeArray.stageId === stage.id) {
                        if (!psde.dataElement.calcMode) {
                            if (!psde.dataElement.calcMode || psde.dataElement.calcMode.type === "default") {
                                psde.dataElement.calcMode = { type: "programRule", names: [adeArray.name] };
                            } else {
                                psde.dataElement.calcMode.names.push(adeArray.name);
                            }
                        }
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
                dossiersProgramLoadingService.loading.programs = false;
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
                            const idArray = pr.programRuleActions.flatMap(pra => {
                                if (pra.programRuleActionType === "HIDESECTION") {
                                    return pra.programStageSection.id;
                                } else {
                                    return [];
                                }
                            });

                            return {
                                name: pr.name,
                                stageId: pr.programStage?.id,
                                allwaysHidden: pr.condition === "true",
                                ids: idArray,
                            };
                        });

                        const assignedDEArray = $scope.programRules.flatMap(pr => {
                            const idArray = pr.programRuleActions.flatMap(pra => {
                                if (pra.programRuleActionType === "ASSIGN") {
                                    return pra?.dataElement?.id ? pra.dataElement.id : [];
                                } else {
                                    return [];
                                }
                            });

                            return {
                                name: pr.name,
                                stageId: pr.programStage?.id,
                                ids: idArray,
                            };
                        });

                        const hiddenDEArray = $scope.programRules.flatMap(pr => {
                            const idArray = pr.programRuleActions.flatMap(pra => {
                                if (pra.programRuleActionType === "HIDEFIELD") {
                                    return pra?.dataElement?.id ? pra.dataElement.id : [];
                                } else {
                                    return [];
                                }
                            });

                            return {
                                name: pr.name,
                                stageId: pr.programStage?.id,
                                ids: idArray,
                            };
                        });

                        $scope.stages = stages.map(function (stage, index) {
                            var toc = {
                                displayName: "Stage: " + stage.displayName + (stage.repeatable ? " (Repeatable)" : ""),
                                id: stage.id,
                                index: index + 1,
                            };
                            if (stage.programStageSections.length == 0) {
                                makeStageCalcMode(stage, assignedDEArray);
                                return createStageWithoutSections(stage, toc, hiddenDEArray);
                            } else {
                                makeSectionsCalcMode(stage, assignedDEArray, hiddenSectionsArray);
                                return createStageWithSections(stage, toc, hiddenSectionsArray, hiddenDEArray);
                            }
                        });
                        dossiersProgramDataService.data.stages = $scope.stages;
                        dossiersProgramLoadingService.loading.programs = true;
                        if (dossiersProgramLoadingService.done()) endLoadingState(true);
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
    "dossiersProgramLoadingService",
    function (
        $scope,
        $rootScope,
        dossiersProgramIndicatorExpressionFactory,
        dossiersProgramIndicatorFilterFactory,
        dossiersProgramIndicatorStagesFactory,
        dossiersProgramIndicatorsFactory,
        dossiersProgramDataService,
        dossiersProgramLoadingService
    ) {
        $scope.programIndicators4TOC = {
            displayName: "Program indicators",
            id: "IndicatorGroupsContainer",
            index: 97,
        };

        /*
         *  @name getStageNameById
         *  @description Gets the name of a stage matching their Id
         *  @scope dossiersProgramIndicatorController
         */
        function getStageNameById(id) {
            return dossiersProgramDataService.data.stages.find(stage => stage.id === id)?.displayName;
        }

        /*
         *  @name getAllCaptureGroups
         *  @description Gets all capture groups from a matchAll
         *  @scope dossiersProgramIndicatorController
         */
        function getAllCaptureGroups(filter, regex, array) {
            const idsArray = Array.from(filter.matchAll(regex), m => m[1]);
            if (idsArray.length > 0) {
                idsArray.forEach(psId => {
                    array.push(psId);
                });
            }
        }

        /*
         *  @name getStageRef
         *  @description Gets the stages referenced by the item.
         *  @scope dossiersProgramIndicatorController
         */
        function getStageRef(item) {
            let psIds = [];

            const psIdRegex = /V\{program_stage_id\} *== *'(\w{11})'/g;
            getAllCaptureGroups(item, psIdRegex, psIds);

            const psDeRegex = /#{(\w+)\.\w+}/g;
            getAllCaptureGroups(item, psDeRegex, psIds);

            const psEdRegex = /PS_EVENTDATE: *(\w{11})/g;
            getAllCaptureGroups(item, psEdRegex, psIds);

            psIds = _.uniq(psIds);

            const psNameRegex = /V\{program_stage_name\} *== *['"](.*?)['"]/g;
            const namesArray = Array.from(item.matchAll(psNameRegex), m => m[1]);

            const idsNamesArray = psIds.flatMap(id => {
                const psName = getStageNameById(id) ?? undefined;
                if (psName) {
                    return psName;
                } else {
                    return [];
                }
            });

            return _.uniq(idsNamesArray.concat(namesArray));
        }

        /*
         *  @name recursiveAssignExpression
         *  @description Gets the "readable" expressions for each indicator expression
         *  @scope dossiersProgramIndicatorController
         */
        function recursiveAssignExpression(i) {
            if (i >= $scope.programIndicators.length) return;

            const stageRef = $scope.programIndicators[i].stageRef;
            if (stageRef && stageRef.length > 0) {
                const newRef = getStageRef($scope.programIndicators[i].expression);
                $scope.programIndicators[i].stageRef = _.uniq($scope.programIndicators[i].stageRef.concat(newRef));
            } else {
                $scope.programIndicators[i].stageRef = getStageRef($scope.programIndicators[i].expression);
            }

            dossiersProgramIndicatorExpressionFactory.save({}, $scope.programIndicators[i].expression, function (data) {
                $scope.programIndicators[i].expression = data.description.replaceAll("\\.", ".");
                recursiveAssignExpression(i + 1);
            });
        }

        /*
         *  @name stageIdReplacer
         *  @description Function to get stage name from capture group
         *  @scope dossiersProgramIndicatorController
         */
        function stageIdReplacer(_, p1) {
            return `Program stage is ${getStageNameById(p1)}`;
        }

        /*
         *  @name getOptionNameById
         *  @description Gets the name of a DE option matching their code
         *  @scope dossiersProgramIndicatorController
         */
        function getOptionNameById(stageId, deId, index) {
            const stage = dossiersProgramDataService.data.stages.find(stage => stage.id === stageId);

            const de = stage.programStageSections.flatMap(section => {
                const de = section.dataElements.find(de => {
                    return de.id === deId;
                });
                return de ? de : [];
            })[0];

            return de.optionSet?.options?.find(opt => opt.code === index)?.displayName;
        }

        /*
         *  @name replacer
         *  @description Function to get stage name from capture group
         *  @scope dossiersProgramIndicatorController
         */
        function optionReplacer(match, p1, p2, p3, p4) {
            const optionName = getOptionNameById(p1, p2, p4);
            return optionName ? `#{${p1}.${p2}} ${p3} '${optionName}'` : match;
        }

        /*
         *  @name recursiveAssignFilter
         *  @description Gets the "readable" expressions for each indicator filter
         *  @scope dossiersProgramIndicatorController
         */
        function recursiveAssignFilter(i) {
            if (i >= $scope.programIndicators.length) {
                $rootScope.recursiveAssignFilterDone = true;
                return;
            }
            if (typeof $scope.programIndicators[i].filter === "undefined") {
                recursiveAssignFilter(i + 1);
                return;
            }

            const stageRef = $scope.programIndicators[i].stageRef;
            if (stageRef && stageRef.length > 0) {
                const newRef = getStageRef($scope.programIndicators[i].filter);
                $scope.programIndicators[i].stageRef = _.uniq($scope.programIndicators[i].stageRef.concat(newRef));
            } else {
                $scope.programIndicators[i].stageRef = getStageRef($scope.programIndicators[i].filter);
            }

            const regex = /#{(\w+)\.(\w+)} *?(!=|==) *?'(.*?)'/g;
            const newFilter = $scope.programIndicators[i].filter.replaceAll(regex, optionReplacer);
            $scope.programIndicators[i].filter = newFilter;

            dossiersProgramIndicatorFilterFactory.save({}, $scope.programIndicators[i].filter, function (data) {
                if (data.description.includes("Program stage id")) {
                    const regex = /Program stage id *== *['"](\w{11})['"]/g;
                    const newFilter = data.description.replaceAll(regex, stageIdReplacer);
                    $scope.programIndicators[i].filter = newFilter;
                } else {
                    $scope.programIndicators[i].filter = data.description.replaceAll("\\.", ".");
                }

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
                dossiersProgramLoadingService.loading.programIndicators = false;
                $rootScope.recursiveAssignFilterDone = false;

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
                                    $scope.programIndicators = data.programIndicators.map(pi => {
                                        pi.analyticsPeriodBoundaries = pi.analyticsPeriodBoundaries.map(bound => {
                                            const btTextArray = bound.boundaryTarget.split(":");
                                            const btId = btTextArray[1];
                                            if (btTextArray[0] === "PS_EVENTDATE" && btId && btId.length == 11) {
                                                const btStage = getStageNameById(btId) ?? btId;
                                                bound.boundaryTarget = `${btTextArray[0]} - ${btStage}}`;
                                            }
                                            return bound;
                                        });
                                        return pi;
                                    });
                                    addtoTOC($scope.toc, null, $scope.programIndicators4TOC, "Program Indicators");

                                    recursiveAssignExpression(0);
                                    recursiveAssignFilter(0);
                                    $rootScope.programIndicators = $scope.programIndicators;
                                    $rootScope.programStages = $scope.programStages;
                                    dossiersProgramDataService.data.programIndicators = $scope.programIndicators;
                                }
                                dossiersProgramLoadingService.loading.programIndicators = true;
                                if (dossiersProgramLoadingService.done()) endLoadingState(true);
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
    "dossiersProgramLoadingService",
    function (
        $scope,
        $rootScope,
        $translate,
        dossiersProgramGlobalIndicatorsFactory,
        dossiersProgramGlobalIndicatorExpressionFactory,
        Ping,
        dossiersProgramDataService,
        dossiersProgramLoadingService
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
            const regexArray = [/D{(\w{11})\.?(\w{11})?}/g, /A{(\w{11})\.?\w{11}?}/g, /I{(\w{11})}/g];
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
                            indicator.stageRef = _.uniq(indicator.stageRef.concat(ps.name));
                        }
                    }
                    if (index === 2) {
                        if ((pi = $scope.programIndicators.find(pi => pi.id === m[1]))) {
                            if (!indicator.stageRef) indicator.stageRef = [];
                            indicator.stageRef = _.uniq(indicator.stageRef.concat(pi.stageRef));
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
        $scope.$watchGroup(
            ["selectedProgram", "programIndicators", "programStages", "recursiveAssignFilterDone"],
            function () {
                ping();
                $scope.programIndicators = $rootScope.programIndicators;
                if (
                    $scope.selectedProgram &&
                    $scope.programIndicators &&
                    $scope.programStages &&
                    $rootScope.recursiveAssignFilterDone
                ) {
                    startLoadingState(false);
                    dossiersProgramLoadingService.loading.indicators = false;
                    $scope.indicators = [];

                    //Query indicator information
                    dossiersProgramGlobalIndicatorsFactory.get(function (data) {
                        $scope.allIndicators = data.indicators.forEach(function (indicator) {
                            const num = indicator.numerator;
                            const den = indicator.denominator;
                            parseExpression(indicator, num);
                            parseExpression(indicator, den);
                            if (indicator.stageRef) indicator.stageRef = _.uniq(indicator.stageRef);

                            indicator.rowItems = extractVisItemsFromInd(num, den);
                        });
                        if ($scope.indicators.length > 0) {
                            addtoTOC($scope.toc, null, $scope.indicators4TOC, "Indicators");
                            recursiveAssignNumerator(0);
                            recursiveAssignDenominator(0);
                            dossiersProgramDataService.data.indicators = $scope.indicators;
                        }
                        dossiersProgramLoadingService.loading.indicators = true;
                        if (dossiersProgramLoadingService.done()) endLoadingState(true);
                    });
                    // TODO: temp fix, need a way of signaling that dossiersProgramIndicatorController ended to dossierProgramGlobalIndicatorController
                } else if ($scope.selectedProgram.displayName === "BOAT Medical Linelist") {
                    dossiersProgramLoadingService.loading.indicators = true;
                    if (dossiersProgramLoadingService.done()) endLoadingState(true);
                }
            }
        );
    },
]);

dossierProgramsModule.controller("dossiersProgramTEAController", [
    "$scope",
    "$translate",
    "dossiersProgramTEAsFactory",
    "dossiersProgramTEAsRulesFactory",
    "dossiersProgramDataService",
    "dossiersProgramLoadingService",
    function (
        $scope,
        $translate,
        dossiersProgramTEAsFactory,
        dossiersProgramTEAsRulesFactory,
        dossiersProgramDataService,
        dossiersProgramLoadingService
    ) {
        $scope.trackedEntityAttributes4TOC = {
            displayName: "Tracked Entity Attributes",
            id: "trackedEntityAttributeContainer",
            index: 0,
        };

        /*
         *  @name makeTEAVisibility
         *  @description Determine if HIDEFIELD actions affecs the TEA
         *  @scope dossiersProgramTEAController
         */
        function makeTEAVisibility(teaId, hiddenTEAArray) {
            if (!hiddenTEAArray) return [];

            return hiddenTEAArray.flatMap(hiddenTEA => {
                if (hiddenTEA.trackedEntityAttribute?.id === teaId) {
                    return {
                        type: "HIDEFIELD",
                        name: hiddenTEA.name,
                    };
                }

                return [];
            });
        }

        /*
        @name none
        @description Gets the tracked entity attributes information, translates it and shows it
        @dependencies dossiersProgramTEAsFactory, dossiersProgramTEAsRulesFactory
        @scope dossiersProgramTEAController
        */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                dossiersProgramLoadingService.loading.trackedEntityAttributes = false;

                dossiersProgramTEAsFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        const teasIds = data.programTrackedEntityAttributes
                            .map(ptea => ptea.trackedEntityAttribute.id)
                            .join(",");
                        dossiersProgramTEAsRulesFactory.get(
                            {
                                programId: $scope.selectedProgram.id,
                                teasIds: teasIds,
                            },
                            function (rulesData) {
                                $scope.trackedEntityAttributes = data.programTrackedEntityAttributes.map(ptea => ({
                                    ...ptea.trackedEntityAttribute,
                                    mandatory: ptea.mandatory,
                                    visibility: makeTEAVisibility(
                                        ptea.trackedEntityAttribute.id,
                                        rulesData.programRules
                                    ),
                                }));

                                if ($scope.trackedEntityAttributes.length > 0) {
                                    addtoTOC(
                                        $scope.toc,
                                        null,
                                        $scope.trackedEntityAttributes4TOC,
                                        "Tracked Entity Attributes"
                                    );
                                    dossiersProgramDataService.data.trackedEntityAttributes =
                                        $scope.trackedEntityAttributes;
                                }
                                dossiersProgramLoadingService.loading.trackedEntityAttributes = true;
                                if (dossiersProgramLoadingService.done()) endLoadingState(true);
                            }
                        );
                    }
                );
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramRuleController", [
    "$scope",
    "$rootScope",
    "$translate",
    "dossiersProgramRulesFactory",
    "dossiersProgramRulesActionsTemplateName",
    "dossiersProgramDataService",
    "dossiersProgramLoadingService",
    function (
        $scope,
        $rootScope,
        $translate,
        dossiersProgramRulesFactory,
        dossiersProgramRulesActionsTemplateName,
        dossiersProgramDataService,
        dossiersProgramLoadingService
    ) {
        $scope.rules4TOC = {
            displayName: "Program Rules",
            id: "RuleContainer",
            index: 100,
        };

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
        @dependencies dossiersProgramRulesFactory, dossiersProgramRulesActionsTemplateName
        @scope dossiersProgramRuleController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                dossiersProgramLoadingService.loading.rules = false;
                $rootScope.programRulesDone = false;

                dossiersProgramRulesFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        $scope.rules = data.programRules.map(rule => ({ ...rule }));

                        if ($scope.rules.length > 0) {
                            addtoTOC($scope.toc, null, $scope.rules4TOC, "Program Rules");
                            assignProgramRulesActionsTemplateName();
                            dossiersProgramDataService.data.rules = $scope.rules;
                        }

                        $rootScope.programRulesDone = true;

                        dossiersProgramLoadingService.loading.rules = true;
                        if (dossiersProgramLoadingService.done()) endLoadingState(true);
                    }
                );
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramRuleVariablesController", [
    "$scope",
    "$rootScope",
    "$translate",
    "dossiersProgramRuleVariablesFactory",
    "dossiersProgramDataService",
    "dossiersProgramLoadingService",
    function (
        $scope,
        $rootScope,
        $translate,
        dossiersProgramRuleVariablesFactory,
        dossiersProgramDataService,
        dossiersProgramLoadingService
    ) {
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
        $scope.$watchGroup(["selectedProgram", "programRulesDone"], function () {
            ping();
            if ($scope.selectedProgram && $rootScope.programRulesDone) {
                startLoadingState(false);
                dossiersProgramLoadingService.loading.ruleVariables = false;

                dossiersProgramRuleVariablesFactory.get(
                    {
                        programId: $scope.selectedProgram.id,
                    },
                    function (data) {
                        $scope.ruleVariables = data.programRuleVariables.map(ruleVar => {
                            ruleVar.associatedProgramRules = dossiersProgramDataService.data.rules?.flatMap(rule => {
                                const actionMatch = rule.programRuleActions.filter(ruleAction => {
                                    const typeMatch = ruleAction.programRuleActionType === "ASSIGN";
                                    const varMatch = ruleAction.content === `#{${ruleVar.name}}`;
                                    return typeMatch && varMatch;
                                });

                                return actionMatch.length > 0 ? rule.name : [];
                            });

                            return { ...ruleVar };
                        });

                        if ($scope.ruleVariables.length > 0) {
                            addtoTOC($scope.toc, null, $scope.ruleVariables4TOC, "Program Rules");
                            dossiersProgramDataService.data.ruleVariables = $scope.ruleVariables;
                        }

                        dossiersProgramLoadingService.loading.ruleVariables = true;
                        if (dossiersProgramLoadingService.done()) endLoadingState(true);
                    }
                );
            }
        });
    },
]);

dossierProgramsModule.controller("dossiersProgramResourcesController", [
    "$scope",
    "$translate",
    "dossiersProgramDataService",
    "dossiersProgramResourcesAttributeFactory",
    "dossiersProgramResourcesElementsFactory",
    "dossiersProgramLoadingService",
    function (
        $scope,
        $translate,
        dossiersProgramDataService,
        dossiersProgramResourcesAttributeFactory,
        dossiersProgramResourcesElementsFactory,
        dossiersProgramLoadingService
    ) {
        $scope.resources4TOC = {
            displayName: "Program Resources",
            id: "ResourcesContainer",
            index: 102,
        };

        /*
         *  @name makeResourceLink
         *  @description generate link for resource from its ID
         *  @scope dossiersProgramResourcesController
         */
        function makeResourceLink(type, id) {
            const dashboards = "dhis-web-dashboard/index.html#/";
            const visualizations = "dhis-web-data-visualizer/index.html#/";
            const eventCharts = "dhis-web-event-visualizer/index.html?id=";
            const eventReports = "dhis-web-event-reports/index.html?id=";
            let typePath;

            switch (type) {
                case "dashboards":
                    typePath = dashboards;
                    break;
                case "visualizations":
                    typePath = visualizations;
                    break;
                case "eventCharts":
                    typePath = eventCharts;
                    break;
                case "eventReports":
                    typePath = eventReports;
                    break;
                default:
                    return undefined;
            }
            return dhisroot + typePath + id;
        }

        /*
         *  @name getTypeDisplayText
         *  @description make resource type display text
         *  @scope dossiersProgramResourcesController
         */
        function getTypeDisplayText(type) {
            switch (type) {
                case "dashboards":
                    return "Dashboards";
                case "visualizations":
                    return "Visualizations";
                case "eventCharts":
                    return "Event Charts";
                case "eventReports":
                    return "Event Reports";
                default:
                    return undefined;
            }
        }

        /* 
        @name none
        @description Gets the program rules variables information, translates it and shows it
        @dependencies dossiersProgramResourcesAttributeFactory
        @scope dossiersProgramResourcesController
         */
        $scope.$watch("selectedProgram", function () {
            ping();
            if ($scope.selectedProgram) {
                startLoadingState(false);
                dossiersProgramLoadingService.loading.resources = false;

                dossiersProgramResourcesAttributeFactory.get({ programId: $scope.selectedProgram.id }, function (data) {
                    const resourcesIDs = data.attributeValues
                        .find(attr => attr.attribute.code === "HMIS-Dict_Resources")
                        ?.value.split(";")
                        .flatMap(val => {
                            return val ? val.trim() : [];
                        });

                    dossiersProgramResourcesElementsFactory.get({ resourcesIDs: resourcesIDs }, function (resQryData) {
                        const resData = _.pick(resQryData, [
                            "dashboards",
                            "visualizations",
                            "eventReports",
                            "eventCharts",
                        ]);
                        const resources = [];

                        for (const [type, values] of Object.entries(resData)) {
                            values.map(value => {
                                const entry = {
                                    displayName: value.displayName,
                                    displayDescription: value.displayDescription,
                                    type: getTypeDisplayText(type),
                                    link: makeResourceLink(type, value.id),
                                };
                                resources.push(entry);
                            });
                        }

                        $scope.resources = resources;

                        if ($scope.resources.length > 0) {
                            addtoTOC($scope.toc, null, $scope.resources4TOC, "Resources");
                            dossiersProgramDataService.data.resources = $scope.resources;
                        }

                        dossiersProgramLoadingService.loading.resources = true;
                        if (dossiersProgramLoadingService.done()) endLoadingState(true);
                    });
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
        @name writeSheetHeader
        @description Writes sheet header from data object keys array
        @scope dossiersProgramExport
        */
        function writeSheetHeader(sheet, header) {
            header.forEach((item, index) => {
                sheet.cell(1, index + 1).value(item);
            });
        }

        /*
        @name writeSheetData
        @description Writes data object to sheet
        @scope dossiersProgramExport
        */
        function writeSheetData(sheet, data) {
            data.forEach((rowData, rowIndex) => {
                Object.entries(rowData).forEach(([_, value], cellIndex) => {
                    sheet.cell(rowIndex + 2, cellIndex + 1).value(value);
                });
            });
        }

        /* 
        @name makeDataElementsSheets
        @description Makes a sheet from Stage Section / Data Elements data
        @scope dossiersProgramExport
        */
        function makeDataElementsSheets(workbook, stages) {
            const data = stages.flatMap(stage => {
                return stage.programStageSections.flatMap(section => {
                    return section.dataElements.flatMap(de => {
                        return {
                            [translate("dos_Stage")]: stage.displayName,
                            [translate("dos_Section")]:
                                section.displayName === "Data Elements" ? "" : section.displayName,
                            [translate("dos_NameElement")]: de?.displayName,
                            [translate("dos_FormNameElement")]: de?.displayFormName,
                            [translate("dos_DescriptionElement")]: de?.displayDescription,
                            [translate("dos_ValueType")]: de?.valueType,
                            [translate("dos_CalculationMode")]: makeCalcMode(de?.calcMode),
                            [translate("dos_OptionSetName")]: de?.optionSet?.name,
                            [translate("dos_OptionSetOptions")]: joinAndTrim(
                                de?.optionSet?.options?.map(opt => opt.displayName)
                            ),
                        };
                    });
                });
            });

            const sheet = workbook.addSheet("Data Elements");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
        }

        /* 
        @name makeTEASheet
        @description Makes a sheet from Tracked Entity Attributes data
        @scope dossiersProgramExport
        */
        function makeTEASheet(workbook, trackedEntityAttributes) {
            const data = trackedEntityAttributes.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.name,
                    [translate("dos_FormNameElement")]: item?.formName,
                    [translate("dos_DescriptionElement")]: item?.description,
                    [translate("dos_AggregationType")]: item?.aggregationType,
                    [translate("dos_ValueType")]: item?.valueType,
                    [translate("dos_OptionSetName")]: item?.optionSet?.name,
                    [translate("dos_OptionSetOptions")]: joinAndTrim(
                        item?.optionSet?.options.map(option => option.name)
                    ),
                };
            });

            const sheet = workbook.addSheet("Tracked Entity Attributes");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
        }

        /* 
        @name makeIndicatorsSheet
        @description Makes a sheet from Indicators data
        @scope dossiersProgramExport
        */
        function makeIndicatorsSheet(workbook, indicators) {
            const data = indicators.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.displayName,
                    [translate("dos_DescriptionElement")]: item?.displayDescription,
                    [translate("dos_Type")]: item?.indicatorType?.displayName,
                    [translate("dos_NumeratorIndicator")]: item?.numerator,
                    [translate("dos_DenominatorIndicator")]: item?.denominator,
                    [translate("dos_StagesReferenced")]: joinAndTrim(item?.stageRef),
                };
            });

            const sheet = workbook.addSheet("Indicators");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
        }

        /* 
        @name makeProgramIndicatorsSheet
        @description Makes a sheet from Program Indicators data
        @scope dossiersProgramExport
        */
        function makeProgramIndicatorsSheet(workbook, programIndicators) {
            const data = programIndicators.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.displayName,
                    [translate("dos_DescriptionElement")]: item?.displayDescription,
                    [translate("dos_Filter")]: item?.filter,
                    [translate("dos_Calculation")]: item?.expression,
                    [translate("dos_AggregationType")]: item?.aggregationType,
                    [translate("dos_TypeOfProgramIndicator")]: item?.analyticsType,
                    [translate("dos_StagesReferenced")]: item?.stageRef?.join(" | "),
                    [translate("dos_Boundaries")]: joinAndTrim(
                        item?.analyticsPeriodBoundaries?.map(apb =>
                            Object.entries(_.omit(apb, "$$hashKey"))
                                .map(i => i.join(": "))
                                .join(", ")
                        )
                    ),
                };
            });

            const sheet = workbook.addSheet("Program Indicators");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
        }

        /* 
        @name makeRulesActionsSheet
        @description Makes a sheet from Program Rules Actions data
        @scope dossiersProgramExport
        */
        function makeRulesActionsSheet(workbook, rules) {
            const data = rules.flatMap(item => {
                if (!item.programRuleActions) return [];
                return item.programRuleActions?.map(pra => {
                    let fields = {};
                    switch (pra.programRuleActionType) {
                        case "ASSIGN":
                            fields.dos_ProgramRuleVariableAssign = pra?.content;
                            fields.dos_Expression = pra?.data;
                            break;
                        case "DISPLAYKEYVALUEPAIR":
                            fields.dos_StaticText = pra?.content;
                            fields.dos_Expression = pra?.data;
                            break;
                        case "DISPLAYTEXT":
                            fields.dos_KeyLabel = pra?.content;
                            fields.dos_Expression = pra?.data;
                            break;
                        case "ERRORONCOMPLETE":
                        case "SHOWERROR":
                        case "SHOWWARNING":
                        case "WARNINGONCOMPLETE":
                            fields.dos_StaticText = pra?.content;
                            fields.dos_Expression = pra?.data;
                            break;
                        case "HIDEFIELD":
                            fields.dos_CustomMessageBlankedField = pra?.content;
                            fields.dos_OptionToHide = pra?.option?.name;
                            break;
                        case "HIDEOPTIONGROUP":
                            fields.dos_OptionGroupToHide = pra?.option?.name;
                            break;
                        case "SCHEDULEMESSAGE":
                            fields.dos_DateToSendMessage = pra?.data;
                            break;
                        default:
                            break;
                    }

                    return {
                        [`${translate("dos_ProgramRule")} ${translate("dos_NameElement")}`]: item.name,
                        [translate("dos_Type")]: pra.programRuleActionType,
                        [translate("dos_DataElement")]: pra.dataElement?.name,
                        [translate("dos_TrackedEntityAttributes")]: pra?.trackedEntityAttribute?.name,
                        [translate("dos_ProgramRuleVariableAssign")]: fields.dos_ProgramRuleVariableAssign,
                        [translate("dos_Expression")]: fields.dos_Expression,
                        [translate("dos_StaticText")]: fields.dos_StaticText,
                        [translate("dos_KeyLabel")]: fields.dos_KeyLabel,
                        [translate("dos_CustomMessageBlankedField")]: fields.dos_CustomMessageBlankedField,
                        [translate("dos_OptionToHide")]: fields.dos_OptionToHide,
                        [translate("dos_OptionGroupToHide")]: fields.dos_OptionGroupToHide,
                        [translate("dos_DateToSendMessage")]: fields.dos_DateToSendMessage,
                        [translate("dos_DisplayWidget")]: pra?.location,
                        [translate("dos_OptionstageToHide")]: pra?.programStage?.name,
                        [translate("dos_OptionstageSectionToHide")]: pra?.programStageSection?.name,
                        [translate("dos_MessageTemplate")]: pra?.template,
                        [translate("dos_OptionGroupToShow")]: pra?.optionGroup?.name,
                    };
                });
            });

            const sheet = workbook.addSheet("Program Rules Actions");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
        }

        /* 
        @name makeRulesSheet
        @description Makes a sheet from Program Rules data
        @scope dossiersProgramExport
        */
        function makeRulesSheet(workbook, rules) {
            var data = rules.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.name,
                    [translate("dos_DescriptionElement")]: item?.description,
                    [translate("dos_ProgramStage")]: item?.programStage?.name,
                    [translate("dos_Condition")]: item?.condition,
                    [translate("dos_ActionsTypes")]: joinAndTrim(
                        item?.programRuleActions?.map(pra => pra.programRuleActionType)
                    ),
                };
            });

            const sheet = workbook.addSheet("Program Rules");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
        }

        /* 
        @name makeRuleVariablesSheet
        @description Makes a sheet from Program Rules Variables data
        @scope dossiersProgramExport
        */
        function makeRuleVariablesSheet(workbook, ruleVariables) {
            const data = ruleVariables.map(item => {
                return {
                    [translate("dos_NameElement")]: item?.name,
                    [translate("dos_SourceType")]: item?.programRuleVariableSourceType,
                    [translate("dos_ProgramStage")]: item?.programStage?.name,
                    [translate("dos_DataElement")]: item?.dataElement?.name,
                    [translate("dos_TrackedEntityAttributes")]: item?.trackedEntityAttribute?.name,
                };
            });

            const sheet = workbook.addSheet("Program Rules Variables");
            writeSheetHeader(sheet, Object.keys(data[0]));
            writeSheetData(sheet, data);
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
        @name downloadExcel
        @description download workbook blob
        @scope dossiersProgramExport
        */
        async function downloadExcel(workbook) {
            await workbook
                .outputAsync()
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.style.display = "none";
                    a.href = url;
                    a.download = makeFilename();
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                })
                .catch(() => console.debug("Download failed"));
        }

        /* 
        @name exportToExcel
        @description Exports program dossier to xlsx spreadsheet
        @scope dossiersProgramExport
        */
        $scope.exportToExcel = function () {
            $scope.$watchGroup(["selectedProgram", "dossiersProgramDataService"], async function () {
                ping();
                if ($scope.selectedProgram && $scope.button.clicked) {
                    const workbook = await XlsxPopulate.fromBlankAsync().then(workbook => {
                        for (const [key, value] of Object.entries(dossiersProgramDataService.data)) {
                            if (value === undefined) continue;
                            switch (key) {
                                case "stages":
                                    makeDataElementsSheets(workbook, value);
                                    break;
                                case "programIndicators":
                                    makeProgramIndicatorsSheet(workbook, value);
                                    break;
                                case "indicators":
                                    makeIndicatorsSheet(workbook, value);
                                    break;
                                case "trackedEntityAttributes":
                                    makeTEASheet(workbook, value);
                                    break;
                                case "rules":
                                    makeRulesSheet(workbook, value);
                                    makeRulesActionsSheet(workbook, value);
                                    break;
                                case "ruleVariables":
                                    makeRuleVariablesSheet(workbook, value);
                                    break;
                                default:
                            }
                        }
                        workbook.deleteSheet("Sheet1");
                        return workbook;
                    });

                    downloadExcel(workbook);

                    $scope.button.clicked = false;
                }
            });
        };
    },
]);
