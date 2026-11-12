import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import {
    Access,
    LayoutColumn,
    LayoutSection,
    LayoutSettings,
    LayoutView,
} from "$/domain/entities/LayoutSettings";
import { LayoutSettingsRepository } from "$/domain/repositories/LayoutSettingsRepository";
import { D2Api } from "$/types/d2-api";
import { Maybe } from "$/utils/ts-utils";
import { dataStoreNamespace } from "./AppSettingsD2Repository";

type StoredAccess = 0 | 1 | 2;

type StoredColumn = { index: number; translationKey: string; access: StoredAccess };

type StoredSection = StoredColumn & { columns?: Record<string, StoredColumn> };

export type StoredLayoutSettings = {
    advancedUserGroups?: string[];
    accesses?: Record<string, StoredSection>;
};

const accessByStored: Record<StoredAccess, Access> = { 0: "admin", 1: "advanced", 2: "everyone" };
const storedByAccess: Record<Access, StoredAccess> = { admin: 0, advanced: 1, everyone: 2 };

export class LayoutSettingsD2Repository implements LayoutSettingsRepository {
    constructor(private api: D2Api) {}

    get(view: LayoutView): FutureData<Maybe<LayoutSettings>> {
        const dataStore = this.api.dataStore(dataStoreNamespace);

        return apiToFuture(dataStore.get<StoredLayoutSettings>(getKey(view))).map(stored =>
            stored ? fromStored(view, stored) : undefined
        );
    }

    save(settings: LayoutSettings): FutureData<void> {
        const dataStore = this.api.dataStore(dataStoreNamespace);

        return apiToFuture(dataStore.save(getKey(settings.view), toStored(settings)));
    }
}

function getKey(view: LayoutView): string {
    return `layoutSettings_${view}`;
}

export function fromStored(view: LayoutView, stored: StoredLayoutSettings): LayoutSettings {
    const sections = Object.entries(stored.accesses ?? {}).map(
        ([key, section]): LayoutSection => ({
            ...fromStoredColumn(key, section),
            columns: Object.entries(section.columns ?? {}).map(([columnKey, column]) =>
                fromStoredColumn(columnKey, column)
            ),
        })
    );

    return LayoutSettings.create({
        view: view,
        advancedUserGroupIds: stored.advancedUserGroups ?? [],
        sections: sections,
    });
}

function fromStoredColumn(key: string, column: StoredColumn): LayoutColumn {
    return {
        key: key,
        index: column.index,
        translationKey: column.translationKey,
        access: accessByStored[column.access],
    };
}

export function toStored(settings: LayoutSettings): StoredLayoutSettings {
    return {
        advancedUserGroups: settings.advancedUserGroupIds,
        accesses: Object.fromEntries(
            settings.sections.map(section => [
                section.key,
                {
                    ...toStoredColumn(section),
                    ...(section.columns.length > 0
                        ? {
                              columns: Object.fromEntries(
                                  section.columns.map(column => [
                                      column.key,
                                      toStoredColumn(column),
                                  ])
                              ),
                          }
                        : {}),
                },
            ])
        ),
    };
}

function toStoredColumn(column: LayoutColumn): StoredColumn {
    return {
        index: column.index,
        translationKey: column.translationKey,
        access: storedByAccess[column.access],
    };
}
