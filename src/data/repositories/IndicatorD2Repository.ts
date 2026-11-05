import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorFormula } from "$/domain/entities/IndicatorFormula";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import { D2Api } from "$/types/d2-api";
import { text } from "./d2-mappers";

/** Each screen reads different names and descriptions, as today (decision 5). */
type Source = { name: "name" | "displayName"; description: "description" | "displayDescription" };

export class IndicatorD2Repository implements IndicatorRepository {
    constructor(private api: D2Api) {}

    getForIndicatorsScreen(): FutureData<Indicator[]> {
        return this.get({ name: "displayName", description: "displayDescription" });
    }

    getForDataSets(): FutureData<Indicator[]> {
        return this.get({ name: "displayName", description: "displayDescription" });
    }

    getForPrograms(): FutureData<Indicator[]> {
        return this.get({ name: "displayName", description: "displayDescription" });
    }

    private get(source: Source): FutureData<Indicator[]> {
        return apiToFuture(
            this.api.models.indicators.get({
                fields: {
                    id: true,
                    name: true,
                    displayName: true,
                    displayShortName: true,
                    displayFormName: true,
                    description: true,
                    displayDescription: true,
                    indicatorType: { displayName: true },
                    numerator: true,
                    denominator: true,
                    numeratorDescription: true,
                    denominatorDescription: true,
                    indicatorGroups: { id: true },
                },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(indicator =>
                Indicator.create({
                    id: indicator.id,
                    name: indicator[source.name],
                    shortName: text(indicator.displayShortName),
                    formName: text(indicator.displayFormName),
                    description: text(indicator[source.description]),
                    type: text(indicator.indicatorType?.displayName),
                    numerator: IndicatorFormula.create({ expression: text(indicator.numerator) }),
                    denominator: IndicatorFormula.create({
                        expression: text(indicator.denominator),
                    }),
                    numeratorDescription: text(indicator.numeratorDescription),
                    denominatorDescription: text(indicator.denominatorDescription),
                    numeratorText: "",
                    denominatorText: "",
                    groupIds: indicator.indicatorGroups.map(group => group.id),
                })
            )
        );
    }
}
