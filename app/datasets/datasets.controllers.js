/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/

function isDatasetScopeActive(scope, datasetId) {
    return !scope.$$destroyed && (!datasetId || scope.selectedDataset?.id === datasetId);
}

/*
 *  @name datasetsMainController
 *  @description Clears the table of content when a data set is selected and adds the scrollto function
 */
datasetsModule.controller("datasetsMainController", [
    "$scope",
    "$anchorScroll",
    "datasetsFactory",
    "datasetsLinkFactory",
    "datasetsDataelementsFactory",
    "advancedUsersFactory",
    "layoutSettingsFactory",
    "datasetsLoadingService",
    function (
        $scope,
        $anchorScroll,
        datasetsFactory,
        datasetsLinkFactory,
        datasetsDataelementsFactory,
        advancedUsersFactory,
        layoutSettingsFactory,
        datasetsLoadingService
    ) {
        $("#datasets").tab("show");

        $scope.layoutSettings = {
            advancedUserGroups: ["LjRqO9XzQPs"],
            accesses: {
                sections: {
                    index: 0,
                    translationKey: "dos_Sections",
                    access: 2,
                    columns: {
                        name: { index: 0, translationKey: "dos_NameElement", access: 2 },
                        formName: { index: 1, translationKey: "dos_FormNameElement", access: 2 },
                        shortName: { index: 2, translationKey: "dos_ShortNameElement", access: 2 },
                        description: { index: 3, translationKey: "dos_DescriptionElement", access: 2 },
                        dataTypeElement: { index: 4, translationKey: "dos_DataTypeElement", access: 0 },
                        options: { index: 5, translationKey: "dos_Options", access: 0 },
                        categoryCombination: { index: 6, translationKey: "dos_CategoryCombination", access: 0 },
                    },
                },
                categoryCombinations: {
                    index: 1,
                    translationKey: "dos_CategoryCombinations",
                    access: 0,
                    columns: {
                        categoryCombination: { index: 0, translationKey: "dos_CategoryCombination", access: 0 },
                        categories: { index: 1, translationKey: "dos_Categories", access: 0 },
                        items: { index: 2, translationKey: "dos_Items", access: 0 },
                    },
                },
                indicators: {
                    index: 2,
                    translationKey: "dos_Indicators",
                    access: 2,
                    columns: {
                        name: { index: 0, translationKey: "dos_NameIndicator", access: 2 },
                        shortName: { index: 1, translationKey: "dos_ShortNameIndicator", access: 2 },
                        type: { index: 2, translationKey: "dos_Type", access: 2 },
                        numerator: { index: 3, translationKey: "dos_NumeratorIndicator", access: 2 },
                        numeratorDescription: {
                            index: 4,
                            translationKey: "dos_NumeratorIndicatorDescription",
                            access: 2,
                        },
                        denominator: { index: 5, translationKey: "dos_DenominatorIndicator", access: 2 },
                        denominatorDescription: {
                            index: 6,
                            translationKey: "dos_DenominatorIndicatorDescription",
                            access: 2,
                        },
                    },
                },
            },
        };

        const namespace = "datasets";

        layoutSettingsFactory.get
            .query({ view: namespace })
            .$promise.then(data => {
                /* Deep-merge over defaults so columns added in newer builds become visible
                   even when the persisted layoutSettings predate them. */
                $scope.layoutSettings = _.merge({}, $scope.layoutSettings, data.toJSON());
            })
            .catch(error => {
                /* If no sharing settings are found, create them */
                if (error.status === 404) {
                    layoutSettingsFactory.set.query(
                        { view: namespace },
                        JSON.stringify($scope.layoutSettings),
                        response => {
                            if (response.status === "OK") {
                                console.log("datasetsModule: Layout Settings created");
                            } else {
                                console.log("datasetsModule: Error creating Layout Settings");
                            }
                        }
                    );
                } else {
                    console.log("datasetsModule: Error getting Layout Settings");
                }
            });

        $scope.isAdvancedUser = false;

        $scope.$watch("layoutSettings", function () {
            advancedUsersFactory.isAdvancedUser($scope.layoutSettings.advancedUserGroups).query({}, function (data) {
                $scope.isAdvancedUser = data.isAdvancedUser;
                $scope.accesses = userAccesses($scope.layoutSettings.accesses, $scope.isAdvancedUser);
            });
        });

        /*
         *  @name addtoTOC
         *  @description Add an element (section or indicator group) to the Dossier Table Of Content (TOC)
         *  @scope datasetsMainController
         */
        addtoTOC = function (toc, items, parent, type) {
            if (type == "Data Set" && !$scope.accesses.sections) return;
            if (type == "Category combination" && !$scope.accesses.categoryCombinations) return;
            if (type == "Indicators" && !$scope.accesses.indicators) return;

            var index = toc.entries.push({
                parent: parent,
                children: items,
                type: type,
            });
            if (type == "Data Set") {
                toc.dataSets = true;
            } else if (type == "Indicator Group") {
                toc.indicatorGroups = true;
            }
        };

        /*
         *  @name $scope.scrollTo
         *  @description Scroll to an element when clicking on the Dossier Table Of Content (TOC)
         *  @scope datasetsMainController
         */
        $scope.scrollTo = function (id, yOffset) {
            $anchorScroll.yOffset = 66; //66;
            $anchorScroll(id);
        };

        startLoadingState(false);

        /*
         *  @name $scope.dataSets
         *  @description Gets the list of data sets
         *  @dependencies datasetsFactory
         *  @scope datasetsMainController
         */
        $scope.datasets = datasetsFactory.get({ blackList: $scope.blacklist_datasets }, function () {
            endLoadingState(true);
        });

        if (sessionStorage.getItem("dataSetName") !== null) {
            $scope.dataSetName = sessionStorage.getItem("dataSetName");
            sessionStorage.clear();

            $scope.datasets = datasetsLinkFactory.get({ displayName: $scope.dataSetName }, function () {
                endLoadingState(true);
            });
        }

        $scope.datasetDataElements = {};

        /*
         * @name none
         * @description Clear the table of content, get the dataset sections and data elements
         *  @dependencies datasetsDataelementsFactory
         * @scope datasetsMainController
         */
        $scope.$watch("selectedDataset", function () {
            ping();
            if ($scope.selectedDataset) {
                const datasetId = $scope.selectedDataset.id;
                $scope.categoryComboIDs = [];
                $scope.toc = {
                    entries: [],
                    dataSets: false,
                    indicatorGroups: false,
                };
                //digest is triggered before the variable is stored
                datasetsLoadingService.resetState();
                datasetsLoadingService.loading.dataElements = false;
                startLoadingState(false);
                var aux = datasetsDataelementsFactory.get(
                    {
                        datasetId: datasetId,
                    },
                    function () {
                        if (!isDatasetScopeActive($scope, datasetId)) return;
                        $scope.datasetDataElements = aux;
                        datasetsLoadingService.loading.dataElements = true;
                        if (datasetsLoadingService.done()) endLoadingState(true);
                    }
                );
            }
        });
    },
]);

