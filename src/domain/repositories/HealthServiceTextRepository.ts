import { FutureData } from "$/domain/entities/generic/Future";
import { HealthServiceTranslations } from "$/domain/entities/HealthServiceTranslations";
import { Id } from "$/domain/entities/Ref";
import { Locale } from "$/domain/entities/Shared";

export interface HealthServiceTextRepository {
    getText(healthServiceId: Id, locale: Locale): FutureData<string>;
    getTranslations(healthServiceId: Id): FutureData<HealthServiceTranslations>;
    saveTranslations(translations: HealthServiceTranslations): FutureData<void>;
}
