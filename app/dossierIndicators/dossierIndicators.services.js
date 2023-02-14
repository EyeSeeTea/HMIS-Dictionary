var qryIndicators =
    dhisUrl +
    "indicators.json?fields=id,name,numerator,denominator,description,numeratorDescription,denominatorDescription&paging=false";

dossierIndicatorsModule.factory("dossiersIndicatorsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicators,
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

var qryIndicatorsDataElement =
    dhisUrl + "dataElements.json?filter=id\\:eq\\::id&fields=name,dataSetElements&paging=false";

dossierIndicatorsModule.factory("dossierIndicatorsDataElementsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicatorsDataElement,
            {
                id: "@id",
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

var qryIndicatorDataSet = dhisUrl + "dataSets.json?filter=id\\:eq\\::id&fields=name&paging=false";

dossierIndicatorsModule.factory("dossierIndicatorsDataSetsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicatorDataSet,
            {
                id: "@id",
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

var qryIndicatorCategoryOptionCombos =
    dhisUrl + "categoryOptionCombos.json?filter=id\\:eq\\::id&fields=name&paging=false";

dossierIndicatorsModule.factory("dossierIndicatorsCategoryOptionComboFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicatorCategoryOptionCombos,
            {
                id: "@id",
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

var qryIndicatorProgramIndicators = dhisUrl + "programIndicators.json?filter=id\\:eq\\::id&fields=name&paging=false";

dossierIndicatorsModule.factory("dossierIndicatorsProgramIndicatorsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicatorProgramIndicators,
            {
                id: "@id",
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

var qryIndicatorPrograms = dhisUrl + "programs.json?filter=id\\:eq\\::id&fields=name&paging=false";

dossierIndicatorsModule.factory("dossierIndicatorsProgramsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicatorPrograms,
            {
                id: "@id",
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

var qryIndicationOrganisationUnitGroups =
    dhisUrl + "organisationUnitGroups.json?filter=id\\:eq\\::id&fields=name&paging=false";

dossierIndicatorsModule.factory("dossierIndicatorsOrganisationUnitGroupsFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryIndicationOrganisationUnitGroups,
            {
                id: "@id",
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

dossierIndicatorsModule.factory("dossierIndicatorsLink", function () {
    var savedData = {};

    function set(data) {
        savedData = data;
    }

    function get() {
        return savedData;
    }

    return {
        set: set,
        get: get,
    };
});
