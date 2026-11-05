import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryCombo, DataSet } from "$/domain/entities/DataSet";
import { CategoryCombosSection } from "$/webapp/pages/datasets/CategoryCombosSection";
import { DataSetSectionsSection } from "$/webapp/pages/datasets/DataSetSectionsSection";

const element = (name: string) => ({
    id: name,
    name,
    shortName: `${name} short`,
    formName: `${name} form`,
    description: "",
    valueType: "NUMBER",
    optionNames: ["Yes", ""],
    categoryCombo: { id: "cc1", name: "Combo 1" },
});

const dataSet = new DataSet({
    id: "ds",
    name: "Data set",
    hasRealSections: true,
    dataElementIds: ["a", "b"],
    sections: [
        { id: "s1", name: "Section 1", dataElements: [element("a")] },
        { id: "s2", name: "Section 2", dataElements: [] },
    ],
});

describe("DataSetSectionsSection", () => {
    it("shows each section with its count and only the allowed columns", () => {
        const view = render(
            <DataSetSectionsSection
                dataSet={dataSet}
                canSeeSection
                canSeeColumn={column => ["name", "options"].includes(column)}
            />
        );

        expect(view.getByText("Section 1")).toBeInTheDocument();
        expect(view.getByText("Section 2")).toBeInTheDocument();
        expect(view.getByText("Number of Elements in Section: 1")).toBeInTheDocument();
        expect(view.getByText("Number of Elements in Section: 0")).toBeInTheDocument();
        expect(view.getAllByText("Name")).toHaveLength(2);
        expect(view.queryByText("Form Name")).not.toBeInTheDocument();
        expect(view.getByText("Yes")).toBeInTheDocument();
        expect(view.getByText("-")).toBeInTheDocument();
    });

    it("renders nothing without access to the section", () => {
        const view = render(
            <DataSetSectionsSection
                dataSet={dataSet}
                canSeeSection={false}
                canSeeColumn={() => true}
            />
        );

        expect(view.queryByText("Section 1")).not.toBeInTheDocument();
    });
});

describe("CategoryCombosSection", () => {
    const combos: CategoryCombo[] = [
        {
            id: "cc1",
            name: "Combo 1",
            categories: [
                { name: "Age", items: ["<5", ">=5"] },
                { name: "Sex", items: ["Male", "Female"] },
            ],
        },
    ];

    it("spans the combo name over its categories", () => {
        const view = render(
            <MemoryRouter>
                <CategoryCombosSection
                    combos={{ type: "success", data: combos }}
                    canSeeSection
                    canSeeColumn={() => true}
                />
            </MemoryRouter>
        );

        expect(view.getAllByText("Combo 1")).toHaveLength(1);
        expect(view.getByText("Age")).toBeInTheDocument();
        expect(view.getByText("Sex")).toBeInTheDocument();
        expect(view.getByText("Female")).toBeInTheDocument();
        expect(view.getAllByRole("row")).toHaveLength(3);
    });
});