/*
 *  @name dossiersSectionController
 *  @description Updates the TOC with sections
 */
datasetsModule.controller("datasetSectionController", [
    "$scope",
    function ($scope) {
        $scope.stages4TOC = {
            displayName: "",
            id: "sectionContainer",
            index: "0",
        };

        $scope.categoryCombo = [];

        /*
         * @name none
         * @description add the sections to the TOC, show them
         * @scope datasetsMainController
         */
        $scope.$watch("datasetDataElements", function () {
            ping();
            if (typeof $scope.datasetDataElements.dataSetElements != "undefined") {
                //initialize categoryCombo for datasetCategoryComboController
                $scope.datasetDataElements.sections.forEach((section, sectionIndex) => {
                    $scope.categoryCombo[sectionIndex] = [];
                    section.dataElements.forEach((dataElement, dataElementIndex) => {
                        const id = dataElement.id || dataElement.dataElement.id;
                        $scope.categoryCombo[sectionIndex][dataElementIndex] = $scope.getCategoryCombination(
                            id,
                            sectionIndex,
                            dataElementIndex
                        );
                    });
                });

                //if there are no sections rearrange/change TOC name
                if ($scope.datasetDataElements.sections.length == 0) $scope.showWithoutSections();
                else $scope.showWithSections();
            }
        });

        /*
         *  @name $scope.showWithoutSections
         *  @description Rearranges the data elements in case there were no sections in the data set so they can be shown in the view, adds it to the TOC
         *  @scope datasetsMainController
         */
        $scope.showWithoutSections = function () {
            $scope.stages4TOC.displayName = "Data elements";
            //line needed to reuse code of the ng-repeat on the view
            $scope.datasetDataElements.sections = [
                {
                    displayName: "Data Elements",
                    id: "DataElements",
                    dataElements: $scope.datasetDataElements.dataSetElements,
                },
            ];
            addtoTOC($scope.toc, null, $scope.stages4TOC, "Data Set");
        };

        /*
         *  @name $scope.dataSets
         *  @description Adds the sections to the TOC
         *  @scope datasetsMainController
         */
        $scope.showWithSections = function () {
            $scope.stages4TOC.displayName = "Sections";
            addtoTOC($scope.toc, $scope.datasetDataElements.sections, $scope.stages4TOC, "Data Set");
        };

        /*
         *  @name $scope.getCategoryCombination
         *  @description Gets the category combination for a data element, updates the array of categoryCombos
         *  @scope datasetsMainController
         */
        $scope.getCategoryCombination = function (id, sectionIndex, dataElementIndex) {
            var result;
            //search for overrides
            for (i = 0; i < $scope.datasetDataElements.dataSetElements.length; ++i) {
                if ($scope.datasetDataElements.dataSetElements[i].dataElement.id == id) {
                    result = $scope.datasetDataElements.dataSetElements[i].categoryCombo;
                    break;
                }
            }
            //if there wasn't an override
            if (typeof result == "undefined") {
                //search for normal combination
                result = $scope.datasetDataElements.sections[sectionIndex].dataElements[dataElementIndex].categoryCombo;
                //check without sections
                if (typeof result == "undefined")
                    result =
                        $scope.datasetDataElements.sections[sectionIndex].dataElements[dataElementIndex].dataElement
                            .categoryCombo;
            }
            var CCID = result.id;
            if ($scope.categoryComboIDs.indexOf(CCID) == -1) $scope.categoryComboIDs.push(CCID);
            return result;
        };
    },
]);

