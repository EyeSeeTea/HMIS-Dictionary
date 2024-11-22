helpIconModule.directive("helpIcon", function () {
    return {
        restrict: "E",
        scope: {
            title: "@",
        },
        templateUrl: "app/helpIcon/helpIcon.template.html",
    };
});
