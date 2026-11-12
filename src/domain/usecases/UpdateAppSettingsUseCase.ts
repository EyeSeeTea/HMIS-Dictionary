import { AppSettingsAttrs } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";

export class UpdateAppSettingsUseCase {
    constructor(private appSettingsRepository: AppSettingsRepository) {}

    execute(changes: Partial<AppSettingsAttrs>): FutureData<void> {
        return this.appSettingsRepository.update(changes);
    }
}
