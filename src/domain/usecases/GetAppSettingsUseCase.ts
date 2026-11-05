import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";

export class GetAppSettingsUseCase {
    constructor(private appSettingsRepository: AppSettingsRepository) {}

    execute(): FutureData<AppSettings> {
        return this.appSettingsRepository.get();
    }
}
