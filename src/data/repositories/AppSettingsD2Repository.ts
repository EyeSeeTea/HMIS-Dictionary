import { apiToFuture } from "$/data/api-futures";
import { AppSettings, AppSettingsAttrs, defaultTags } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";
import { D2Api } from "$/types/d2-api";
import { Maybe } from "$/utils/ts-utils";

export const dataStoreNamespace = "HMIS_Dictionary";

type StoredSetup = { value?: string; object?: { id?: string; name?: string } };

type StoredKeys = {
    setup_userGroup: Maybe<StoredSetup>;
    setup_organisationUnitGroupSet: Maybe<StoredSetup>;
    setup_dossierConfigComplete: Maybe<{ value?: boolean }>;
    blacklist_dataElementGroups: Maybe<string[]>;
    blacklist_dataSets: Maybe<string[]>;
    blacklist_programs: Maybe<string[]>;
    blacklist_indicatorGroups: Maybe<string[]>;
    blacklist_tag: Maybe<string>;
    notInUse_indicatorGroups: Maybe<string[]>;
    notInUse_programIndicatorGroups: Maybe<string[]>;
    notInUse_tag: Maybe<string>;
    legacy_dataElementGroups: Maybe<string[]>;
    legacy_optionGroups: Maybe<string[]>;
    selector_limitToUserOrgUnits: Maybe<{ value?: boolean }>;
};

type Key = keyof StoredKeys;

const keys: Key[] = [
    "setup_userGroup",
    "setup_organisationUnitGroupSet",
    "setup_dossierConfigComplete",
    "blacklist_dataElementGroups",
    "blacklist_dataSets",
    "blacklist_programs",
    "blacklist_indicatorGroups",
    "blacklist_tag",
    "notInUse_indicatorGroups",
    "notInUse_programIndicatorGroups",
    "notInUse_tag",
    "legacy_dataElementGroups",
    "legacy_optionGroups",
    "selector_limitToUserOrgUnits",
];

export class AppSettingsD2Repository implements AppSettingsRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<AppSettings> {
        return Future.parallel(
            keys.map(key => this.getKey(key).map(value => [key, value] as const)),
            { concurrency: keys.length }
        ).map(entries => toAppSettings(Object.fromEntries(entries) as StoredKeys));
    }

    /** Only writes the keys that really change, as each one is a separate form in Admin. */
    update(changes: Partial<AppSettingsAttrs>): FutureData<void> {
        return this.get().flatMap(current => {
            const next = current.update(changes);
            const before = toStoredKeys(current);
            const after = toStoredKeys(next);
            const changedKeys = keys.filter(
                key =>
                    after[key] !== undefined &&
                    JSON.stringify(after[key]) !== JSON.stringify(before[key])
            );

            return Future.sequential(changedKeys.map(key => this.saveKey(key, after[key]))).map(
                () => undefined
            );
        });
    }

    /** A value that cannot be read counts as not configured, as it always has. */
    private getKey(key: Key): FutureData<unknown> {
        return apiToFuture(this.api.dataStore(dataStoreNamespace).get<unknown>(key)).flatMapError(
            () => Future.success<Error, unknown>(undefined)
        );
    }

    private saveKey(key: Key, value: unknown): FutureData<void> {
        return apiToFuture(this.api.dataStore(dataStoreNamespace).save(key, value as object));
    }
}

function toAppSettings(stored: StoredKeys): AppSettings {
    const groupSetId = stored.setup_organisationUnitGroupSet?.value;
    const adminName = stored.setup_userGroup?.value;

    return AppSettings.create({
        adminGroup: adminName
            ? { id: stored.setup_userGroup?.object?.id ?? "", name: adminName }
            : undefined,
        healthServiceGroupSet: groupSetId
            ? {
                  id: groupSetId,
                  name: stored.setup_organisationUnitGroupSet?.object?.name ?? "",
              }
            : undefined,
        dossierConfigComplete: Boolean(stored.setup_dossierConfigComplete?.value),
        blacklist: {
            dataElementGroupIds: stored.blacklist_dataElementGroups ?? [],
            dataSetIds: stored.blacklist_dataSets ?? [],
            programIds: stored.blacklist_programs ?? [],
            indicatorGroupIds: stored.blacklist_indicatorGroups ?? [],
            tag: stored.blacklist_tag || defaultTags.blacklist,
        },
        notInUse: {
            indicatorGroupIds: stored.notInUse_indicatorGroups ?? [],
            programIndicatorGroupIds: stored.notInUse_programIndicatorGroups ?? [],
            tag: stored.notInUse_tag || defaultTags.notInUse,
        },
        legacy: {
            dataElementGroupIds: stored.legacy_dataElementGroups ?? [],
            optionGroupIds: stored.legacy_optionGroups ?? [],
        },
        limitSelectorsToUserOrgUnits: Boolean(stored.selector_limitToUserOrgUnits?.value),
    });
}

function toStoredKeys(settings: AppSettings): StoredKeys {
    return {
        // The value is the name for the admin group, and the id for the group set
        setup_userGroup: toSetup(settings.adminGroup, group => group.name),
        setup_organisationUnitGroupSet: toSetup(settings.healthServiceGroupSet, set => set.id),
        setup_dossierConfigComplete: { value: settings.dossierConfigComplete },
        blacklist_dataElementGroups: settings.blacklist.dataElementGroupIds,
        blacklist_dataSets: settings.blacklist.dataSetIds,
        blacklist_programs: settings.blacklist.programIds,
        blacklist_indicatorGroups: settings.blacklist.indicatorGroupIds,
        blacklist_tag: settings.blacklist.tag,
        notInUse_indicatorGroups: settings.notInUse.indicatorGroupIds,
        notInUse_programIndicatorGroups: settings.notInUse.programIndicatorGroupIds,
        notInUse_tag: settings.notInUse.tag,
        legacy_dataElementGroups: settings.legacy.dataElementGroupIds,
        legacy_optionGroups: settings.legacy.optionGroupIds,
        selector_limitToUserOrgUnits: { value: settings.limitSelectorsToUserOrgUnits },
    };
}

function toSetup(ref: Maybe<NamedRef>, getValue: (ref: NamedRef) => string): Maybe<StoredSetup> {
    return ref ? { value: getValue(ref), object: { id: ref.id, name: ref.name } } : undefined;
}
