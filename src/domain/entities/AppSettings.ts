import { Maybe } from "$/utils/ts-utils";
import { Struct } from "./generic/Struct";
import { Id, NamedRef } from "./Ref";
import { User } from "./User";

export const defaultTags = { blacklist: "Blacklisted", notInUse: "Not in Use" } as const;

export type AppSettingsAttrs = {
    adminGroup: Maybe<NamedRef>;
    healthServiceGroupSet: Maybe<NamedRef>;
    dossierConfigComplete: boolean;
    blacklist: {
        dataElementGroupIds: Id[];
        dataSetIds: Id[];
        indicatorGroupIds: Id[];
        tag: string;
    };
    notInUse: { indicatorGroupIds: Id[]; programIndicatorGroupIds: Id[]; tag: string };
    legacy: { dataElementGroupIds: Id[]; optionGroupIds: Id[] };
    /** The selectors of Data Sets and Programs only list items of the user's org units. */
    limitSelectorsToUserOrgUnits: boolean;
};

export class AppSettings extends Struct<AppSettingsAttrs>() {
    update(changes: Partial<AppSettingsAttrs>): AppSettings {
        return this._update(changes);
    }

    /** By group name, not id, as the app has always done it. */
    isAdmin(user: User): boolean {
        return this.adminGroup ? user.belongsToGroupNamed(this.adminGroup.name) : false;
    }

    /** Admin tab, Save in the dossier editor and Edit in the dossier reader. */
    canManage(user: User): boolean {
        return !this.adminGroup || this.isAdmin(user);
    }

    showsDossiersTab(): boolean {
        return Boolean(this.healthServiceGroupSet);
    }

    /** Only for Search: its health service columns, and whether health services are loaded. */
    showsHealthServiceColumns(): boolean {
        return this.dossierConfigComplete;
    }

    isDataElementBlacklisted(groupIds: Id[]): boolean {
        return includesAny(this.blacklist.dataElementGroupIds, groupIds);
    }

    isIndicatorBlacklisted(groupIds: Id[]): boolean {
        return includesAny(this.blacklist.indicatorGroupIds, groupIds);
    }

    isIndicatorNotInUse(groupIds: Id[]): boolean {
        return includesAny(this.notInUse.indicatorGroupIds, groupIds);
    }

    isProgramIndicatorNotInUse(groupIds: Id[]): boolean {
        return includesAny(this.notInUse.programIndicatorGroupIds, groupIds);
    }

    isIndicatorVisible(groupIds: Id[], user: User): boolean {
        return (
            !this.isIndicatorBlacklisted(groupIds) &&
            (this.isAdmin(user) || !this.isIndicatorNotInUse(groupIds))
        );
    }

    isProgramIndicatorVisible(groupIds: Id[], user: User): boolean {
        return this.isAdmin(user) || !this.isProgramIndicatorNotInUse(groupIds);
    }

    isDataElementVisibleInProgram(groupIds: Id[], showLegacy: boolean): boolean {
        return (
            !this.isDataElementBlacklisted(groupIds) &&
            (showLegacy || !includesAny(this.legacy.dataElementGroupIds, groupIds))
        );
    }
}

export type AccessContext = { user: User; settings: AppSettings };

function includesAny(list: Id[], ids: Id[]): boolean {
    return ids.some(id => list.includes(id));
}
