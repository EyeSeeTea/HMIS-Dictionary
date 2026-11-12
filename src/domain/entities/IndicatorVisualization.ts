import { Struct } from "./generic/Struct";
import { Indicator } from "./Indicator";
import { ProgramIndicator } from "./ProgramIndicator";
import { Id } from "./Ref";
import { Maybe } from "$/utils/ts-utils";

export type IndicatorVisualizationAttrs = {
    name: string;
    itemIds: Id[];
    /** The group of all users it is shared with, if the instance has it. */
    allUsersGroupId: Maybe<Id>;
};

export class IndicatorVisualization extends Struct<IndicatorVisualizationAttrs>() {
    static build(
        source: Indicator | ProgramIndicator,
        allUsersGroupId: Maybe<Id>
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
            allUsersGroupId: allUsersGroupId,
        });
    }
}
