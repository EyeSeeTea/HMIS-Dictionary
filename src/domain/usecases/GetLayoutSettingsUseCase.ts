import { AppSettings } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { LayoutSettings, LayoutView } from "$/domain/entities/LayoutSettings";
import { LayoutSettingsRepository } from "$/domain/repositories/LayoutSettingsRepository";

export class GetLayoutSettingsUseCase {
    constructor(private layoutSettingsRepository: LayoutSettingsRepository) {}

    execute(view: LayoutView, settings: AppSettings): FutureData<LayoutSettings> {
        const defaults = LayoutSettings.defaults(view, settings.metadataIds.advancedUserGroup);

        return this.layoutSettingsRepository
            .get(view)
            .flatMap(stored => {
                if (stored)
                    return Future.success<Error, LayoutSettings>(stored.mergedOverDefaults());

                // Saved on first view, whichever the user: if it fails, the defaults still apply
                return this.layoutSettingsRepository
                    .save(defaults)
                    .map(() => defaults)
                    .flatMapError(() => Future.success<Error, LayoutSettings>(defaults));
            })
            .flatMapError(() => Future.success<Error, LayoutSettings>(defaults));
    }
}
