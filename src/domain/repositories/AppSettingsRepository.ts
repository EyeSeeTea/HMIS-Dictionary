import { AppSettings, AppSettingsAttrs } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";

export interface AppSettingsRepository {
    get(): FutureData<AppSettings>;
    /** Writes only the given keys. */
    update(changes: Partial<AppSettingsAttrs>): FutureData<void>;
}
