import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadErrors } from "$/webapp/components/load-errors/LoadErrors";

describe("LoadErrors", () => {
    it("shows nothing when no piece failed", () => {
        const view = render(
            <LoadErrors
                pieces={[
                    { label: "Rules", loader: { type: "success", data: [] } },
                    { label: "Stages", loader: { type: "loading" } },
                    { label: "Resources", loader: undefined },
                ]}
            />
        );

        expect(view.container.innerHTML).toBe("");
    });

    it("lists each failed piece with its error", () => {
        const view = render(
            <LoadErrors
                pieces={[
                    { label: "Rules", loader: { type: "error", error: new Error("HTTP 500") } },
                    { label: "Stages", loader: { type: "success", data: [] } },
                    { label: "Resources", loader: { type: "error", error: new Error("") } },
                ]}
            />
        );

        expect(view.getByText("Some sections could not be loaded")).toBeTruthy();
        expect(view.getByText("Rules: HTTP 500")).toBeTruthy();
        expect(view.getByText("Resources: Unknown error")).toBeTruthy();
        expect(view.queryByText(/Stages/)).toBeNull();
    });
});
