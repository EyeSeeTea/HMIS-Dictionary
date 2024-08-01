var qry_get_UG = dhisUrl + "userGroups.json?fields=name,id&paging=false";
var qry_set_UG = dhisUrl + "dataStore/HMIS_Dictionary/setup_userGroup";

sharingSettingsModule.factory("userGroupsFactory", [
    "$resource",
    function ($resource) {
        return {
            get_UG: $resource(qry_get_UG, {}, { query: { method: "GET", isArray: false } }),
            get_UG_set: $resource(qry_set_UG, {}, { query: { method: "GET", isArray: false } }),
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
