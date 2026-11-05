import { AccessContext } from "./AppSettings";
import { Struct } from "./generic/Struct";
import { layoutDefaults } from "./layoutDefaults";
import { Id } from "./Ref";
import { User } from "./User";
import { hardcodedIds } from "./HardcodedIds";

export type LayoutView = "search" | "datasets" | "indicators" | "programs";

export type Access = "admin" | "advanced" | "everyone";

export type LayoutColumn = { key: string; index: number; translationKey: string; access: Access };

export type LayoutSection = LayoutColumn & { columns: LayoutColumn[] };

export type LayoutSettingsAttrs = {
    view: LayoutView;
    advancedUserGroupIds: Id[];
    sections: LayoutSection[];
};

export class LayoutSettings extends Struct<LayoutSettingsAttrs>() {
    static defaults(view: LayoutView): LayoutSettings {
        return LayoutSettings.create({
            view: view,
            advancedUserGroupIds: [hardcodedIds.defaultAdvancedUserGroup],
            sections: layoutDefaults[view],
        });
    }

    /** Keeps what is stored, and adds the sections and columns missing from it. */
    mergedOverDefaults(): LayoutSettings {
        const defaults = LayoutSettings.defaults(this.view).sections;

        return this._update({
            sections: sortByIndex(
                mergeByKey(defaults, this.sections, (defaultSection, section) => ({
                    ...section,
                    columns: sortByIndex(
                        mergeByKey(defaultSection.columns, section.columns, (_, column) => column)
                    ),
                }))
            ),
        });
    }

    isAdvancedUser(user: User): boolean {
        return user.belongsToAnyGroup(this.advancedUserGroupIds);
    }

    getPermissions(context: AccessContext): LayoutPermissions {
        const isAdmin = context.settings.isAdmin(context.user);
        const isAdvanced = this.isAdvancedUser(context.user);

        const canAccess = (access: Access): boolean =>
            isAdmin || access === "everyone" || (isAdvanced && access === "advanced");

        const allowed = this.sections.flatMap(section => [
            ...(canAccess(section.access) ? [section.key] : []),
            ...section.columns
                .filter(column => canAccess(column.access))
                .map(column => `${section.key}.${column.key}`),
        ]);

        return LayoutPermissions.create({ allowed: new Set(allowed) });
    }

    update(sections: LayoutSection[], advancedUserGroupIds: Id[]): LayoutSettings {
        return this._update({ sections, advancedUserGroupIds });
    }
}

export type LayoutPermissionsAttrs = { allowed: Set<string> };

export class LayoutPermissions extends Struct<LayoutPermissionsAttrs>() {
    canSeeSection(section: string): boolean {
        return this.allowed.has(section);
    }

    canSeeColumn(section: string, column: string): boolean {
        return this.allowed.has(`${section}.${column}`);
    }
}

function mergeByKey<T extends { key: string }>(
    defaults: T[],
    stored: T[],
    merge: (defaultItem: T, storedItem: T) => T
): T[] {
    const missing = defaults.filter(item => !stored.some(other => other.key === item.key));

    const merged = stored.map(item => {
        const defaultItem = defaults.find(other => other.key === item.key);
        return defaultItem ? merge(defaultItem, item) : item;
    });

    return [...merged, ...missing];
}

function sortByIndex<T extends { index: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.index - b.index);
}
