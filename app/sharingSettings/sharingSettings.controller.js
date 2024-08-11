sharingSettingsModule.controller("SharingSettingsController", [
    "$scope",
    function ($scope) {
        assignRows = function (accesses) {
            if (accesses === undefined) return [];
            return _(accesses).mapValues((v, _k) => {
                return {
                        label: v.translationKey,
                        admin: v.access >= 0,
                        advancedUsers: v.access >= 1,
                        everyone: v.access === 2,
                        children: assignRows(v.columns),
                    };
            }).values().value();
        };

        $scope.rows = assignRows($scope.state.accesses);

        $scope.$watch('rows', function(newValue, oldValue) {
            console.log('New value:', newValue);
            console.log('Old value:', oldValue);
        });
    },
]);
