sharingSettingsModule.directive('sharingSettings', function() {
    return {
        restrict: 'E',
        scope: {
            metadata: '=',
        },
        templateUrl: 'app/sharingSettings/sharingSettings.template.html',
        controller: 'SharingSettingsController',
        controllerAs: 'sharingSettingsCtrl',
    };
});