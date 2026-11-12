import React from "react";
import { MultiSelect, MultiSelectOption } from "@dhis2/ui";
import { Id, NamedRef } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { compareNames } from "$/webapp/utils/compare";

export type IdsSelectProps = {
    options: NamedRef[];
    selected: Id[];
    onChange: (ids: Id[]) => void;
    disabled?: boolean;
    loading?: boolean;
    error?: boolean;
    placeholder?: string;
    dataTest?: string;
};

/** A filterable multi-select of metadata, by name. Selected ids not on the instance are kept, shown by id, so they can be removed. */
export const IdsSelect: React.FC<IdsSelectProps> = React.memo(props => {
    const { options, selected, onChange, disabled, loading, error, placeholder, dataTest } = props;

    const allOptions = React.useMemo(() => getOptions(options, selected), [options, selected]);

    return (
        <MultiSelect
            selected={loading ? [] : selected}
            onChange={({ selected }: { selected: Id[] }) => onChange(selected)}
            filterable
            clearable
            clearText={i18n.t("Clear all")}
            noMatchText={i18n.t("No match found")}
            filterPlaceholder={i18n.t("Type to filter")}
            placeholder={placeholder ?? i18n.t("None")}
            disabled={disabled}
            loading={loading}
            error={error}
            dataTest={dataTest}
            inputMaxHeight="120px"
        >
            {allOptions.map(option => (
                <MultiSelectOption key={option.id} value={option.id} label={option.name} />
            ))}
        </MultiSelect>
    );
});

function getOptions(options: NamedRef[], selected: Id[]): NamedRef[] {
    const known = new Set(options.map(option => option.id));
    const missing = selected
        .filter(id => !known.has(id))
        .map(id => ({ id, name: i18n.t("{{id}} (not found)", { id }) }));
    const sorted = [...options].sort((a, b) => compareNames(a.name, b.name));

    return [...missing, ...sorted];
}

export function isSameIds(ids1: Id[], ids2: Id[]): boolean {
    return ids1.length === ids2.length && ids1.every(id => ids2.includes(id));
}
