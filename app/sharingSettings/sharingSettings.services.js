var qrySharingSettings = dhisUrl + "dataStore/HMIS_Dictionary/sharingSettings_:view";

sharingSettingsModule.factory("sharingSettingsFactory", [
    "$resource",
    function ($resource) {
        return {
            get: $resource(qrySharingSettings, {}, { query: { method: "GET", isArray: false } }),
            set: $resource(qrySharingSettings, {}, { query: { method: "POST", isArray: false } }),
            update: $resource(qrySharingSettings, {}, { query: { method: "PUT", isArray: false } }),
        };
    },
]);

var qryMe = dhisUrl + "me?fields=userGroups[id]";

sharingSettingsModule.factory("advancedUsersFactory", [
    "$resource",
    function ($resource) {
        return {
            isAdvancedUser: function (advancedUserGroups) {
                return $resource(
                    qryMe,
                    {},
                    {
                        query: {
                            method: "GET",
                            isArray: false,
                            transformResponse: function (data) {
                                const res = angular.fromJson(data);
                                const userGroups = res.userGroups.map(({ id }) => id);
                                return {
                                    isAdvancedUser:
                                        advancedUserGroups &&
                                        advancedUserGroups.some(userGroup => userGroups.includes(userGroup)),
                                };
                            },
                        },
                    }
                );
            },
        };
    },
]);
