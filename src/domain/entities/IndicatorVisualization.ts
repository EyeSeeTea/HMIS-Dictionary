import { Struct } from "./generic/Struct";
import { Indicator } from "./Indicator";
import { ProgramIndicator } from "./ProgramIndicator";
import { Id } from "./Ref";

export type IndicatorVisualizationAttrs = {
    name: string;
    itemIds: Id[];
    sharedWithAllUsers: boolean;
};

export class IndicatorVisualization extends Struct<IndicatorVisualizationAttrs>() {
    static build(
        source: Indicator | ProgramIndicator,
        allUsersGroupExists: boolean
    ): IndicatorVisualization {
        const formulaIds =
            source instanceof Indicator
                ? [
                      ...source.numerator.visualizationItemIds(),
                      ...source.denominator.visualizationItemIds(),
                  ]
                : [];

        return IndicatorVisualization.create({
            name: `${source.name} - ${source.id}`,
            itemIds: [...formulaIds, source.id],
            sharedWithAllUsers: allUsersGroupExists,
        });
    }
}
