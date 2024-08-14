sharingSettingsModule.directive('sharingSettings', function() {
    return {
        restrict: 'E',
        scope: {
            state: '=',
            namespace: '@',
        },
        templateUrl: 'app/sharingSettings/sharingSettings.template.html',
        controller: 'SharingSettingsController',
    };
});

sharingSettingsModule.directive('searchSharingSettings', function() {
    return {
        restrict: 'E',
        scope: {
            state: '=',
            namespace: '@',
        },
        templateUrl: 'app/sharingSettings/shareSharingSettings.template.html',
        controller: 'SharingSettingsController',
    };
});