import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "$/webapp/components/error-boundary/ErrorBoundary";

const Broken = (): React.ReactElement => {
    throw new Error("Broken");
};

describe("ErrorBoundary", () => {
    it("shows its children when there is no error", () => {
        const view = render(<ErrorBoundary>Content</ErrorBoundary>);

        expect(view.getByText("Content")).toBeTruthy();
    });

    it("shows a message instead of what fails, and leaves the rest alone", () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const view = render(
            <>
                <p>Sibling</p>
                <ErrorBoundary>
                    <Broken />
                </ErrorBoundary>
            </>
        );

        expect(view.getByText("Something went wrong")).toBeTruthy();
        expect(view.getByText("Sibling")).toBeTruthy();
        consoleError.mockRestore();
    });
});
