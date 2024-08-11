sharingSettingsModule.directive('sharingSettings', function() {
    return {
        restrict: 'E',
        scope: {
            state: '=',
        },
        templateUrl: 'app/sharingSettings/sharingSettings.template.html',
        controller: 'SharingSettingsController',
    };
});