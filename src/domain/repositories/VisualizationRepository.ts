import { FutureData } from "$/domain/entities/generic/Future";
import { IndicatorVisualization } from "$/domain/entities/IndicatorVisualization";
import { Id } from "$/domain/entities/Ref";

export interface VisualizationRepository {
    /** Creates it or updates the one with the same name, with its sharing. */
    save(visualization: IndicatorVisualization): FutureData<Id>;
}
