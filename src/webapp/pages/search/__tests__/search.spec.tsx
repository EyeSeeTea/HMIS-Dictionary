import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { layoutDefaults } from "$/domain/entities/layoutDefaults";
import { HighlightedText, splitByTerms } from "$/webapp/pages/search/HighlightedText";
import { SearchPanel } from "$/webapp/pages/search/SearchPanel";
import { defaultVisibleColumns, searchColumnDefs } from "$/webapp/pages/search/searchColumns";
import { columnTexts } from "$/webapp/pages/search/searchTexts";

describe("splitByTerms", () => {
    it("marks every occurrence, ignoring case", () => {
        expect(splitByTerms("Malaria and malaria", ["MALARIA"])).toEqual([
            { text: "Malaria", match: true },
            { text: " and ", match: false },
            { text: "malaria", match: true },
        ]);
    });

    it("treats regex characters as literal text", () => {
        expect(splitByTerms("a.b axb", ["a.b"])).toEqual([
            { text: "a.b", match: true },
            { text: " axb", match: false },
        ]);
    });

    it("returns the text as is without terms", () => {
        expect(splitByTerms("text", [])).toEqual([{ text: "text", match: false }]);
        expect(splitByTerms("text", [""])).toEqual([{ text: "text", match: false }]);
    });

    it("renders marks", () => {
        const view = render(<HighlightedText text="Cholera outbreak" terms={["cholera"]} />);

        expect(view.getByText("Cholera").tagName).toBe("MARK");
    });
});

describe("searchColumnDefs", () => {
    it("has one definition for every column of the search layout, and the other way round", () => {
        const fromLayout = layoutDefaults.search.flatMap(section =>
            section.columns.map(column => `${section.key}.${column.key}`)
        );
        const fromDefs = searchColumnDefs.map(def => `${def.section}.${def.layoutColumn}`);

        expect(fromDefs.sort()).toEqual(fromLayout.sort());
    });

    it("has a title and a help text for every column", () => {
        searchColumnDefs.forEach(def => {
            expect(columnTexts[def.key].title()).not.toBe("");
            expect(columnTexts[def.key].help()).not.toBe("");
        });
    });

    it("shows type, name, short name, description and service name by default", () => {
        expect(defaultVisibleColumns).toEqual([
            "object_type",
            "object_name",
            "object_shortName",
            "object_description",
            "service_name",
        ]);
    });
});

describe("SearchPanel", () => {
    const setup = (hasFilters: boolean) => {
        const onGlobalTermChange = vi.fn();
        const onClear = vi.fn();
        const view = render(
            <SearchPanel
                globalTerm=""
                onGlobalTermChange={onGlobalTermChange}
                showFilters
                onShowFiltersChange={() => {}}
                hasFilters={hasFilters}
                onClear={onClear}
            />
        );
        return { view, onGlobalTermChange, onClear };
    };

    it("reports the term as you type", () => {
        const { view, onGlobalTermChange } = setup(false);

        fireEvent.change(view.getByRole("textbox"), { target: { value: "hiv" } });

        expect(onGlobalTermChange).toHaveBeenCalledWith("hiv");
    });

    it("disables Clear filters without filters, and clears otherwise", () => {
        expect(setup(false).view.getByRole("button", { name: "Clear filters" })).toBeDisabled();
    });

    it("clears when there are filters", () => {
        const { view, onClear } = setup(true);

        fireEvent.click(view.getByRole("button", { name: "Clear filters" }));

        expect(onClear).toHaveBeenCalled();
    });
});
