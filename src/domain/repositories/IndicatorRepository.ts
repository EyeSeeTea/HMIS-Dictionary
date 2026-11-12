import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";

/** One query per screen, as each reads different names and descriptions (decision 5). */
export interface IndicatorRepository {
    getForIndicatorsScreen(): FutureData<Indicator[]>;
    getForDataSets(): FutureData<Indicator[]>;
    getForPrograms(): FutureData<Indicator[]>;
}