/*
 *  @name dossiersSectionController
 *  @description Gets the dataset data elements and updates the TOC with sections
 */
datasetsModule.controller("datasetCategoryComboController", [
    "$scope",
    "datasetsCategoryCombosFactory",
    "datasetsLoadingService",
    function ($scope, datasetsCategoryCombosFactory, datasetsLoadingService) {
        $scope.categoryCombos4TOC = {
            displayName: "Category combinations",
            id: "categoryComboContainer",
            index: "1",
        };

        /*
         *  @name none
         *  @description Gets the category combo information and shows it
         *  @dependencies datasetsCategoryCombosFactory
         *  @scope datasetCategoryComboController
         */
        $scope.$watch("datasetDataElements", function () {
            ping();
            if (typeof $scope.datasetDataElements.sections !== "undefined") {
                const datasetId = $scope.selectedDataset && $scope.selectedDataset.id;
                datasetsLoadingService.loading.categoryCombos = false;
                startLoadingState(false);
                //Query category combination information
                $scope.categoryCombos = datasetsCategoryCombosFactory.get(
                    {
                        ids: "id:in:" + "[" + $scope.categoryComboIDs.toString() + "]",
                    },
                    function () {
                        if (!isDatasetScopeActive($scope, datasetId)) return;
                        addtoTOC($scope.toc, null, $scope.categoryCombos4TOC, "Category combination");
                        datasetsLoadingService.loading.categoryCombos = true;
                        if (datasetsLoadingService.done()) endLoadingState(true);
                    },
                    true
                );
            }
        });
    },
]);

