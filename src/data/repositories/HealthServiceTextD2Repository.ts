import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import {
    HealthServiceTranslations,
    Translation,
} from "$/domain/entities/HealthServiceTranslations";
import { Id } from "$/domain/entities/Ref";
import { Locale } from "$/domain/entities/Shared";
import { HealthServiceTextRepository } from "$/domain/repositories/HealthServiceTextRepository";
import { D2Api } from "$/types/d2-api";
import { text } from "./d2-mappers";

export class HealthServiceTextD2Repository implements HealthServiceTextRepository {
    constructor(private api: D2Api) {}

    getText(healthServiceId: Id, locale: Locale): FutureData<string> {
        return apiToFuture(
            this.api.get<{ displayDescription?: string }>(
                `/organisationUnitGroups/${healthServiceId}`,
                { fields: "displayDescription", paging: false, translate: true, locale: locale }
            )
        ).map(response => text(response.displayDescription));
    }

    getTranslations(healthServiceId: Id): FutureData<HealthServiceTranslations> {
        return apiToFuture(
            this.api.get<{ translations: Translation[] }>(
                `/organisationUnitGroups/${healthServiceId}`,
                { fields: "translations" }
            )
        ).map(({ translations }) =>
            HealthServiceTranslations.create({ healthServiceId, translations })
        );
    }

    saveTranslations(translations: HealthServiceTranslations): FutureData<void> {
        return apiToFuture(
            this.api.put<unknown>(
                `/organisationUnitGroups/${translations.healthServiceId}/translations`,
                {},
                { translations: translations.translations }
            )
        ).map(() => undefined);
    }
}
