import { OptionSet } from "$/domain/entities/OptionSet";
import { NamedRef } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";

export type D2OptionSet = {
    displayName: string;
    options: { id: string; code?: string; displayName: string }[];
};

export function text(value: Maybe<string>): string {
    return value ?? "";
}

export function toNamedRef(item: { id: string; displayName: string }): NamedRef {
    return { id: item.id, name: item.displayName };
}

/** For queries that read the untranslated name (decision 5). */
export function toRawNamedRef(item: Maybe<{ id: string; name: string }>): Maybe<NamedRef> {
    return item ? { id: item.id, name: item.name } : undefined;
}

export function toOptionSet(optionSet: Maybe<D2OptionSet>): Maybe<OptionSet> {
    if (!optionSet) return undefined;

    return OptionSet.create({
        name: optionSet.displayName,
        options: optionSet.options.map(option => ({
            id: option.id,
            code: text(option.code),
            name: option.displayName,
        })),
    });
}
