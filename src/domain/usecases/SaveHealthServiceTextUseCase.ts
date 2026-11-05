import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Locale } from "$/domain/entities/Shared";
import { HealthServiceTextRepository } from "$/domain/repositories/HealthServiceTextRepository";

export class SaveHealthServiceTextUseCase {
    constructor(private healthServiceTextRepository: HealthServiceTextRepository) {}

    execute(healthServiceId: Id, locale: Locale, html: string): FutureData<void> {
        return this.healthServiceTextRepository
            .getTranslations(healthServiceId)
            .flatMap(translations =>
                this.healthServiceTextRepository.saveTranslations(
                    translations.withDescription(locale, html)
                )
            );
    }
}
