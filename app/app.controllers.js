/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/

/*
 *  @alias appModule.controller
 *  @type {Controller}
 *  @description Configures the appModule so it manages translations
 *	@todo
 */
appModule.controller("appSharedController", [
    "$scope",
    "$translate",
    "$state",
    "$location",
    "$stateParams",
    "$http",
    "$window",
    "$sessionStorage",
    function ($scope, $translate, $state, $location, $anchorScroll, $stateParams, $http, $window, $sessionStorage) {
        this.$route = $state;
        this.$location = $location;
        this.$routeParams = $stateParams;

        console.log("appModule: Checking user's rights...");

        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/setup_userGroup",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (admin) {
                admin = JSON.parse(admin);
                $scope.userAdminGroup = admin.value;
                if ($scope.userAdminGroup) {
                    console.log("appModule: Group of users authorised to administrate: " + admin.value);
                } else {
                    console.log("appModule: Group of users authorised to administrate has not been identified.");
                }
            })
            .fail(function () {
                console.log(
                    "appModule: Group of users authorised to administrate has not been defined yet, go to the admin panel!"
                );

                $scope.show_admin = true;

                // "Dossier" configuration is not mandatory anymore
                /*
        window.location.href = dhisUrl + 'apps/HMIS_Dictionary/index.html#/admin';
        */
            });

        /* For services list */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/setup_organisationUnitGroupSet",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (servicelist) {
                servicelist = JSON.parse(servicelist);
                $scope.serviceSetUID = servicelist.value;
                if ($scope.serviceSetUID) {
                    console.log(
                        "appModule: List of services taken from organisationUnitGroupSet: " + servicelist.value
                    );
                } else {
                    console.log(
                        "appModule: organisationUnitGroupSet to take the list of services has not been defined yet, go to the admin panel!"
                    );
                }
            })
            .fail(function () {
                console.log(
                    "appModule: organisationUnitGroupSet to take the list of services has not been identified."
                );
            });

        /* For DEG blacklist */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/blacklist_dataElementGroups",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (DEGlist) {
                DEGlist = JSON.parse(DEGlist);
                $scope.blacklist_dataelementgroups = DEGlist;
                if ($scope.blacklist_dataelementgroups) {
                    console.log("appModule: List of blacklisted dataElementGroups: " + DEGlist);
                } else {
                    console.log(
                        "appModule: List of blacklisted dataElementGroups has not been defined yet, go to the admin panel!"
                    );
                    $scope.blacklist_dataelementgroups = [];
                }
            })
            .fail(function () {
                console.log("appModule: List of blacklisted dataElementGroups has not been identified.");
                $scope.blacklist_dataelementgroups = [];
            });

        /* For DS blacklist */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/blacklist_dataSets",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (DSlist) {
                DSlist = JSON.parse(DSlist);
                $scope.blacklist_datasets = DSlist;
                if ($scope.blacklist_datasets) {
                    console.log("appModule: List of blacklisted dataSets: " + DSlist);
                } else {
                    console.log(
                        "appModule: List of blacklisted dataSets has not been defined yet, go to the admin panel!"
                    );
                    $scope.blacklist_datasets = [];
                }
            })
            .fail(function () {
                console.log("appModule: List of blacklisted dataSets has not been identified.");
                $scope.blacklist_datasets = [];
            });

        /* For IG blacklist */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/blacklist_indicatorGroups",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (IGlist) {
                IGlist = JSON.parse(IGlist);
                $scope.blacklist_indicatorgroups = IGlist;
                if ($scope.blacklist_indicatorgroups) {
                    console.log("appModule: List of blacklisted indicatorGroups: " + IGlist);
                } else {
                    console.log(
                        "appModule: List of blacklisted indicatorGroups has not been defined yet, go to the admin panel!"
                    );
                    $scope.blacklist_indicatorgroups = [];
                }
            })
            .fail(function () {
                console.log("appModule: List of blacklisted indicatorGroups has not been identified.");
                $scope.blacklist_indicatorgroups = [];
            });

        /* For IG not in use */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/notInUse_indicatorGroups",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            }).success(function (NIU_IGlist) {
                NIU_IGlist = JSON.parse(NIU_IGlist);
                $scope.notInUse_indicatorGroups = NIU_IGlist;
                if ($scope.notInUse_indicatorGroups) {
                    console.log("appModule: List of not in use indicatorGroups: " + NIU_IGlist);
                } else {
                    console.log(
                        "appModule: List of not in use indicatorGroups has not been defined yet, go to the admin panel!"
                    );
                    $scope.notInUse_indicatorGroups = [];
                }
            })
            .fail(function () {
                console.log("appModule: List of not in use indicatorGroups has not been identified.");
                $scope.notInUse_indicatorGroups = [];
            });

        /* For legacy DEG list */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/legacy_dataElementGroups",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            }).success(function (LEG_DEGlist) {
                LEG_DEGlist = JSON.parse(LEG_DEGlist);
                $scope.legacy_dataelementgroups = LEG_DEGlist;
                if ($scope.legacy_dataelementgroups) {
                    console.log("appModule: List of legacy dataElementGroups for the 'Programs' panel: " + LEG_DEGlist);
                } else {
                    console.log(
                        "appModule: List of legacy dataElementGroups for the 'Programs' panel has not been defined yet, go to the admin panel!"
                    );
                    $scope.legacy_dataelementgroups = [];
                }
            })
            .fail(function () {
                console.log(
                    "appModule: List of legacy dataElementGroups for the 'Programs' panel has not been identified."
                );
                $scope.legacy_dataelementgroups = [];
            });


        /* For PIG not in use */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/notInUse_programIndicatorGroups",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            }).success(function (NIU_PIGlist) {
                NIU_PIGlist = JSON.parse(NIU_PIGlist);
                $scope.notInUse_programIndicatorGroups = NIU_PIGlist;
                if ($scope.notInUse_programIndicatorGroups) {
                    console.log("appModule: List of not in use programIndicatorGroups: " + NIU_PIGlist);
                } else {
                    console.log(
                        "appModule: List of not in use programIndicatorGroups has not been defined yet, go to the admin panel!"
                    );
                    $scope.notInUse_programIndicatorGroups = [];
                }
            })
            .fail(function () {
                console.log("appModule: List of not in use programIndicatorGroups has not been identified.");
                $scope.notInUse_programIndicatorGroups = [];
            });

        /* For legacy OPG list */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/legacy_optionGroups",

                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })

            .success(function (LEG_OPGlist) {
                LEG_OPGlist = JSON.parse(LEG_OPGlist);
                $scope.legacy_optiongroups = LEG_OPGlist;
                if ($scope.legacy_optiongroups) {
                    console.log("appModule: List of legacy optionGroups for the 'Programs' panel: " + LEG_OPGlist);
                } else {
                    console.log(
                        "appModule: List of legacy optionGroups for the 'Programs' panel has not been defined yet, go to the admin panel!"
                    );
                    $scope.legacy_optiongroups = [];
                }
            })
            .fail(function () {
                console.log("appModule: List of legacy optionGroups for the 'Programs' panel has not been identified.");
                $scope.legacy_optiongroups = [];
            });

        /* For admin tab */
        jQuery
            .ajax({
                url: dhisUrl + "me?fields=userGroups[name]",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (me) {
                me = JSON.parse(me);
                var authUser = me.userGroups.some(function (userGroup) {
                    return userGroup.name == $scope.userAdminGroup;
                });
                if (authUser) {
                    console.log("appModule: User authorised to administrate: " + authUser);
                    $scope.show_admin = true;
                    $scope.is_admin = true;
                }
            })
            .fail(function () {
                console.log("appModule: Failed to check if user is authorised to administrate.");
            });

        /* For dossier tab */
        jQuery
            .ajax({
                url: dhisUrl + "dataStore/HMIS_Dictionary/setup_dossierConfigComplete",
                contentType: "json",
                method: "GET",
                dataType: "text",
                async: false,
            })
            .success(function (dossierConfigComplete) {
                dossierConfigComplete = JSON.parse(dossierConfigComplete);
                console.log("appModule: dossierConfigComplete: ", dossierConfigComplete);
                if (dossierConfigComplete.value) {
                    $scope.show_dossiers = true;
                }
            })
            .fail(function () {
                console.log("appModule: Failed to check if dossiers configuration is complete.");
            });

        /*
         *  @alias appModule.controller~ping
         *  @type {Function}
         *  @description Checks if session is not expired, if expired response is login-page(so then reload)
         *  @todo
         */
        ping = function () {
            $.ajax({
                url: qryPing,
                dataType: "html",
                cache: false,
            }).done(function (data) {
                if (data !== "pong") {
                    document.location;
                    document.location.reload(true);
                }
            });
        };

        csv_to_json = function (csv) {
            console.log("appModule: csv: ", csv);
            var lines = csv.split("\n");
            var result = [];
            var headers = lines[0].split(",");

            for (var i = 1; i < lines.length; i++) {
                var obj = {};
                var currentline = lines[i].split(",");
                for (var j = 0; j < headers.length; j++) {
                    obj[headers[j]] = currentline[j];
                }
                result.push(obj);
            }

            //return result; //JavaScript object
            return JSON.stringify(result); //JSON
        };

        /*
         *  @alias appModule.controller~tabSwitch
         *  @type {Function}
         *  @description Triggers ping and startLoadingState functions
         *  @todo
         */
        tabSwitch = function () {
            ping();
            startLoadingState(true);
        };

        var $loadingElement = $(".loading");
        var $loadingMessage = $(".loading-message");
        /*
         *  @alias appModule.controller~startLoadingState
         *  @type {Function}
         *  @description Show loading spinner with optional progress message
         *  @param {Boolean} onlyprint - If true, only disable print button
         *  @param {Object} progressConfig - Optional {message, current, total}
         */
        startLoadingState = function (onlyprint, progressConfig) {
            $loadingMessage.text($translate.instant("load_loading") + "...");
            $(".printButton").prop("disabled", true);
            if (!onlyprint === true) {
                $(".loading").show();
                if (progressConfig) {
                    updateProgressMessage(progressConfig);
                }
            }
        };

        /*
         *  @alias appModule.controller~updateProgressMessage
         *  @type {Function}
         *  @description Update the progress message in the spinner
         *  @param {Object} config - {message, current, total}
         */
        updateProgressMessage = function (config) {
            const message = config.message || "";
            const current = config.current || 0;
            const total = config.total || 0;

            const progressText = total > 0 ? ` (${current}/${total})` : "...";
            $loadingMessage.text($translate.instant(message) + progressText);
        };

        /*
         *  @alias appModule.controller~endLoadingState
         *  @type {Function}
         *  @description Hide loading spinner
         *  @param {Boolean} disableprint - Re-enable print button after delay
         */
        endLoadingState = function (disableprint) {
            if (disableprint === true) {
                setTimeout(function () {
                    $(".printButton").prop("disabled", false);
                }, 1000);
            }
            $(".loading").hide();
        };

        userHaveAccess = function (section, isAdvancedUser) {
            // 0: admin, 1: advanced, 2: everyone
            return $scope.is_admin || (isAdvancedUser && section.access >= 1) || section.access === 2;
        };

        userAccesses = function (layoutSettings, isAdvancedUser) {
            return _(layoutSettings)
                .mapValues((v, k) => {
                    const columns = _.mapValues(v.columns, (v, _k) => userHaveAccess(v, isAdvancedUser));
                    return {
                        [k]: userHaveAccess(v, isAdvancedUser),
                        ..._.mapKeys(columns, (_v, column_key) => `${k}_${column_key}`),
                    };
                })
                .reduce((acc, v) => ({ ...acc, ...v }), {});
        };
    },
]);
