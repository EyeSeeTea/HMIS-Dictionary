import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Locale } from "$/domain/entities/Shared";
import { HealthServiceTextRepository } from "$/domain/repositories/HealthServiceTextRepository";

export class GetHealthServiceTextUseCase {
    constructor(private healthServiceTextRepository: HealthServiceTextRepository) {}

    execute(healthServiceId: Id, locale: Locale): FutureData<string> {
        return this.healthServiceTextRepository.getText(healthServiceId, locale);
    }
}
