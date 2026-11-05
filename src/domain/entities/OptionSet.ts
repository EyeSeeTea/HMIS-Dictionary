import { Struct } from "./generic/Struct";
import { Id } from "./Ref";

export type Option = { id: Id; code: string; name: string };

export type OptionSetAttrs = { name: string; options: Option[] };

export class OptionSet extends Struct<OptionSetAttrs>() {
    withoutOptions(optionIds: Set<Id>): OptionSet {
        return this._update({ options: this.options.filter(option => !optionIds.has(option.id)) });
    }
}
