helpIconModule.directive("helpIcon", function () {
    return {
        restrict: "E",
        scope: {
            title: "@",
            size: "@",
        },
        templateUrl: "app/helpIcon/helpIcon.template.html",
        link: function (_scope, _element, attrs) {
            if (attrs.size !== "small" && attrs.size !== "medium") {
                attrs.size = "small"; // default to medium if size is not valid
            }
        },
    };
});
