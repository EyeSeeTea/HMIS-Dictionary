dossierIndicatorsModule.controller("dossierIndicatorsMainController", [
    "$scope",
    "$anchorScroll",
    "$sce",
    "dossiersIndicatorsFactory",
    "advancedUsersFactory",
    "sharingSettingsFactory",
    function ($scope, $anchorScroll, $sce, dossiersIndicatorsFactory, advancedUsersFactory, sharingSettingsFactory) {
        $("#dossierIndicator").tab("show");

        $scope.sharingSettings = {
            advancedUserGroups: ["LjRqO9XzQPs"],
            accesses: {
                formula: {
                    index: 0,
                    translationKey: "dos_FormulaOfIndicator",
                    access: 2,
                },
                numerator: {
                    index: 1,
                    translationKey: "dos_NumeratorIndicator",
                    access: 2,
                    columns: {
                        type: { index: 0, translationKey: "dos_Type", access: 0 },
                        name: { index: 1, translationKey: "dos_NameIndicator", access: 0 },
                        datasets: { index: 2, translationKey: "dos_DataSets", access: 0 },
                        program: { index: 3, translationKey: "dos_Program", access: 0 },
                    },
                },
                denominator: {
                    index: 2,
                    translationKey: "dos_DenominatorIndicator",
                    access: 2,
                    columns: {
                        type: { index: 0, translationKey: "dos_Type", access: 0 },
                        name: { index: 1, translationKey: "dos_NameIndicator", access: 0 },
                        datasets: { index: 2, translationKey: "dos_DataSets", access: 0 },
                        program: { index: 3, translationKey: "dos_Program", access: 0 },
                    },
                },
            },
        };

        const namespace = "indicators";

        sharingSettingsFactory.get
            .query({ view: namespace })
            .$promise.then(data => {
                $scope.sharingSettings = data.toJSON();
            })
            .catch(error => {
                /* If no sharing settings are found, create them */
                if (error.status === 404) {
                    sharingSettingsFactory.set.query(
                        { view: namespace },
                        JSON.stringify($scope.sharingSettings),
                        response => {
                            if (response.status === "OK") {
                                console.log("datasetsModule: Sharing Settings created");
                            } else {
                                console.log("datasetsModule: Error creating Sharing Settings");
                            }
                        }
                    );
                } else {
                    console.log("datasetsModule: Error getting Sharing Settings");
                }
            });

        $scope.isAdvancedUser = false;

        $scope.$watch("sharingSettings", function () {
            advancedUsersFactory.isAdvancedUser($scope.sharingSettings.advancedUserGroups).query({}, function (data) {
                $scope.isAdvancedUser = data.isAdvancedUser;
                $scope.accesses = userAccesses($scope.sharingSettings.accesses, $scope.isAdvancedUser);
            });
        });

        addtoTOC = function (toc, items, parent, type) {
            console.log(type);
            if (type == "Formule of Indicator" && !$scope.accesses.formula) return;
            if (type == "Numerator" && !$scope.accesses.numerator) return;
            if (type == "Denominator" && !$scope.accesses.denominator) return;

            var index = toc.entries.push({
                parent: parent,
                children: items,
            });
        };

        $scope.scrollTo = function (id, yOffset) {
            $anchorScroll.yOffset = 66; //66;
            $anchorScroll(id);
        };

        $scope.trustAsHtml = function (string) {
            return $sce.trustAsHtml(string);
        };

        startLoadingState(false);
        dossiersIndicatorsFactory.get(function (response) {
            $scope.indicators = {
                indicators: response.indicators.filter(
                    ind =>
                        !ind.indicatorGroups
                            .map(({ id }) => id)
                            .some(id => $scope.blacklist_indicatorgroups.includes(id))
                ),
            };
            endLoadingState(false);
        });

        $scope.$watch("selectedIndicator", function () {
            ping();
            $scope.toc = {
                entries: [],
            };
        });
    },
]);