datasetsModule.controller("datasetsIndicatorsController", [
    "$scope",
    "datasetsIndicatorsFactory",
    "datasetsIndicatorExpressionFactory",
    "datasetsLoadingService",
    function ($scope, datasetsIndicatorsFactory, datasetsIndicatorExpressionFactory, datasetsLoadingService) {
        $scope.indicators4TOC = {
            displayName: "Indicators",
            id: "indicatorContainer",
            index: "2",
        };

        /*
         *  @name getUniqueExpressions
         *  @description Gets the unique expressions for a given field from the indicators, mapped to the indices that share them
         *  @scope datasetsIndicatorsController
         */
        function getUniqueExpressions(indicators, field) {
            const unique = {};
            indicators.forEach((indicator, index) => {
                const expression = indicator[field];
                if (!unique[expression]) {
                    unique[expression] = [];
                }
                unique[expression].push(index);
            });
            return unique;
        }

        /*
         *  @name updateIndicatorProgress
         *  @description Updates the loading spinner with the current indicator translation progress
         *  @scope datasetsIndicatorsController
         */
        function updateIndicatorProgress(index, total, datasetId) {
            if (!isDatasetScopeActive($scope, datasetId)) return;
            updateProgressMessage({
                message: "load_indicators",
                current: index,
                total: total,
            });
        }

        /*
         *  @name createIndicatorProgressTracker
         *  @description Creates a progress tracker for the indicator numerator/denominator translations
         *  @scope datasetsIndicatorsController
         */
        function createIndicatorProgressTracker(total, onDone, datasetId) {
            const progress = { done: 0, total: total };

            updateIndicatorProgress(0, progress.total, datasetId);

            return {
                step: function () {
                    if (!isDatasetScopeActive($scope, datasetId)) return;
                    progress.done += 1;
                    updateIndicatorProgress(progress.done, progress.total, datasetId);
                    if (progress.done >= progress.total) {
                        onDone();
                    }
                },
                finishIfEmpty: function () {
                    if (progress.total === 0 && isDatasetScopeActive($scope, datasetId)) {
                        onDone();
                    }
                },
            };
        }

        /*
         *  @name recursiveAssignNumerator
         *  @description Gets the "readable" expression for each unique indicator numerator, applying it to every indicator that shares it
         *  @scope datasetsIndicatorsController
         */
        function recursiveAssignNumerator(
            indicators,
            expressionMap,
            expressions,
            progressTracker,
            datasetId,
            currentIndex
        ) {
            if (currentIndex >= expressions.length) return;

            const expression = expressions[currentIndex];
            const indicatorIndices = expressionMap[expression];

            datasetsIndicatorExpressionFactory.save(
                {},
                expression,
                function (data) {
                    if (!isDatasetScopeActive($scope, datasetId)) return;
                    indicatorIndices.forEach(idx => {
                        indicators[idx].numerator = data.description;
                    });
                    progressTracker.step();
                    recursiveAssignNumerator(
                        indicators,
                        expressionMap,
                        expressions,
                        progressTracker,
                        datasetId,
                        currentIndex + 1
                    );
                },
                true
            );
        }

        /*
         *  @name recursiveAssignDenominator
         *  @description Gets the "readable" expression for each unique indicator denominator, applying it to every indicator that shares it
         *  @scope datasetsIndicatorsController
         */
        function recursiveAssignDenominator(
            indicators,
            expressionMap,
            expressions,
            progressTracker,
            datasetId,
            currentIndex
        ) {
            if (currentIndex >= expressions.length) return;

            const expression = expressions[currentIndex];
            const indicatorIndices = expressionMap[expression];

            datasetsIndicatorExpressionFactory.save(
                {},
                expression,
                function (data) {
                    if (!isDatasetScopeActive($scope, datasetId)) return;
                    indicatorIndices.forEach(idx => {
                        indicators[idx].denominator = data.description;
                    });
                    progressTracker.step();
                    recursiveAssignDenominator(
                        indicators,
                        expressionMap,
                        expressions,
                        progressTracker,
                        datasetId,
                        currentIndex + 1
                    );
                },
                true
            );
        }

        $scope.indicators = [];

        /*
         *  @name none
         *  @description Gets the indicator information, translates it and shows it
         *  @dependencies datasetsCategoryCombosFactory
         *  @scope datasetsIndicatorsController
         */
        $scope.$watch("datasetDataElements", function () {
            ping();
            if (typeof $scope.datasetDataElements.dataSetElements != "undefined") {
                const datasetId = $scope.selectedDataset && $scope.selectedDataset.id;
                datasetsLoadingService.loading.indicators = false;
                startLoadingState(false, { message: "load_indicators" });
                $scope.indicators = [];
                //Query indicator information
                $scope.allIndicators = datasetsIndicatorsFactory.get(function () {
                    if (!isDatasetScopeActive($scope, datasetId)) return;
                    const isAdmin = !!$scope.is_admin;
                    const filteredIndicators = $scope.allIndicators.indicators.filter(
                        indicator =>
                            !indicator.indicatorGroups.some(
                                ig =>
                                    $scope.blacklist_indicatorgroups.includes(ig.id) ||
                                    (!isAdmin && $scope.notInUse_indicatorGroups.includes(ig.id))
                            )
                    );
                    $scope.datasetDataElements.dataSetElements.forEach(function (dataElement) {
                        filteredIndicators.forEach(function (indicator) {
                            const regex = /#{(\w+)\.?\w+?}/g;
                            const num = indicator.numerator;
                            const den = indicator.denominator;
                            let m;
                            while ((m = regex.exec(num)) !== null) {
                                // This is necessary to avoid infinite loops with zero-width matches
                                if (m.index === regex.lastIndex) {
                                    regex.lastIndex++;
                                }
                                if (m[1] == dataElement.dataElement.id) {
                                    if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                                    return;
                                }
                            }

                            while ((m = regex.exec(den)) !== null) {
                                // This is necessary to avoid infinite loops with zero-width matches
                                if (m.index === regex.lastIndex) {
                                    regex.lastIndex++;
                                }
                                if (m[1] == dataElement.dataElement.id) {
                                    if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                                    return;
                                }
                            }
                        }, this);
                    }, this);
                    if ($scope.indicators.length > 0) {
                        addtoTOC($scope.toc, null, $scope.indicators4TOC, "Indicators");
                        const indicators = $scope.indicators;
                        const numeratorMap = getUniqueExpressions(indicators, "numerator");
                        const uniqueNumerators = Object.keys(numeratorMap);
                        const denominatorMap = getUniqueExpressions(indicators, "denominator");
                        const uniqueDenominators = Object.keys(denominatorMap);
                        const progressTracker = createIndicatorProgressTracker(
                            uniqueNumerators.length + uniqueDenominators.length,
                            function () {
                                if (!isDatasetScopeActive($scope, datasetId)) return;
                                datasetsLoadingService.loading.indicators = true;
                                if (datasetsLoadingService.done()) endLoadingState(true);
                            },
                            datasetId
                        );

                        recursiveAssignNumerator(
                            indicators,
                            numeratorMap,
                            uniqueNumerators,
                            progressTracker,
                            datasetId,
                            0
                        );
                        recursiveAssignDenominator(
                            indicators,
                            denominatorMap,
                            uniqueDenominators,
                            progressTracker,
                            datasetId,
                            0
                        );
                        progressTracker.finishIfEmpty();
                    } else {
                        datasetsLoadingService.loading.indicators = true;
                        if (datasetsLoadingService.done()) endLoadingState(true);
                    }
                });
            }
        });
    },
]);
