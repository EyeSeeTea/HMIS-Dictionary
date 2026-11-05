import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, DataTableColumn } from "$/webapp/components/data-table/DataTable";

type Row = { id: string; name: string; size: number };

const rows: Row[] = [
    { id: "1", name: "Charlie", size: 3 },
    { id: "2", name: "alpha", size: 10 },
    { id: "3", name: "Bravo", size: 2 },
];

const columns: DataTableColumn<Row>[] = [
    { key: "name", header: "Name", render: r => r.name, sortValue: r => r.name },
    { key: "size", header: "Size", render: r => r.size, sortValue: r => r.size },
    { key: "hidden", header: "Hidden", render: () => "x", visible: false },
];

function bodyNames(view: ReturnType<typeof render>): string[] {
    const [, ...bodyRows] = view.getAllByRole("row");
    return bodyRows.map(row => within(row).getAllByRole("cell").at(0)?.textContent ?? "");
}

function sortButton(view: ReturnType<typeof render>, index: number): HTMLElement {
    const button = view.getAllByRole("button", { name: /sort/i }).at(index);
    if (!button) throw new Error(`No sort button ${index}`);
    return button;
}

describe("DataTable", () => {
    it("shows only visible columns", () => {
        const view = render(<DataTable rows={rows} columns={columns} getRowId={r => r.id} />);

        expect(view.queryByText("Hidden")).not.toBeInTheDocument();
        expect(view.getByText("Size")).toBeInTheDocument();
    });

    it("sorts ascending and then descending, case-insensitively", () => {
        const view = render(<DataTable rows={rows} columns={columns} getRowId={r => r.id} />);
        const sort = () => fireEvent.click(sortButton(view, 0));

        sort();
        expect(bodyNames(view)).toEqual(["alpha", "Bravo", "Charlie"]);
        sort();
        expect(bodyNames(view)).toEqual(["Charlie", "Bravo", "alpha"]);
    });

    it("sorts numbers as numbers", () => {
        const view = render(<DataTable rows={rows} columns={columns} getRowId={r => r.id} />);

        fireEvent.click(sortButton(view, 1));

        expect(bodyNames(view)).toEqual(["Bravo", "Charlie", "alpha"]);
    });

    it("shows the empty text with no rows", () => {
        const view = render(
            <DataTable rows={[]} columns={columns} getRowId={r => r.id} emptyText="Nothing" />
        );

        expect(view.getByText("Nothing")).toBeInTheDocument();
    });

    it("paginates", () => {
        const view = render(
            <DataTable rows={rows} columns={columns} getRowId={r => r.id} pageSizes={[2, 50]} />
        );

        expect(bodyNames(view)).toEqual(["Charlie", "alpha"]);
    });

    describe("priority rows and changes of rows", () => {
        const isCharlie = (row: Row) => row.id === "1";

        const table = (
            onPageRowsChange: (rows: Row[]) => void,
            isPriorityRow?: typeof isCharlie
        ) => (
            <DataTable
                rows={rows}
                // A new array of columns each time, as pages do
                columns={[...columns]}
                getRowId={row => row.id}
                isPriorityRow={isPriorityRow}
                onPageRowsChange={onPageRowsChange}
            />
        );

        it("keeps the priority rows on top, also when sorting by a column", () => {
            const view = render(table(() => {}, isCharlie));

            fireEvent.click(sortButton(view, 0));

            expect(bodyNames(view)).toEqual(["Charlie", "alpha", "Bravo"]);
        });

        it("does not report the rows again when only the array of columns is new", () => {
            const onPageRowsChange = vi.fn();
            const view = render(table(onPageRowsChange, isCharlie));
            const calls = onPageRowsChange.mock.calls.length;

            view.rerender(table(onPageRowsChange, isCharlie));

            expect(onPageRowsChange).toHaveBeenCalledTimes(calls);
        });
    });
});
