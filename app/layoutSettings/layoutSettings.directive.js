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

layoutSettingsModule.directive("searchSharingSettings", function () {
    return {
        restrict: "E",
        scope: {
            state: "=",
            namespace: "@",
        },
        templateUrl: "app/layoutSettings/shareSharingSettings.template.html",
        controller: "SharingSettingsController",
    };
});
