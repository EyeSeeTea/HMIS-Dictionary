import { describe, expect, it } from "vitest";
import { getReactComponent } from "$/utils/tests";
import { HomePage } from "$/webapp/pages/home/HomePage";

describe("HomePage", () => {
    it("renders the app title", () => {
        const view = getReactComponent(<HomePage />);

        expect(view.getByText("Metadata Dictionary")).toBeInTheDocument();
    });
});
