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