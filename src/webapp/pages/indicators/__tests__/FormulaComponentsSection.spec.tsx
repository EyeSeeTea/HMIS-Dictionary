import { MemoryRouter } from "react-router-dom";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormulaComponent } from "$/domain/entities/FormulaBreakdown";
import { FormulaComponentsSection } from "$/webapp/pages/indicators/FormulaComponentsSection";

const components: FormulaComponent[] = [
    { type: "aggregateDataElement", name: "Zeta", dataSetNames: ["DS 1"], programNames: [] },
    { type: "aggregateDataElement", name: "Alpha", dataSetNames: [], programNames: [] },
    { type: "trackerDataElement", name: "Mid", dataSetNames: [], programNames: ["Prog A"] },
];

function renderSection(hidden = false) {
    return render(
        <MemoryRouter>
            <FormulaComponentsSection
                id="numerator"
                title="Numerator"
                helpText="help"
                description="Some description"
                components={components}
                hidden={hidden}
                canSeeColumn={() => true}
                columnHelp={{ type: "t", name: "n", datasets: "d", program: "p" }}
            />
        </MemoryRouter>
    );
}

describe("FormulaComponentsSection", () => {
    it("sorts by name and shows No Value for aggregate elements in no data set", () => {
        const view = renderSection();

        const [, ...rows] = view.getAllByRole("row");
        expect(rows.map(row => row.textContent)).toEqual([
            expect.stringContaining("Alpha"),
            expect.stringContaining("Mid"),
            expect.stringContaining("Zeta"),
        ]);
        expect(view.getByText("No Value")).toBeInTheDocument();
    });

    it("links data sets and programs, and remembers the name for the next screen", () => {
        const view = renderSection();
        fireEvent.click(view.getByRole("link", { name: "DS 1" }));
        expect(sessionStorage.getItem("dataSetName")).toBe("DS 1");

        expect(view.getByRole("link", { name: "DS 1" })).toHaveAttribute("href", "/datasets");
        expect(view.getByRole("link", { name: "Prog A" })).toHaveAttribute(
            "href",
            "/dossierPrograms"
        );
    });

    it("shows the description", () => {
        expect(renderSection().getByText("Some description")).toBeInTheDocument();
    });

    it("renders nothing when hidden", () => {
        expect(renderSection(true).queryByText("Some description")).not.toBeInTheDocument();
    });
});
