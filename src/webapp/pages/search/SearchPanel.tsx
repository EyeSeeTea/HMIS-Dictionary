import React from "react";
import { Button, Checkbox, InputField } from "@dhis2/ui";
import { IconSearch16 } from "@dhis2/ui-icons";
import { searchTexts } from "$/webapp/pages/search/searchTexts";
import css from "./SearchPanel.module.css";

export type SearchPanelProps = {
    globalTerm: string;
    onGlobalTermChange: (term: string) => void;
    showFilters: boolean;
    onShowFiltersChange: (show: boolean) => void;
    hasFilters: boolean;
    onClear: () => void;
};

/** Global search (updates as you type), "Clear filters" and the toggle of the column filters. */
export const SearchPanel: React.FC<SearchPanelProps> = React.memo(props => {
    const {
        globalTerm,
        onGlobalTermChange,
        showFilters,
        onShowFiltersChange,
        hasFilters,
        onClear,
    } = props;

    return (
        <form className={css.form} onSubmit={event => event.preventDefault()} role="search">
            <div className={css.input}>
                <InputField
                    name="searchTerm"
                    value={globalTerm}
                    placeholder={searchTexts.srch_SearchAll_Here()}
                    onChange={({ value }) => onGlobalTermChange(value ?? "")}
                    dataTest="global-search"
                />
            </div>
            <Button
                type="submit"
                small
                icon={<IconSearch16 />}
                title="Go"
                dataTest="search-submit"
            />
            <Button small primary disabled={!hasFilters} onClick={onClear}>
                {searchTexts.srch_SearchAll_Clear()}
            </Button>
            <Checkbox
                dense
                label={searchTexts.srch_SearchAll_Row()}
                checked={showFilters}
                onChange={({ checked }) => onShowFiltersChange(checked)}
            />
        </form>
    );
});
