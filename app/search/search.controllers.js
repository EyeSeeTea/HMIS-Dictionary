/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/

searchModule.controller("searchController", [
    "$window",
    "$scope",
    "$translate",
    "NgTableParams",
    "searchAllFactory",
    "searchTableFactory",
    "getTableFactory",
    "updateTable",
    "updateSharing",
    "getServices",
    "advancedUsersFactory",
    "layoutSettingsFactory",
    function (
        $window,
        $scope,
        $translate,
        NgTableParams,
        searchAllFactory,
        searchTableFactory,
        getTableFactory,
        updateTable,
        updateSharing,
        getServices,
        advancedUsersFactory,
        layoutSettingsFactory
    ) {
        $("#search").tab("show");

        $scope.layoutSettings = {
            advancedUserGroups: ["LjRqO9XzQPs"],
            accesses: {
                objectsBasics: {
                    index: 0,
                    translationKey: "srch_SelectColumns_objBasics",
                    access: 2,
                    columns: {
                        type: { index: 0, translationKey: "object_type", access: 2 },
                        name: { index: 1, translationKey: "object_name", access: 2 },
                        shortName: { index: 2, translationKey: "object_shortName", access: 2 },
                        form: { index: 3, translationKey: "object_form", access: 2 },
                        id: { index: 4, translationKey: "object_id", access: 0 },
                        code: { index: 5, translationKey: "object_code", access: 0 },
                        icd10: { index: 6, translationKey: "object_ICD10", access: 0 },
                    },
                },
                objectsDescriptions: {
                    index: 1,
                    translationKey: "srch_SelectColumns_objDescs",
                    access: 2,
                    columns: {
                        description: { index: 0, translationKey: "object_description", access: 2 },
                        numFormula: { index: 1, translationKey: "object_num_formula", access: 2 },
                        denFormula: { index: 2, translationKey: "object_den_formula", access: 2 },
                        filterFormula: { index: 3, translationKey: "object_flt_formula", access: 2 },
                        expFormula: { index: 4, translationKey: "object_exp_formula", access: 2 },
                    },
                },
                groupsBasics: {
                    index: 2,
                    translationKey: "srch_SelectColumns_grpBasics",
                    access: 2,
                    columns: {
                        name: { index: 0, translationKey: "objectGroup_name", access: 0 },
                        id: { index: 1, translationKey: "objectGroup_id", access: 0 },
                        code: { index: 2, translationKey: "objectGroup_code", access: 0 },
                    },
                },
                servicesBasics: {
                    index: 3,
                    translationKey: "srch_SelectColumns_servBasics",
                    access: 2,
                    columns: {
                        name: { index: 0, translationKey: "service_name", access: 2 },
                        id: { index: 1, translationKey: "service_id", access: 0 },
                        code: { index: 2, translationKey: "service_code", access: 0 },
                    },
                },
            },
        };

        const namespace = "search";

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
                                console.log("searchModule: Layout Settings created");
                            } else {
                                console.log("searchModule: Error creating Layout Settings");
                            }
                        }
                    );
                } else {
                    console.log("searchModule: Error getting Layout Settings");
                }
            });

        $scope.isAdvancedUser = false;

        $scope.$watch("layoutSettings", function () {
            advancedUsersFactory.isAdvancedUser($scope.layoutSettings.advancedUserGroups).query({}, function (data) {
                $scope.isAdvancedUser = data.isAdvancedUser;
                $scope.accesses = userAccesses($scope.layoutSettings.accesses, $scope.isAdvancedUser);
            });
        });

        if ($scope.show_dossiers) {
            console.debug("searchModule: Service set defined " + $scope.serviceSetUID);
            searchAllFactory.get_organisationUnitGroupSets.query(
                {
                    ougsUID: $scope.serviceSetUID,
                },
                function (response) {
                    var temp = {};
                    response.organisationUnitGroups.forEach(function (serv) {
                        temp[serv.code.split("_")[2]] = {
                            service_id: serv.id,
                            service_code: serv.code,
                            service_name: serv.displayName,
                        };
                    });
                    $scope.servicesList = temp;
                    load_table_info();
                }
            );
        } else {
            console.debug("searchModule: Service set is not defined");
            load_table_info();
        }

        /* 
    Filter dataElements and indicators that are not associated to a dataSet or an indicatorGroup

    var blacklist_datasets = [
        'AjwuNAGMSFM', // HIV program
        'kraMkBJg3JI', // Hospital Ward Multiservice SRH comp - Monthly
        'Hp68S9muoCn', // Intentional Violence
    ];
    var blacklist_indicatorgroups = [
        'rD7MJ3LaakW', // Individual Indicators
        'vnoUusJDY1Z', // Vaccination
        'vCfO0z5igGT'  // Vaccination 2015
        ];
        */

        /**  
         In case to hide dataElements that are associated to a blacklist_dataset
    if (obj.dataSetElements.length < 1) return true;
    return obj.dataSetElements.some(dse => $scope.blacklist_datasets.indexOf(dse.dataSet.id) == -1);
    */

        console.debug("searchModule: Blacklisted dataElementGroups: " + $scope.blacklist_dataelementgroups);
        console.debug("searchModule: Blacklisted dataSets: " + $scope.blacklist_datasets);
        console.debug("searchModule: Blacklisted indicatorGroups: " + $scope.blacklist_indicatorgroups);
        console.debug("searchModule: Blacklisted tag: " + $scope.blacklist_tag);

        var filterDataElements = function (obj) {
            return !obj.dataElementGroups.some(deg => $scope.blacklist_dataelementgroups.includes(deg.id));
        };

        var isBlacklistedIndicator = function (obj) {
            return obj.indicatorGroups.some(ig => $scope.blacklist_indicatorgroups.includes(ig.id));
        };

        var isNotInUseInicator = function (obj) {
            return obj.indicatorGroups.some(ig => $scope.notInUse_indicatorGroups.includes(ig.id));
        };

        var filterIndicators = function (obj) {
            const isAdmin = !!$scope.is_admin;
            return !obj.indicatorGroups.some(
                ig =>
                    $scope.blacklist_indicatorgroups.includes(ig.id) ||
                    (!isAdmin && $scope.notInUse_indicatorGroups.includes(ig.id))
            );
        };

        var isNotInUseProgramInicator = function (obj) {
            return obj.programIndicatorGroups.some(ig => $scope.notInUse_programIndicatorGroups.includes(ig.id));
        };

        var filterProgramInicators = function (obj) {
            const isAdmin = !!$scope.is_admin;
            return !obj.programIndicatorGroups.some(
                ig => !isAdmin && $scope.notInUse_programIndicatorGroups.includes(ig.id)
            );
        };

        var self = this;
        self.isFiltersVisible = true;

        self.applyGlobalSearch = function () {
            var x = _.cloneDeep(self.tableParams.data);
            var term = self.globalSearchTerm;
            var filter_content = self.tableParams.filter();
            filter_content.$ = term;

            x.map(function (item, index) {
                item.object_description = _.deburr(item.object_description);
                item.objectGroup_name = _.deburr(item.objectGroup_name);
                item.object_form = _.deburr(item.object_form);
                item.object_name = _.deburr(item.object_name);
                item.object_shortName = _.deburr(item.object_shortName);

                return item;
            });

            self.tableParams.filter(filter_content);
        };

        startLoadingState(false);

        function setCols() {
            $scope.cols_object = {
                object_type: $scope.accesses?.objectsBasics_type ?? true,
                object_name: $scope.accesses?.objectsBasics_name ?? true,
                object_shortName: $scope.accesses?.objectsBasics_shortName ?? true,
                object_form: $scope.accesses?.objectsBasics_form ?? true,
            };
            $scope.cols_object_advanced = {
                object_id: $scope.accesses?.objectsBasics_id ?? true,
                object_code: $scope.accesses?.objectsBasics_code ?? true,
                object_ICD10: $scope.accesses?.objectsBasics_icd10 ?? false,
            };
            $scope.cols_object_desc = {
                object_description: $scope.accesses?.objectsDescriptions_description ?? true,
                object_den_formula: $scope.accesses?.objectsDescriptions_denFormula ?? true,
                object_num_formula: $scope.accesses?.objectsDescriptions_numFormula ?? true,
                object_flt_formula: $scope.accesses?.objectsDescriptions_filterFormula ?? true,
                object_exp_formula: $scope.accesses?.objectsDescriptions_expFormula ?? true,
            };
            $scope.cols_objectGroup = {
                objectGroup_name: $scope.accesses?.groupsBasics_name ?? true,
            };
            $scope.cols_objectGroup_advanced = {
                objectGroup_id: $scope.accesses?.groupsBasics_id ?? true,
                objectGroup_code: $scope.accesses?.groupsBasics_code ?? true,
            };
            $scope.cols_service = {
                service_name: $scope.accesses?.servicesBasics_name ?? true,
            };
            $scope.cols_service_advanced = {
                service_id: $scope.accesses?.servicesBasics_id ?? true,
                service_code: $scope.accesses?.servicesBasics_code ?? true,
            };

            $scope.show_object = Object.values($scope.cols_object).some(v => Boolean(v));
            $scope.show_object_advanced = Object.values($scope.cols_object_advanced).some(v => Boolean(v));
            $scope.show_object_desc = Object.values($scope.cols_object_desc).some(v => Boolean(v));
            $scope.show_objectGroup = Object.values($scope.cols_objectGroup).some(v => Boolean(v));
            $scope.show_objectGroup_advanced = Object.values($scope.cols_objectGroup_advanced).some(v => Boolean(v));
            $scope.show_service = Object.values($scope.cols_service).some(v => Boolean(v));
            $scope.show_service_advanced = Object.values($scope.cols_service_advanced).some(v => Boolean(v));
        }

        function getCols() {
            return Object.assign(
                {},
                $scope.cols_object,
                $scope.cols_object_advanced,
                $scope.cols_object_desc,
                $scope.cols_objectGroup,
                $scope.cols_objectGroup_advanced,
                $scope.cols_service,
                $scope.cols_service_advanced
            );
        }

        setCols();

        $scope.$watch("accesses", () => setCols());

        $scope.canAdvanced = () => {
            return [
                ...Object.values($scope.cols_object_advanced),
                ...Object.values($scope.cols_objectGroup_advanced),
                ...Object.values($scope.cols_objectGroup_advanced),
                ...Object.values($scope.cols_service_advanced),
            ].some(v => v);
        };

        self.tableParams = new NgTableParams();

        $scope.loaded = {
            //dataElements
            get_dataElements: false,
            get_dataElementsDescriptions: false,
            get_dataElementsGroups: false,
            //indicators
            get_indicators: false,
            get_indicatorsDescriptions: false,
            get_indicatorGroups: false,
            // program indicators
            get_programIndicators: false,
            get_programIndicatorsDescriptions: false,
            get_programIndicatorGroups: false,
        };

        $scope.allObjects = [];
        $scope.$watch("allObjects", function () {
            var loaded_array = Object.keys($scope.loaded).map(function (key) {
                return $scope.loaded[key];
            });
            if (loaded_array.indexOf(false) == -1) {
                self.tableParams.settings({
                    filterOptions: { filterFilterName: "filterOR" },
                    dataset: $scope.allObjects,
                });
                if ($scope.table.cols) {
                    $scope.table.cols.forEach(function (col) {
                        col.code = Object.keys(col.filter())[0];

                        // Show service name column if show_dossiers
                        if (col.code === "service_name") {
                            col.show.assign($scope.table, $scope.show_dossiers);
                        }

                        // In case it was previously shown, hdie if user shouldn't have access
                        if (col.show() && !getCols()[col.code]) {
                            col.show.assign($scope.table, false);
                        }
                    });
                }
                endLoadingState();
            }
        });

        $scope.getTable = function (name, id, numerator, denominator) {
            indicatorComponents = extractIndicatorFormulaComponents(numerator, denominator);
            indicatorComponents.push(id); //INDICATOR
            getServices.query(
                {
                    uid: "BtFXTpKRl6n",
                },
                function (services) {
                    $scope.serviceItems = services.organisationUnitGroups;
                }
            );

            payload = {
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
                rowSubTotals: false,
                displayDensity: "NORMAL",
                displayDescription: "Created with HMIS Dictionary",
                regressionType: "NONE",
                completedOnly: false,
                cumulativeValues: false,
                colTotals: false,
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
                colSubTotals: false,
                noSpaceBetweenColumns: false,
                showHierarchy: false,
                rowTotals: false,
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

            sharing = {
                object: {
                    id: "LEP0WHTGYUe",
                    name: "name",
                    publicAccess: "--------",
                    externalAccess: false,
                    userGroupAccesses: [{ id: "epFY01iJN0Z", name: "ALL USERS", access: "rw------" }],
                },
            };

            items = indicatorComponents.map(id => {
                return { id: id };
            });

            payload.name = name + " - " + id;
            payload.rows[0].items = items;

            getTableFactory.query(
                {
                    filter: "name:eq:" + payload.name,
                },
                function (tbl) {
                    if (tbl && tbl.visualizations[0]) {
                        if (tbl.visualizations[0].id) {
                            console.debug("Updating Table");
                            payload.id = tbl.visualizations[0].id;
                            sharing.object.id = tbl.visualizations[0].id;
                            sharing.object.name = tbl.visualizations[0].name;

                            updateTable.update(
                                {
                                    uid: tbl.visualizations[0].id,
                                },
                                payload,
                                function (response) {
                                    updateSharing.update({ uid: tbl.visualizations[0].id }, sharing, function (res) {});

                                    uid = tbl.visualizations[0].id;
                                    $window.open(dhisroot + "dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                                }
                            );
                        }
                    }

                    if (tbl.visualizations[0] == undefined) {
                        console.debug("Creating Table");
                        searchTableFactory.set_table.query(payload, function (response) {
                            uid = response.response.uid;
                            updateSharing.update({ uid: uid }, sharing, function (res) {});
                            $window.open(dhisroot + "dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                        });
                    }
                }
            );
        };

        function extractIndicatorFormulaComponents(numerator, denominator) {
            let numerator_ids = extractIdsFromFormula(numerator);
            let denominator_ids = extractIdsFromFormula(denominator);
            return numerator_ids.concat(denominator_ids);
        }

        function extractIdsFromFormula(formula) {
            let formulaElements = formula.replace(/I{/g, "#{").replace(/N{/g, "#{").split("#");
            return formulaElements
                .filter(id => id != "")
                .filter(id => id != " ")
                .filter(id => id != "(")
                .map(el => el.split("{")[1])
                .map(el => {
                    if (el != undefined) {
                        return el.split("}")[0];
                    } else {
                        return undefined;
                    }
                })
                .filter(el => el != undefined);
        }

        $scope.formulaModal = {
            title: "",
            formulaHtml: "",
            legend: [],
        };

        $scope.formulaModalSettings = {
            maxDepth: 3,
        };

        $scope.formulaSources = {
            dataElements: {},
            categoryOptionCombos: {},
            programIndicators: {},
            indicators: {},
        };

        $scope.openFormulaModal = function (object, type) {
            if (!object || object.object_type !== "indicator") {
                $scope.formulaModal.title = $translate.instant("dos_FormulaOfIndicator");
                $scope.formulaModal.formulaHtml = "";
                $scope.formulaModal.legend = [];
                return;
            }

            $scope.currentFormulaObject = object;
            $scope.currentFormulaType = type;

            const baseFormula = type === "denominator" ? object.object_denominator : object.object_numerator;
            const labelKey = type === "denominator" ? "object_expand_den_formula" : "object_expand_num_formula";
            const legendById = {};

            $scope.formulaModal.title =
                object.object_name +
                " - " +
                $translate.instant(labelKey) +
                " (" +
                $translate.instant("srch_formula_modal_recursive") +
                ")";
            $scope.formulaModal.formulaHtml = $scope.parseFormula(
                baseFormula,
                $scope.formulaSources.dataElements,
                $scope.formulaSources.categoryOptionCombos,
                $scope.formulaSources.programIndicators,
                $scope.formulaSources.indicators,
                {
                    expandIndicators: true,
                    depth: 0,
                    maxDepth: $scope.formulaModalSettings.maxDepth,
                    visitedIndicators: new Set([object.object_id]),
                    legendById,
                }
            );

            $scope.formulaModal.legend = Object.values(legendById).sort((a, b) => a.order - b.order);
        };

        $scope.translateProgramIndicatorFormulas = function (object) {
            if (!object || object.object_type !== "program indicator" || object._translating) {
                return;
            }

            var pending = 0;
            object._translating = true;
            object._translationError = false;

            function doneOne() {
                pending -= 1;
                if (pending <= 0) {
                    object._translating = false;
                }
            }

            if (object.object_expression) {
                pending += 1;
                searchAllFactory.get_programIndicatorExpressionDescription.save(
                    {},
                    object.object_expression,
                    function (response) {
                        let expression = "";
                        if (response.status === "ERROR") {
                            expression = `${response.message}: ${response.description} Expression: ${object.object_expression}`;
                        } else {
                            expression = response.description.replaceAll("\\.", ".");
                        }
                        object.object_exp_formula = expression;
                        doneOne();
                    },
                    function () {
                        object._translationError = true;
                        doneOne();
                    }
                );
            }

            if (object.object_filter) {
                pending += 1;
                searchAllFactory.get_programIndicatorFilterDescription.save(
                    {},
                    object.object_filter,
                    function (response) {
                        let filter = "";
                        if (response.status === "ERROR") {
                            filter = `${response.message}: ${response.description}\n Filter: ${object.object_filter}`;
                        } else {
                            filter = response.description.replaceAll("\\.", ".");
                        }
                        object.object_flt_formula = filter;
                        doneOne();
                    },
                    function () {
                        object._translationError = true;
                        doneOne();
                    }
                );
            }

            if (pending === 0) {
                object._translating = false;
            }
        };

        $scope.translateProgramIndicatorsCurrentPageAutomatically = function () {
            var currentRows = self.tableParams.data || [];
            currentRows
                .filter(function (row) {
                    return (
                        row &&
                        row.object_type === "program indicator" &&
                        !row._translating &&
                        !row._autoTranslatedCurrentPage
                    );
                })
                .forEach(function (row) {
                    row._autoTranslatedCurrentPage = true;
                    $scope.translateProgramIndicatorFormulas(row);
                });
        };

        $scope.$watchCollection(
            function () {
                return self.tableParams.data;
            },
            function (rows) {
                if (!rows || !rows.length) {
                    return;
                }
                $scope.translateProgramIndicatorsCurrentPageAutomatically();
            }
        );

        function nextLegendColorIndex(legendById) {
            return (Object.keys(legendById).length % 8) + 1;
        }

        $scope.hasNestedIndicators = function (formula) {
            return /N\{\w+\}/.test(formula || "");
        };

        $scope.parseFormula = function (
            formula,
            dataElements,
            categoryOptionCombos,
            programIndicators,
            indicators,
            options
        ) {
            const config = Object.assign(
                {
                    expandIndicators: false,
                    depth: 0,
                    maxDepth: 8,
                    visitedIndicators: new Set(),
                    legendById: {},
                },
                options || {}
            );

            var operatorRegex = /}\s*[\+\-\*]\s*(#|I|N)/g;
            var dataElementRegex = /#\{\w*}/g;
            var dataElementCatRegex = /#\{\w*.\w*}/g;
            var programIndicatorRegex = /I\{\w*}/g;
            var indicatorRegex = /N\{\w*}/g;
            if (!formula) {
                return "";
            }
            return formula
                .replace(operatorRegex, function (nexus) {
                    var operator = nexus.split("}")[1].trim().charAt(0);
                    var nextItemType = nexus.charAt(nexus.length - 1);
                    return "}<br><b>" + operator + "</b> " + nextItemType;
                })
                .replace(dataElementRegex, function (dataElementWithCurlyBraces) {
                    var deId = dataElementWithCurlyBraces.substr(0, dataElementWithCurlyBraces.length - 1).substr(2);

                    return dataElements[deId] ? getTableObjectHtml(dataElements[deId]) : deId;
                })
                .replace(dataElementCatRegex, function (dataElementCatWithCurlyBraces) {
                    var deId = dataElementCatWithCurlyBraces.split("{")[1].split(".")[0];
                    var catId = dataElementCatWithCurlyBraces.split(".")[1].split("}")[0];

                    var dataElement = dataElements[deId] ? getTableObjectHtml(dataElements[deId]) : deId;
                    var categoryOptionCombo = categoryOptionCombos[catId]
                        ? categoryOptionCombos[catId].object_name
                        : catId;

                    return dataElement + " <i>(" + categoryOptionCombo + ")</i>";
                })
                .replace(programIndicatorRegex, function (programIndicatorWithCurlyBraces) {
                    var piId = programIndicatorWithCurlyBraces
                        .substr(0, programIndicatorWithCurlyBraces.length - 1)
                        .substr(2);
                    return programIndicators[piId]
                        ? getTableObjectHtml(programIndicators[piId], "programIndicator")
                        : piId;
                })
                .replace(indicatorRegex, function (indicatorWithCurlyBraces) {
                    var indId = indicatorWithCurlyBraces.substr(0, indicatorWithCurlyBraces.length - 1).substr(2);
                    if (!config.expandIndicators) {
                        return indicators[indId] ? getTableObjectHtml(indicators[indId], "indicator") : indId;
                    }

                    if (config.depth >= config.maxDepth) {
                        return indicators[indId] ? getTableObjectHtml(indicators[indId], "indicator") : indId;
                    }

                    if (config.visitedIndicators.has(indId)) {
                        return "[cyclic indicator reference: " + indicators[indId].object_name + "]";
                    }

                    if (!indicators[indId]) {
                        return indId;
                    }

                    if (!config.legendById[indId]) {
                        config.legendById[indId] = {
                            id: indId,
                            name: indicators[indId].object_name || indId,
                            description: indicators[indId].object_description || "",
                            colorIndex: nextLegendColorIndex(config.legendById),
                            depth: config.depth + 1,
                            order: Object.keys(config.legendById).length,
                        };
                    }

                    const nextVisited = new Set(config.visitedIndicators);
                    nextVisited.add(indId);
                    const currentLegend = config.legendById[indId];

                    return (
                        "<span class='formula-indicator-block formula-indicator-color-" +
                        currentLegend.colorIndex +
                        "'>[" +
                        $scope.parseFormula(
                            indicators[indId].object_numerator,
                            dataElements,
                            categoryOptionCombos,
                            programIndicators,
                            indicators,
                            {
                                expandIndicators: true,
                                depth: config.depth + 1,
                                maxDepth: config.maxDepth,
                                visitedIndicators: nextVisited,
                                legendById: config.legendById,
                            }
                        ) +
                        " / " +
                        $scope.parseFormula(
                            indicators[indId].object_denominator,
                            dataElements,
                            categoryOptionCombos,
                            programIndicators,
                            indicators,
                            {
                                expandIndicators: true,
                                depth: config.depth + 1,
                                maxDepth: config.maxDepth,
                                visitedIndicators: nextVisited,
                                legendById: config.legendById,
                            }
                        ) +
                        "]</span>"
                    );
                });
        };

        function getTableObjectHtml(object, tagText) {
            const description = object.object_description
                ? "<span class='tooltiptext'>" + object.object_description + "</span>"
                : "";
            const customTag = tagText ? " <i>(" + tagText + ")</i> " : "";
            const notInUseTag = object.isNotInUse ? " <i>[" + $scope.notInUse_tag + "]</i> " : undefined;
            const blacklistedTag = object.isBlacklisted ? " <i>[" + $scope.blacklist_tag + "]</i> " : undefined;
            const filterTag = notInUseTag || blacklistedTag || "";
            return (
                "<span class='tooltipcontainer'>" + filterTag + object.object_name + customTag + description + "</span>"
            );
        }

        function load_table_info() {
            var servicesCode = [];
            var start = new Date();

            var temp = {};
            var allDataElementsTemp = {};
            var categoryOptionCombosTemp = {};
            var programIndicatorsTemp = {};
            var allIndicatorsTemp = {};
            var allProgramIndicatorsTemp = {};
            var indicatorsTemp = {};

            startLoadingState(false, { message: "load_dataElements" });
            searchAllFactory.qry_dataElementsAll
                .query()
                .$promise.then(function (response) {
                    response.dataElements
                        .filter(obj => filterDataElements(obj))
                        .forEach(function (obj) {
                            var attribute = "";
                            //objectGroup + service
                            var temp_arr = {
                                objectGroup_id: [],
                                objectGroup_code: [],
                                objectGroup_name: [],
                                service_id: [],
                                service_code: [],
                                service_name: [],
                            };

                            obj.dataSetElements
                                .filter(dse => !$scope.blacklist_datasets.includes(dse.dataSet.id))
                                .forEach(function (grp) {
                                    if (
                                        $scope.servicesList &&
                                        grp.dataSet.attributeValues.length > 0 &&
                                        grp.dataSet.attributeValues[0].value
                                    ) {
                                        attributes = grp.dataSet.attributeValues.filter(
                                            at => at.attribute.id == "pG4YeQyynJh"
                                        );
                                        if (attributes[0] != undefined) {
                                            servicesCode = attributes[0].value.split("_");
                                        }
                                        servicesCode.shift();
                                        servicesCode.forEach(function (code) {
                                            if ($scope.servicesList[code]) {
                                                temp_arr.service_id.push($scope.servicesList[code].service_id);
                                                temp_arr.service_code.push($scope.servicesList[code].service_code);
                                                temp_arr.service_name.push($scope.servicesList[code].service_name);
                                            } else {
                                                console.debug(
                                                    "searchModule: Cannot find any service with code: " + code
                                                );
                                            }
                                        });
                                    }
                                    temp_arr.objectGroup_id.push(grp.dataSet.id);
                                    if (grp.dataSet.code) temp_arr.objectGroup_code.push(grp.dataSet.code);
                                    temp_arr.objectGroup_name.push(grp.dataSet.displayName);
                                });

                            if (obj.attributeValues != undefined) {
                                obj.attributeValues.forEach(function (att) {
                                    if (att.attribute.id == "zC3TBJnSxar") {
                                        attribute = att.value;
                                        $scope.cols_object_advanced.object_ICD10 = $scope.accesses?.objectsBasics_icd10;
                                    } else {
                                        attribute = "";
                                    }
                                });
                            }

                            temp[obj.id] = {
                                object_type: "dataElement",
                                object_id: obj.id,
                                object_code: obj.code,
                                object_ICD10: attribute,
                                object_name: obj.displayName,
                                object_shortName: obj.displayShortName,
                                object_form: obj.displayFormName,
                                object_description: obj.displayDescription,
                                objectGroup_id: temp_arr.objectGroup_id.join(", "),
                                objectGroup_code: temp_arr.objectGroup_code.join(", "),
                                objectGroup_name: temp_arr.objectGroup_name.join(", "),
                                service_id: _.uniq(temp_arr.service_id).join(", "),
                                service_code: _.uniq(temp_arr.service_code).join(", "),
                                service_name: _.uniq(temp_arr.service_name).join(", "),
                            };
                        });

                    response.dataElements.forEach(function (obj) {
                        allDataElementsTemp[obj.id] = {
                            id: obj.id,
                            object_name: obj.displayName,
                            object_form: obj.displayFormName,
                            object_description: obj.displayDescription,
                            isBlacklisted: !filterDataElements(obj),
                        };
                    });

                    $scope.loaded.get_dataElements = true;
                    $scope.loaded.get_dataElementsDescriptions = true;
                    $scope.loaded.get_dataElementsGroups = true;

                    console.debug("searchModule: Data Elements loaded");

                    return "done";
                })
                .then(function () {
                    startLoadingState(false, { message: "load_categoryOptionCombos" });
                    return searchAllFactory.get_categoryOptionCombosAll.query().$promise.then(function (response) {
                        response.categoryOptionCombos.forEach(function (obj) {
                            categoryOptionCombosTemp[obj.id] = {
                                id: obj.id,
                                object_name: obj.displayName,
                            };
                        });
                    });
                })
                .then(function () {
                    startLoadingState(false, { message: "load_programIndicators" });
                    return searchAllFactory.get_programIndicatorsAll.query().$promise.then(function (response) {
                        response.programIndicators.forEach(function (obj) {
                            allProgramIndicatorsTemp[obj.id] = {
                                id: obj.id,
                                object_name: obj.displayName,
                                object_form: obj.displayFormName,
                                object_description: obj.displayDescription,
                                isNotInUse: isNotInUseProgramInicator(obj),
                            };
                        });

                        response.programIndicators
                            .filter(obj => filterProgramInicators(obj))
                            .forEach(function (obj) {
                                programIndicatorsTemp[obj.id] = {
                                    id: obj.id,
                                    object_code: obj.code,
                                    object_name: obj.displayName,
                                    object_form: obj.displayFormName,
                                    object_description: obj.displayDescription,
                                    object_expression: obj.expression,
                                    object_filter: obj.filter,
                                    objectGroup_id: obj.programIndicatorGroups
                                        .map(function (grp) {
                                            return grp.id ? grp.id : undefined;
                                        })
                                        .filter(Boolean)
                                        .join(", "),
                                    objectGroup_code: obj.programIndicatorGroups
                                        .map(function (grp) {
                                            return grp.code ? grp.code : undefined;
                                        })
                                        .filter(Boolean)
                                        .join(", "),
                                    objectGroup_name: obj.programIndicatorGroups
                                        .map(function (grp) {
                                            return grp.name ? grp.name : undefined;
                                        })
                                        .filter(Boolean)
                                        .join(", "),
                                };
                            });
                    });
                })
                .then(function () {
                    startLoadingState(false, { message: "load_indicators" });
                    return searchAllFactory.get_indicatorsAll.query().$promise.then(function (response) {
                        response.indicators.forEach(function (obj) {
                            allIndicatorsTemp[obj.id] = {
                                id: obj.id,
                                object_name: obj.displayName,
                                object_form: obj.displayFormName,
                                object_description: obj.displayDescription,
                                object_numerator: obj.numerator,
                                object_denominator: obj.denominator,
                                isBlacklisted: isBlacklistedIndicator(obj),
                                isNotInUse: isNotInUseInicator(obj),
                            };
                        });

                        var filteredIndicators = response.indicators.filter(obj => filterIndicators(obj));

                        filteredIndicators.forEach(function (obj) {
                            indicatorsTemp[obj.id] = {
                                id: obj.id,
                                object_name: obj.displayName,
                                object_form: obj.displayFormName,
                                object_description: obj.displayDescription,
                                object_numerator: obj.numerator,
                                object_denominator: obj.denominator,
                            };
                        });

                        filteredIndicators.forEach(function (obj) {
                            //objectGroup + service
                            var temp_arr = {
                                objectGroup_id: [],
                                objectGroup_code: [],
                                objectGroup_name: [],
                                service_id: [],
                                service_code: [],
                                service_name: [],
                            };

                            obj.indicatorGroups.forEach(function (grp) {
                                if (
                                    $scope.servicesList &&
                                    grp.attributeValues.length > 0 &&
                                    grp.attributeValues[0].value
                                ) {
                                    var servicesCode = grp.attributeValues[0].value.split("_");
                                    servicesCode.shift();
                                    servicesCode.forEach(function (code) {
                                        if ($scope.servicesList[code]) {
                                            temp_arr.service_id.push($scope.servicesList[code].service_id);
                                            temp_arr.service_code.push($scope.servicesList[code].service_code);
                                            temp_arr.service_name.push($scope.servicesList[code].service_name);
                                        } else {
                                            console.debug("searchModule: Cannot find any service with code: " + code);
                                        }
                                    });
                                }
                                temp_arr.objectGroup_id.push(grp.id);
                                temp_arr.objectGroup_code.push(grp.code);
                                temp_arr.objectGroup_name.push(grp.displayName);
                            });

                            temp[obj.id] = {
                                object_type: "indicator",
                                object_id: obj.id,
                                object_code: obj.code,
                                object_name: obj.displayName,
                                object_shortName: obj.displayShortName,
                                object_form: obj.displayFormName,
                                object_numerator: obj.numerator,
                                object_denominator: obj.denominator,
                                object_den_formula: $scope.parseFormula(
                                    obj.denominator,
                                    allDataElementsTemp,
                                    categoryOptionCombosTemp,
                                    allProgramIndicatorsTemp,
                                    allIndicatorsTemp,
                                    { expandIndicators: false }
                                ),
                                object_num_formula: $scope.parseFormula(
                                    obj.numerator,
                                    allDataElementsTemp,
                                    categoryOptionCombosTemp,
                                    allProgramIndicatorsTemp,
                                    allIndicatorsTemp,
                                    { expandIndicators: false }
                                ),
                                object_description: obj.displayDescription,
                                objectGroup_id: temp_arr.objectGroup_id.join(", "),
                                objectGroup_code: temp_arr.objectGroup_code.join(", "),
                                objectGroup_name: temp_arr.objectGroup_name.join(", "),
                                service_id: _.uniq(temp_arr.service_id).join(", "),
                                service_code: _.uniq(temp_arr.service_code).join(", "),
                                service_name: _.uniq(temp_arr.service_name).join(", "),
                            };
                        });

                        $scope.loaded.get_indicators = true;
                        $scope.loaded.get_indicatorsDescriptions = true;
                        $scope.loaded.get_indicatorGroups = true;

                        console.debug("searchModule: Indicators loaded");

                        return "done";
                    });
                })
                .then(function () {
                    Object.values(programIndicatorsTemp).forEach(function (obj) {
                        temp[obj.id] = {
                            object_type: "program indicator",
                            object_id: obj.id,
                            object_code: obj.object_code,
                            object_name: obj.object_name,
                            object_form: obj.object_form,
                            object_description: obj.object_description,
                            object_expression: obj.object_expression,
                            object_filter: obj.object_filter,
                            object_exp_formula: $scope.parseFormula(
                                obj.object_expression,
                                allDataElementsTemp,
                                categoryOptionCombosTemp,
                                allProgramIndicatorsTemp,
                                allIndicatorsTemp,
                                { expandIndicators: false }
                            ),
                            object_flt_formula: $scope.parseFormula(
                                obj.object_filter,
                                allDataElementsTemp,
                                categoryOptionCombosTemp,
                                allProgramIndicatorsTemp,
                                allIndicatorsTemp,
                                { expandIndicators: false }
                            ),
                            objectGroup_id: obj.objectGroup_id,
                            objectGroup_code: obj.objectGroup_code,
                            objectGroup_name: obj.objectGroup_name,
                        };
                    });

                    $scope.loaded.get_programIndicators = true;
                    $scope.loaded.get_programIndicatorsDescriptions = true;
                    $scope.loaded.get_programIndicatorGroups = true;

                    $scope.formulaSources = {
                        dataElements: allDataElementsTemp,
                        categoryOptionCombos: categoryOptionCombosTemp,
                        programIndicators: allProgramIndicatorsTemp,
                        indicators: allIndicatorsTemp,
                    };
                    $scope.allObjects = Object.keys(temp).map(function (key) {
                        return temp[key];
                    });
                    $scope.allObjectsLength = Object.keys($scope.allObjects).length;

                    console.debug("searchModule: Program Indicators loaded");

                    return "done";
                })
                .then(function log() {
                    console.debug(
                        "searchModule: Loading time of search table: " + (Date.now() - start) + " milliseconds."
                    );
                });
        }

        // EXPORT TO EXCEL
        /* 
        @name translate
        @description $translate.instant() wrapper
        @scope searchController
        */
        function translate(tag) {
            return $translate.instant(tag);
        }

        /* 
        @name stripHTML
        @description strip the HTML tags to get the same output as the search dossier table
        @scope searchController
        */
        function stripHTML(value) {
            const tooltiptextRegex = /<span class=['"]tooltiptext['"]>.*?<\/span>/gi;
            const htmlRegex = /<[^<>]+>/gi;

            return value
                .replace(/(\r\n|\n|\r)/gm, "")
                .replace(tooltiptextRegex, "")
                .replace(/<br>/gm, "\n")
                .replace(htmlRegex, "");
        }

        /*
        @name writeSheetHeader
        @description Writes sheet header and applies styling
        @scope searchController
        */
        function writeSheetHeader(sheet, header) {
            header.forEach((item, index) => {
                const cell = sheet.cell(1, index + 1);
                cell.style({
                    bold: "bold",
                    horizontalAlignment: "center",
                    verticalAlignment: "center",
                });
                cell.value(item);
                if (index === 0) {
                    cell.column().width(12);
                } else {
                    cell.column().width(48);
                }
            });
        }

        /*
        @name writeSheetData
        @description Writes data object to sheet and wraps cell
        @scope searchController
        */
        function writeSheetData(sheet, data) {
            data.forEach((rowData, rowIndex) => {
                rowIndex += 2;
                sheet.row(rowIndex).height(24);
                Object.entries(rowData).forEach(([type, value], cellIndex) => {
                    if (["Numerator Formula (ind. only)", "Denominator Formula (ind. only)"].includes(type)) {
                        if (value) value = stripHTML(value);
                    }
                    const cell = sheet.cell(rowIndex, cellIndex + 1);
                    cell.value(value);
                    cell.style("wrapText", true);
                });
            });
        }

        /*
        @name downloadExcel
        @description download workbook blob
        @scope searchController
        */
        async function downloadExcel(workbook) {
            await workbook
                .outputAsync()
                .then(function (blob) {
                    var url = window.URL.createObjectURL(blob);
                    var a = document.createElement("a");
                    document.body.appendChild(a);
                    a.href = url;
                    a.download = "search_export.xlsx";
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                })
                .catch(() => console.debug("Download failed"));
        }

        /* 
        @name exportSearchDataToExcel
        @description Exports search dossier data to xlsx spreadsheet
        @scope searchController
        */
        async function exportSearchDataToExcel(header, data) {
            const workbook = await XlsxPopulate.fromBlankAsync().then(workbook => {
                const sheet = workbook.addSheet("Search Data");
                writeSheetHeader(sheet, header);
                writeSheetData(sheet, data);

                workbook.deleteSheet("Sheet1");
                return workbook;
            });

            downloadExcel(workbook);
        }

        /* 
        @name exportToExcel
        @description Get all filtered data from ng-table and export to xlsx
        @scope searchController
        */
        $scope.exportToExcel = async () => {
            const headers = $scope.table.cols.flatMap(col => {
                const isShown = col.show();
                if (isShown) {
                    return {
                        code: col.code,
                        title: col.title(),
                    };
                } else {
                    return [];
                }
            });

            const xlsxHeader = headers.map(h => h.title);
            const rowKeys = headers.map(h => h.code);

            const count = $scope.table.tableParams.count();
            const page = $scope.table.tableParams.page();

            // Get table without pagination, prepare data and export
            $scope.table.tableParams.count($scope.allObjectsLength);
            $scope.table.tableParams.reload().then(d => {
                const xlsxData = d.map(row => {
                    // Accumulate as {header_text: value, ...}
                    return rowKeys.reduce((accumulator, current) => {
                        accumulator[translate(current)] = row[current];
                        return accumulator;
                    }, {});
                });

                exportSearchDataToExcel(xlsxHeader, xlsxData);
            });

            $scope.table.tableParams.count(count);
            $scope.table.tableParams.page(page);
            await $scope.table.tableParams.reload();
        };
    },
]);
