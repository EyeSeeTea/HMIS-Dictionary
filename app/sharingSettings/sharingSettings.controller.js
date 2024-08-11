sharingSettingsModule.controller("SharingSettingsController", [
    "$scope",
    "sharingSettingsFactory",
    function ($scope, sharingSettingsFactory) {
        function assignRows(accesses) {
            if (accesses === undefined) return [];
            return _(accesses)
                .mapValues((v, key) => {
                    return {
                        key: key,
                        index: v.index, //preserve order
                        label: v.translationKey,
                        admin: v.access >= 0,
                        advancedUsers: v.access >= 1,
                        everyone: v.access === 2,
                        children: assignRows(v.columns),
                    };
                })
                .values()
                .sortBy("index")
                .value();
        }

        $scope.restoreRows = function () {
            $scope.rows = assignRows($scope.state.accesses);
        };

        $scope.restoreRows();
        $scope.originalRows = angular.copy($scope.rows);
        $scope.hasChanges = () => !angular.equals($scope.rows, $scope.originalRows);

        $scope.applyChanges = function () {

            function mapAccesses(rows) {
                const pairs = _.sortBy(rows, row => row.index).map(row => {
                    const { key, label, advancedUsers, everyone, children, index } = row;

                    return [
                        key,
                        Object.assign(
                            {
                                index: index,
                                translationKey: label,
                                access: everyone ? 2 : advancedUsers ? 1 : 0,
                            },
                            !_.isEmpty(children) ? { columns: mapAccesses(children) } : undefined
                        ),
                    ];
                });

                return _.fromPairs(pairs);
            }

            const accesses = mapAccesses($scope.rows);

            if (_.isEqual(accesses, $scope.state.accesses)) {
                console.log("sharingSettingsModule: No changes to apply");
                return;
            } else {
                const updatedSettings = Object.assign({}, $scope.state, { accesses });

                sharingSettingsFactory.update
                    .query({ view: $scope.state.name }, JSON.stringify(updatedSettings))
                    .$promise.then(data => {
                        console.log("sharingSettingsModule: Sharing settings updated");
                        console.log(data);
                        window.location.reload(true);
                    })
                    .catch(error => {
                        console.error("sharingSettingsModule: Error updating sharing settings", error);
                    });
            }
        };
    },
]);
