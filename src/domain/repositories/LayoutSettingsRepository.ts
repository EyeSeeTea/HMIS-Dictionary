import { FutureData } from "$/domain/entities/generic/Future";
import { LayoutSettings, LayoutView } from "$/domain/entities/LayoutSettings";
import { Maybe } from "$/utils/ts-utils";

export interface LayoutSettingsRepository {
    get(view: LayoutView): FutureData<Maybe<LayoutSettings>>;
    save(settings: LayoutSettings): FutureData<void>;
}
