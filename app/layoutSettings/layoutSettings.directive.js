layoutSettingsModule.directive("layoutSettings", function () {
    return {
        restrict: "E",
        scope: {
            state: "=",
            namespace: "@",
        },
        templateUrl: "app/layoutSettings/layoutSettings.template.html",
        controller: "SharingSettingsController",
    };
});

layoutSettingsModule.directive("searchLayoutSettings", function () {
    return {
        restrict: "E",
        scope: {
            state: "=",
            namespace: "@",
        },
        templateUrl: "app/layoutSettings/searchLayoutSettings.template.html",
        controller: "SharingSettingsController",
    };
});