dossierIndicatorsModule.controller("dossierIndicatorsTitle", [
    "$scope",
    "$q",
    "dossierIndicatorsDataElementsFactory",
    "dossierIndicatorsCategoryOptionComboFactory",
    "dossierIndicatorsProgramIndicatorsFactory",
    "dossierIndicatorsOrganisationUnitGroupsFactory",
    "dossierIndicatorsProgramsFactory",
    function (
        $scope,
        $q,
        dossierIndicatorsDataElementsFactory,
        dossierIndicatorsCategoryOptionComboFactory,
        dossierIndicatorsProgramIndicatorsFactory,
        dossierIndicatorsOrganisationUnitGroupsFactory,
        dossierIndicatorsProgramsFactory
    ) {
        function getElement(value) {
            var i = 0,
                position = 0;
            var tabEnd = [];

            while (i < value.length) {
                var laLettre = "";
                var tabInter = [];
                // If there is a letter
                if (value.charAt(i) == "{") {
                    var y = i;

                    laLettre = value.substr(i - 1, 1);

                    while (value.charAt(y) != "}") {
                        y++;
                    }

                    var element = value.substr(i + 1, y - i - 1);

                    tabInter.push(position, laLettre, 1, element);

                    position++;

                    i = y;
                }

                //If Numeric value
                if (isNaN(value.charAt(i)) === false && value.charAt(i) !== " ") {
                    var y = i;

                    while (isNaN(value.charAt(y)) === false && value.charAt(y) !== " ") {
                        if (y > value.length) {
                            break;
                        }
                        if (value.charAt(y) == " ") {
                            break;
                        }
                        y++;
                    }

                    var element = value.substr(i, y - i);
                    laLettre = "Number";

                    tabInter.push(position, laLettre, 1, element);

                    position++;
                    i = y;
                }

                if (tabInter.length > 0) {
                    tabEnd.push(tabInter);
                }

                i++;
            }
            return tabEnd;
        }

        function parseElement(value) {
            var tabEnd = value;

            for (var i = 0; i < tabEnd.length; i++) {
                var z = tabEnd[i][3].search(/[.]/g);
                if (z !== -1) {
                    var valueSplit = tabEnd[i][3].split(".");
                    tabEnd[i].splice(2, 2);
                    tabEnd[i].push(valueSplit.length, valueSplit[0], valueSplit[1]);
                }
            }
            return tabEnd;
        }

        function getOperator(value) {
            var tabOperator = [];
            var i = 0;

            while (i < value.length) {
                if (
                    value.charAt(i) == "+" ||
                    value.charAt(i) == "-" ||
                    value.charAt(i) == "*" ||
                    value.charAt(i) == "/"
                ) {
                    tabOperator.push(value.substr(i, 1));
                }

                i++;
            }
            return tabOperator;
        }

        function getInformation(value) {
            var promises = [];
            var elementMapping = [];
            var tabEnd = [];

            for (var i = 0; i < value.length; i++) {
                if (value[i][1] === "#") {
                    //DataElement
                    promises.push(dossierIndicatorsDataElementsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("dataElements");
                    if (value[i][4] !== undefined) {
                        promises.push(dossierIndicatorsCategoryOptionComboFactory.get({ id: value[i][4] }).$promise);
                        elementMapping.push("categoryOptionCombos");
                        // Quand c'est de la forme :  #{dataElementId.categoryOptionCombosId}
                    }
                }
                if (value[i][1] === "I") {
                    //ProgramIndicator
                    promises.push(dossierIndicatorsProgramIndicatorsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("programIndicators");
                }
                if (value[i][1] === "D") {
                    //ProgramDataElement
                    promises.push(dossierIndicatorsProgramsFactory.get({ id: value[i][3] }).$promise);
                    promises.push(dossierIndicatorsDataElementsFactory.get({ id: value[i][4] }).$promise);

                    elementMapping.push("programs");
                    elementMapping.push("dataElements");
                }
                if (value[i][1] === "G") {
                    //OrganisationUnitGroups
                    promises.push(dossierIndicatorsOrganisationUnitGroupsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("organisationUnitGroups");
                    //$scope.numerator[i].push("organisationUnitGroups");
                }
                if (value[i][1] === "C") {
                    //Constante
                    if (value[i][3] === "m70zf14qLvm") {
                        value[i].splice(1, 3);
                        value[i].push("Number", 1, "0");
                    }
                    if (value[i][3] === "qRquxuP5Zow") {
                        value[i].splice(1, 3); //3,2
                        value[i].push("Number", 1, "1");
                    }
                }
            }
            tabEnd.push(value, promises, elementMapping);
            return tabEnd;
        }

        function formation(NumeratorValue, tabPromisesResult, tabOperator) {
            var leNumerator = "";
            var y = 0;
            for (var i = 0; i < NumeratorValue.length; i++) {
                if (NumeratorValue[i][1] !== "Number") {
                    var compteur = 0;
                    while (compteur < NumeratorValue[i][2]) {
                        leNumerator = leNumerator + " " + tabPromisesResult[y];
                        compteur++;
                        y++;
                    }
                } else {
                    leNumerator = leNumerator + " " + NumeratorValue[i][3];
                }

                if (tabOperator[i] !== undefined) {
                    leNumerator = leNumerator + " " + tabOperator[i]; //numeratorOperator
                }
            }
            return leNumerator;
        }

        $scope.formuleIndicator4TOC = {
            displayName: "Formula of Indicator",
            id: "formulaIndicator",
            index: 100,
        };

        $scope.$watch("selectedIndicator", function () {
            ping();
            if ($scope.selectedIndicator) {
                startLoadingState(false);
                //Step 1 : Numerator :
                var numeratorOperator = getOperator($scope.selectedIndicator.numerator);
                var getElements = getElement($scope.selectedIndicator.numerator);
                var getElement2 = parseElement(getElements);

                var resultNumerator = getInformation(parseElement(getElement($scope.selectedIndicator.numerator)));

                console.log(getElements);
                console.log(getElement2);
                console.log(resultNumerator);

                var numerator = resultNumerator[0];
                var promises = resultNumerator[1];
                var elementMapping = resultNumerator[2];

                //Step 2: execution des promises
                $q.all(promises).then(function (arr) {
                    var index = 0;
                    var tabResult = [];

                    arr.forEach(function (response) {
                        var result = response[elementMapping[index]].map(function (data) {
                            return data.name;
                        });
                        tabResult.push(result.toString());
                        index++;
                    });
                    $scope.numeratorEnd = formation(numerator, tabResult, numeratorOperator);

                    if ($scope.numeratorEnd !== undefined) {
                        addtoTOC($scope.toc, null, $scope.formuleIndicator4TOC, "Formule of Indicator");
                    }
                });

                var resultDenominator = getInformation(parseElement(getElement($scope.selectedIndicator.denominator)));
                var operatorDenominator = getOperator($scope.selectedIndicator.denominator);

                var denominator = resultDenominator[0];
                var promisesDenominator = resultDenominator[1];
                var elementMappingDenominator = resultDenominator[2];

                $q.all(promisesDenominator).then(function (arr) {
                    var indexDenominator = 0;
                    var tabResultDenominator = [];

                    arr.forEach(function (response) {
                        var result = response[elementMappingDenominator[indexDenominator]].map(function (data) {
                            return data.name;
                        });
                        tabResultDenominator.push(result.toString());
                        indexDenominator++;
                    });
                    $scope.denominatorEnd = formation(denominator, tabResultDenominator, operatorDenominator);
                });
                endLoadingState(true);
            }
        });
    },
]);
dossierIndicatorsModule.controller("dossierNumeratorTable", [
    "$scope",
    "$q",
    "$sessionStorage",
    "dossierIndicatorsDataElementsFactory",
    "dossierIndicatorsProgramIndicatorsFactory",
    "dossierIndicatorsOrganisationUnitGroupsFactory",
    "dossierIndicatorsProgramsFactory",
    "dossierIndicatorsDataSetsFactory",
    function (
        $scope,
        $q,
        $sessionStorage,
        dossierIndicatorsDataElementsFactory,
        dossierIndicatorsProgramIndicatorsFactory,
        dossierIndicatorsOrganisationUnitGroupsFactory,
        dossierIndicatorsProgramsFactory,
        dossierIndicatorsDataSetsFactory
    ) {
        function getElement(value) {
            var i = 0,
                position = 0;
            var tabEnd = [];

            while (i < value.length) {
                var laLettre = "";
                var tabInter = [];

                if (value.charAt(i) == "{") {
                    var y = i;

                    laLettre = value.substr(i - 1, 1);

                    while (value.charAt(y) != "}") {
                        y++;
                    }

                    var element = value.substr(i + 1, y - i - 1);

                    tabInter.push(position, laLettre, 1, element);

                    position++;

                    i = y;
                }

                //if the value is numeric
                if (isNaN(value.charAt(i)) === false && value.charAt(i) !== " ") {
                    var y = i;

                    while (isNaN(value.charAt(y)) === false && value.charAt(y) !== " ") {
                        //z = value.charAt(y);
                        if (y > value.length) {
                            break;
                        }
                        if (value.charAt(y) == " ") {
                            break;
                        }
                        y++;
                    }

                    var element = value.substr(i, y - i);
                    laLettre = "Number";

                    tabInter.push(position, laLettre, 1, element);

                    position++;
                    i = y;
                }

                if (tabInter.length > 0) {
                    tabEnd.push(tabInter);
                }

                i++;
            }
            return tabEnd;
        }

        function parseElement(value) {
            var tabEnd = value;

            for (var i = 0; i < tabEnd.length; i++) {
                var z = tabEnd[i][3].search(/[.]/g);
                if (z !== -1) {
                    var valueSplit = tabEnd[i][3].split(".");
                    tabEnd[i].splice(2, 2);
                    tabEnd[i].push(valueSplit.length, valueSplit[0], valueSplit[1]);
                }
            }
            return tabEnd;
        }

        function creationArray4Table(value) {
            var tabEnd = [];
            var promises = [];
            var elementMapping = [];
            for (var i = 0; i < value.length; i++) {
                if (value[i][1] === "#") {
                    promises.push(dossierIndicatorsDataElementsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("dataElements");
                    value[i].splice(4, 1);
                    value[i][2] = 1;
                }
                if (value[i][1] === "I") {
                    //ProgramIndicator
                    promises.push(dossierIndicatorsProgramIndicatorsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("programIndicators");
                }
                if (value[i][1] === "D") {
                    //ProgramDataElement
                    promises.push(dossierIndicatorsProgramsFactory.get({ id: value[i][3] }).$promise);
                    promises.push(dossierIndicatorsDataElementsFactory.get({ id: value[i][4] }).$promise);

                    elementMapping.push("programs");
                    elementMapping.push("dataElements");
                }
                if (value[i][1] === "G") {
                    //OrganisationUnitGroups
                    promises.push(dossierIndicatorsOrganisationUnitGroupsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("organisationUnitGroups");
                }
                if (value[i][1] === "C") {
                    //Constante
                    if (value[i][3] === "m70zf14qLvm") {
                        value[i].splice(1, 3);
                        value[i].push("Number", 1, "0");
                    }
                    if (value[i][3] === "qRquxuP5Zow") {
                        value[i].splice(1, 3); //3,2
                        value[i].push("Number", 1, "1"); //"Number","1"
                    }
                }
            }
            tabEnd.push(value, promises, elementMapping);
            return tabEnd;
        }
        $scope.numeratorArray4TOC = {
            displayName: "Numerator",
            id: "numerator",
            index: 101,
        };

        $scope.$watch("selectedIndicator", function () {
            ping();
            if ($scope.selectedIndicator) {
                startLoadingState(false);

                var tableNumerator = creationArray4Table(parseElement(getElement($scope.selectedIndicator.numerator)));

                var numeratorTable = tableNumerator[0];
                var promiseNumeratorTable = tableNumerator[1];
                var numeratorElementMapping = tableNumerator[2];

                $q.all(promiseNumeratorTable).then(function (arr) {
                    tabResult = [];
                    tabPromiseDataSets = [];
                    index = 0;
                    arr.forEach(function (response) {
                        var tab = [];
                        var tabDataElement = [];

                        var name = response[numeratorElementMapping[index]].map(function (data) {
                            return data.name;
                        });
                        var dataElement = response[numeratorElementMapping[index]].map(function (data) {
                            return data.dataSetElements;
                        });

                        for (var y = 0; y < dataElement.length; y++) {
                            if (dataElement[y] !== undefined) {
                                for (var z = 0; z < dataElement[y].length; z++) {
                                    tabDataElement.push(dataElement[y][z]);
                                }
                            }
                        }

                        //for les dataSets.
                        var dataSetId = tabDataElement.map(function (data) {
                            return data.dataSet.id;
                        });

                        if (dataSetId.length > 0) {
                            tab.push(name.toString(), dataSetId.length, dataSetId);
                            for (var y = 0; y < dataSetId.length; y++) {
                                tabPromiseDataSets.push(
                                    dossierIndicatorsDataSetsFactory.get({ id: dataSetId[y] }).$promise
                                );
                            }
                        } else {
                            tab.push(name.toString());
                        }
                        index++;

                        tabResult.push(tab);
                    });
                    //Exécution of each promises dataSets
                    $q.all(tabPromiseDataSets).then(function (arr) {
                        tabResultDataSets = [];
                        arr.forEach(function (response) {
                            var name = response.dataSets.map(function (data) {
                                return data.name;
                            });
                            tabResultDataSets.push(name);
                        });

                        var tabRegroupEnd = [];
                        var tabProgram = [];
                        var indexTabResult = 0;
                        var indexTabResultDataSets = 0;

                        for (var i = 0; i < numeratorTable.length; i++) {
                            if (numeratorTable[i][1] === "#") {
                                var tabRegroupNameDataSets = [];

                                if (tabResult[indexTabResult][1] !== undefined) {
                                    var compteur = 0;
                                    while (compteur < tabResult[indexTabResult][1]) {
                                        tabRegroupNameDataSets.push(
                                            tabResultDataSets[indexTabResultDataSets].toString()
                                        );
                                        indexTabResultDataSets++;
                                        compteur++;
                                    }
                                } else {
                                    tabRegroupNameDataSets.push("No Value");
                                }

                                tabRegroupEnd.push({
                                    type: "Data Element - Aggregate Value",
                                    name: tabResult[indexTabResult][0],
                                    dataSets: tabRegroupNameDataSets,
                                    program: "",
                                });
                                indexTabResult++;
                            }
                            if (numeratorTable[i][1] === "D") {
                                var indicatorName = tabResult[indexTabResult][0];
                                var dataElementName = tabResult[indexTabResult + 1][0];
                                tabProgram.push(indicatorName);

                                tabRegroupEnd.push({
                                    type: "Data Element - Tracker Value",
                                    name: dataElementName,
                                    dataSets: "",
                                    program: tabProgram,
                                });

                                tabProgram = [];
                                indexTabResult = indexTabResult + 2;
                            }
                            if (numeratorTable[i][1] === "I") {
                                tabRegroupEnd.push({
                                    type: "Program Indicator",
                                    name: tabResult[indexTabResult][0],
                                    dataSets: "",
                                    program: "",
                                });
                                indexTabResult++;
                            }
                            if (numeratorTable[i][1] === "Number") {
                                tabRegroupEnd.push({
                                    type: "Number",
                                    name: numeratorTable[i][3],
                                    dataSets: "",
                                    program: "",
                                });
                            }
                            if (numeratorTable[i][1] === "G") {
                                tabRegroupEnd.push({
                                    type: "Organisation Unit Group",
                                    name: tabResult[indexTabResult][0],
                                    dataSets: "",
                                    program: "",
                                });
                                indexTabResult++;
                            }
                        }
                        $scope.tabNumeratorRegroups = tabRegroupEnd;

                        $scope.save = function (value) {
                            $sessionStorage.put("dataSetName", value);
                        };

                        $scope.saveProgram = function (value) {
                            $sessionStorage.put("programName", value);
                        };

                        if ($scope.tabNumeratorRegroups.length > 0) {
                            addtoTOC($scope.toc, null, $scope.numeratorArray4TOC, "Numerator");
                        }
                    });
                });

                endLoadingState(true);
            }
        });
    },
]);

dossierIndicatorsModule.controller("dossierDenominatorTable", [
    "$scope",
    "$q",
    "$sessionStorage",
    "dossierIndicatorsDataElementsFactory",
    "dossierIndicatorsProgramIndicatorsFactory",
    "dossierIndicatorsOrganisationUnitGroupsFactory",
    "dossierIndicatorsProgramsFactory",
    "dossierIndicatorsDataSetsFactory",
    "dossierIndicatorsLink",
    "Ping",
    function (
        $scope,
        $q,
        $sessionStorage,
        dossierIndicatorsDataElementsFactory,
        dossierIndicatorsProgramIndicatorsFactory,
        dossierIndicatorsOrganisationUnitGroupsFactory,
        dossierIndicatorsProgramsFactory,
        dossierIndicatorsDataSetsFactory
    ) {
        function getElement(value) {
            var i = 0,
                position = 0;
            var tabEnd = [];

            while (i < value.length) {
                var laLettre = "";
                var tabInter = [];

                if (value.charAt(i) == "{") {
                    var y = i;

                    laLettre = value.substr(i - 1, 1);

                    while (value.charAt(y) != "}") {
                        y++;
                    }

                    var element = value.substr(i + 1, y - i - 1);

                    tabInter.push(position, laLettre, 1, element);

                    position++;

                    i = y;
                }

                if (isNaN(value.charAt(i)) === false && value.charAt(i) !== " ") {
                    var y = i;

                    while (isNaN(value.charAt(y)) === false && value.charAt(y) !== " ") {
                        if (y > value.length) {
                            break;
                        }
                        if (value.charAt(y) == " ") {
                            break;
                        }
                        y++;
                    }

                    var element = value.substr(i, y - i);
                    laLettre = "Number";

                    tabInter.push(position, laLettre, 1, element);

                    position++;
                    i = y;
                }

                if (tabInter.length > 0) {
                    tabEnd.push(tabInter);
                }

                i++;
            }
            return tabEnd;
        }

        function parseElement(value) {
            var tabEnd = value;

            for (var i = 0; i < tabEnd.length; i++) {
                var z = tabEnd[i][3].search(/[.]/g);
                if (z !== -1) {
                    var valueSplit = tabEnd[i][3].split(".");
                    tabEnd[i].splice(2, 2);
                    tabEnd[i].push(valueSplit.length, valueSplit[0], valueSplit[1]);
                }
            }
            return tabEnd;
        }

        function creationArray4Table(value) {
            var tabEnd = [];
            var promises = [];
            var elementMapping = [];
            for (var i = 0; i < value.length; i++) {
                if (value[i][1] === "#") {
                    promises.push(dossierIndicatorsDataElementsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("dataElements");
                    value[i].splice(4, 1);
                    value[i][2] = 1;
                }
                if (value[i][1] === "I") {
                    //ProgramIndicator
                    promises.push(dossierIndicatorsProgramIndicatorsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("programIndicators");
                }
                if (value[i][1] === "D") {
                    //ProgramDataElement
                    promises.push(dossierIndicatorsProgramsFactory.get({ id: value[i][3] }).$promise);
                    promises.push(dossierIndicatorsDataElementsFactory.get({ id: value[i][4] }).$promise);

                    elementMapping.push("programs");
                    elementMapping.push("dataElements");
                }
                if (value[i][1] === "G") {
                    //OrganisationUnitGroups
                    promises.push(dossierIndicatorsOrganisationUnitGroupsFactory.get({ id: value[i][3] }).$promise);
                    elementMapping.push("organisationUnitGroups");
                }
                if (value[i][1] === "C") {
                    //Constante
                    if (value[i][3] === "m70zf14qLvm") {
                        value[i].splice(1, 3);
                        value[i].push("Number", 1, "0");
                    }
                    if (value[i][3] === "qRquxuP5Zow") {
                        value[i].splice(1, 3);
                        value[i].push("Number", 1, "1");
                    }
                }
            }
            tabEnd.push(value, promises, elementMapping);
            return tabEnd;
        }

        $scope.denominatorArrat4TOC = {
            displayName: "Denominator",
            id: "denominator",
            index: 102,
        };

        $scope.$watch("selectedIndicator", function () {
            ping();
            if ($scope.selectedIndicator) {
                startLoadingState(false);
                var tableDenominator = creationArray4Table(
                    parseElement(getElement($scope.selectedIndicator.denominator))
                );

                var denominatorTable = tableDenominator[0];
                var promiseDenominatorTable = tableDenominator[1];
                var denominatorElementMapping = tableDenominator[2];

                $q.all(promiseDenominatorTable).then(function (arr) {
                    tabResultDenominator = [];
                    tabPromiseDataSetsDenominator = [];
                    indexDenominator = 0;
                    arr.forEach(function (response) {
                        var tabDenominator = [];
                        var tabDataElementDenominator = [];

                        var nameDenominator = response[denominatorElementMapping[indexDenominator]].map(function (
                            data
                        ) {
                            return data.name;
                        });
                        var dataElementDenominator = response[denominatorElementMapping[indexDenominator]].map(
                            function (data) {
                                return data.dataSetElements;
                            }
                        );

                        for (var y = 0; y < dataElementDenominator.length; y++) {
                            if (dataElementDenominator[y] !== undefined) {
                                for (var z = 0; z < dataElementDenominator[y].length; z++) {
                                    tabDataElementDenominator.push(dataElementDenominator[y][z]);
                                }
                            }
                        }

                        var dataSetIdDenominator = tabDataElementDenominator.map(function (data) {
                            return data.dataSet.id;
                        });

                        if (dataSetIdDenominator.length > 0) {
                            tabDenominator.push(
                                nameDenominator.toString(),
                                dataSetIdDenominator.length,
                                dataSetIdDenominator
                            );
                            for (var y = 0; y < dataSetIdDenominator.length; y++) {
                                tabPromiseDataSetsDenominator.push(
                                    dossierIndicatorsDataSetsFactory.get({ id: dataSetIdDenominator[y] }).$promise
                                );
                            }
                        } else {
                            tabDenominator.push(nameDenominator.toString());
                        }
                        indexDenominator++;

                        tabResultDenominator.push(tabDenominator);
                    });
                    console.log(tabResultDenominator);

                    $q.all(tabPromiseDataSetsDenominator).then(function (arr) {
                        tabResultDataSetsDenominator = [];
                        arr.forEach(function (response) {
                            var nameDenominator = response.dataSets.map(function (data) {
                                return data.name;
                            });
                            tabResultDataSetsDenominator.push(nameDenominator);
                        });

                        var tabRegroupEndDenominateur = [];
                        var indexTabResultDenominator = 0;
                        var indexTabResultDataSetsDenominator = 0;
                        var tabIndicatorDenominatorGroupProgramm = [];

                        for (var i = 0; i < denominatorTable.length; i++) {
                            if (denominatorTable[i][1] === "#") {
                                var tabRegroupNameDataSetsDenominator = [];

                                if (tabResultDenominator[indexTabResultDenominator][1] !== undefined) {
                                    var compteur = 0;
                                    while (compteur < tabResultDenominator[indexTabResultDenominator][1]) {
                                        tabRegroupNameDataSetsDenominator.push(
                                            tabResultDataSetsDenominator[indexTabResultDataSetsDenominator].toString()
                                        );
                                        indexTabResultDataSetsDenominator++;
                                        compteur++;
                                    }
                                } else {
                                    tabRegroupNameDataSetsDenominator.push("No Value");
                                }

                                tabRegroupEndDenominateur.push({
                                    typeDenominator: "Data Element - Aggregate Value",
                                    nameDenominator: tabResultDenominator[indexTabResultDenominator][0],
                                    dataSetsDenominator: tabRegroupNameDataSetsDenominator,
                                    programDenominator: "",
                                });
                                indexTabResultDenominator++;
                            }

                            if (denominatorTable[i][1] === "D") {
                                var indicatorNameDenominator = tabResultDenominator[indexTabResultDenominator][0];
                                var dataElementNameDenominator = tabResultDenominator[indexTabResultDenominator + 1][0];

                                tabIndicatorDenominatorGroupProgramm.push(indicatorNameDenominator);

                                tabRegroupEndDenominateur.push({
                                    typeDenominator: "Data Element - Tracker Value",
                                    nameDenominator: dataElementNameDenominator,
                                    dataSetsDenominator: "",
                                    programDenominator: tabIndicatorDenominatorGroupProgramm,
                                });

                                tabIndicatorDenominatorGroupProgramm = [];
                                indexTabResultDenominator = indexTabResultDenominator + 2;
                            }

                            if (denominatorTable[i][1] === "I") {
                                tabRegroupEndDenominateur.push({
                                    typeDenominator: "Program Indicator",
                                    nameDenominator: tabResultDenominator[indexTabResultDenominator][0],
                                    dataSetsDenominator: "",
                                    programDenominator: "",
                                });
                                indexTabResultDenominator++;
                            }

                            if (denominatorTable[i][1] === "Number") {
                                tabRegroupEndDenominateur.push({
                                    typeDenominator: "Number",
                                    nameDenominator: denominatorTable[i][3],
                                    dataSetsDenominator: "",
                                    programDenominator: "",
                                });
                            }

                            if (denominatorTable[i][1] === "G") {
                                tabRegroupEndDenominateur.push({
                                    typeDenominator: "Organisation Unit Group",
                                    nameDenominator: tabResultDenominator[indexTabResultDenominator][0],
                                    dataSetsDenominator: "",
                                    programDenominator: "",
                                });
                                indexTabResultDenominator++;
                            }
                        }

                        $scope.tabDenominatorRegroups = tabRegroupEndDenominateur;

                        $scope.save = function (value) {
                            $sessionStorage.put("dataSetName", value);
                        };

                        $scope.saveProgram = function (value) {
                            $sessionStorage.put("programName", value);
                        };

                        if ($scope.tabDenominatorRegroups.length > 0) {
                            addtoTOC($scope.toc, null, $scope.denominatorArrat4TOC, "Denominator");
                        }
                    });
                });
                endLoadingState(true);
            }
        });
    },
]);
