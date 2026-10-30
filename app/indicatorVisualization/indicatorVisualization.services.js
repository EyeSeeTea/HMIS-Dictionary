var qryVisualizationTables = dhisUrl + "visualizations";
var qryVisualizationTableByUid = dhisUrl + "visualizations/:uid";
var qryVisualizationSharing = dhisUrl + "sharing?type=visualization&id=:uid";

indicatorVisualizationModule.factory("indicatorVisualizationTableFactory", [
    "$resource",
    function ($resource) {
        return {
            get_table: $resource(qryVisualizationTables, {}, { query: { method: "GET", isArray: false } }),
            set_table: $resource(qryVisualizationTables, {}, { query: { method: "POST", isArray: false } }),
            upd_table: $resource(qryVisualizationTableByUid, { uid: "@uid" }, { update: { method: "PUT" } }),
            upd_sharing: $resource(qryVisualizationSharing, { uid: "@uid" }, { update: { method: "PUT" } }),
        };
    },
]);

var qryVisualizationUserGroups = dhisUrl + "userGroups/:uid?fields=id";

indicatorVisualizationModule.factory("indicatorVisualizationUserGroupFactory", [
    "$resource",
    function ($resource) {
        return $resource(
            qryVisualizationUserGroups,
            {
                uid: "@uid",
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

/*
 *  @name indicatorVisualizationService
 *  @description Create/update the pivot-table visualization for an indicator/programIndicator and open it.
 */
indicatorVisualizationModule.factory("indicatorVisualizationService", [
    "$window",
    "indicatorVisualizationTableFactory",
    "indicatorVisualizationUserGroupFactory",
    function ($window, indicatorVisualizationTableFactory, indicatorVisualizationUserGroupFactory) {
        function extractFormulaIds(formula) {
            if (!formula) return [];
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

        function extractIndicatorRowItems(numerator, denominator) {
            return extractFormulaIds(numerator).concat(extractFormulaIds(denominator));
        }

        function checkAllUsersGroupExists() {
            return indicatorVisualizationUserGroupFactory
                .query({ uid: "epFY01iJN0Z" })
                .$promise.then(function (response) {
                    if (!response.id) {
                        console.debug("User group epFY01iJN0Z ALL USERS does not exist");
                        return false;
                    }
                    return true;
                })
                .catch(function (error) {
                    console.debug("User group epFY01iJN0Z ALL USERS does not exist");
                    return false;
                });
        }

        async function openIndicatorVisualization(name, id, numerator, denominator) {
            console.debug("Opening indicator visualization for " + name + " (" + id + ")");
            console.debug("Numerator: " + numerator);
            console.debug("Denominator: " + denominator);
            const rowIds = extractIndicatorRowItems(numerator, denominator).concat([id]);
            const userGroupExists = await checkAllUsersGroupExists();

            const sharing = userGroupExists
                ? {
                      object: {
                          id: "LEP0WHTGYUe",
                          name: "name",
                          publicAccess: "--------",
                          externalAccess: false,
                          userGroupAccesses: [{ id: "epFY01iJN0Z", name: "ALL USERS", access: "rw------" }],
                      },
                  }
                : {
                      object: {
                          id: "LEP0WHTGYUe",
                          name: "name",
                          publicAccess: "r-------",
                          externalAccess: false,
                          userGroupAccesses: [],
                      },
                  };

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
                publicAccess: sharing.object.publicAccess,
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
                userGroupAccesses: userGroupExists
                    ? [
                          {
                              access: "rw------",
                              userGroupUid: "epFY01iJN0Z",
                              displayName: "ALL USERS",
                              id: "epFY01iJN0Z",
                          },
                      ]
                    : [],
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

            payload.name = name + " - " + id;
            payload.rows[0].items = rowIds.map(rowId => ({ id: rowId }));

            return indicatorVisualizationTableFactory.get_table.query(
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

                            indicatorVisualizationTableFactory.upd_table.update(
                                {
                                    uid: tbl.visualizations[0].id,
                                },
                                payload,
                                function (response) {
                                    indicatorVisualizationTableFactory.upd_sharing.update(
                                        { uid: tbl.visualizations[0].id },
                                        sharing,
                                        function (res) {}
                                    );

                                    const uid = tbl.visualizations[0].id;
                                    $window.open(dhisroot + "dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                                }
                            );
                        }
                    }

                    if (tbl.visualizations[0] == undefined) {
                        console.debug("Creating Table");
                        indicatorVisualizationTableFactory.set_table.query(payload, function (response) {
                            const uid = response.response.uid;
                            indicatorVisualizationTableFactory.upd_sharing.update(
                                { uid: uid },
                                sharing,
                                function (res) {}
                            );
                            $window.open(dhisroot + "dhis-web-data-visualizer/index.html#/" + uid, "_blank");
                        });
                    }
                }
            );
        }

        return {
            extractFormulaIds,
            extractIndicatorRowItems,
            checkAllUsersGroupExists,
            openIndicatorVisualization,
        };
    },
]);
