sharingSettingsModule.controller("SharingSettingsController", [
    "$scope",
    "sharingSettingsFactory",
    "adminUGFactory",
    function ($scope, sharingSettingsFactory, adminUGFactory) {
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

        function isValidUserGroupsFormat(str) {
            try {
                const parsed = JSON.parse(str);
                return Array.isArray(parsed) && parsed.every(item => typeof item === "string");
            } catch (e) {
                return false;
            }
        }

        const previousAdvancedUsers = JSON.stringify($scope.state.advancedUserGroups);
        $scope.advancedUsers = previousAdvancedUsers;

        $scope.restore = () => {
            $scope.rows = assignRows($scope.state.accesses);
            $scope.advancedUsers = previousAdvancedUsers;
            $scope.showInvalidFormat = false;
            $scope.showInvalidUserGroup = false;
        };

        $scope.restore();
        $scope.previousRows = angular.copy($scope.rows);
        $scope.hasChanges = () =>
            !angular.equals($scope.rows, $scope.previousRows) || $scope.advancedUsers !== previousAdvancedUsers;

        $scope.showInvalidFormat = false;
        $scope.showInvalidUserGroup = false;
        $scope.showInvalidInput = () => $scope.showInvalidFormat || $scope.showInvalidUserGroup;

        $scope.applyChanges = () => {
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

            if (_.isEqual(accesses, $scope.state.accesses) && _.isEqual($scope.advancedUsers, previousAdvancedUsers)) {
                console.log("sharingSettingsModule: No changes to apply");
                window.location.reload(true); //fake apply UI feeling
                return;
            } else {
                if (!isValidUserGroupsFormat($scope.advancedUsers)) {
                    console.error("sharingSettingsModule: Invalid advancedUsers JSON array");
                    $scope.showInvalidFormat = true;
                    return;
                }

                adminUGFactory.get_UG.query().$promise.then(data => {
                    const userGroups = data.userGroups.map(group => group.id);
                    const advancedUserGroups = JSON.parse($scope.advancedUsers);

                    if (!advancedUserGroups.every(group => userGroups.includes(group))) {
                        console.error("sharingSettingsModule: Invalid advancedUsers user groups");
                        $scope.showInvalidUserGroup = true;
                        return;
                    }

                    const updatedSettings = Object.assign({}, $scope.state, {
                        accesses: accesses,
                        advancedUserGroups: JSON.parse($scope.advancedUsers),
                    });

                    sharingSettingsFactory.update
                        .query({ view: $scope.state.name }, JSON.stringify(updatedSettings))
                        .$promise.then(res => {
                            if (res.status === "OK") console.log("sharingSettingsModule: Sharing settings updated");
                            window.location.reload(true);
                        })
                        .catch(error => {
                            console.error("sharingSettingsModule: Error updating sharing settings", error);
                        });
                });
            }
        };
    },
]);
