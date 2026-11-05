import { Locator } from "@playwright/test";
import { App } from "./pages";

/** Page objects of the features that come from HIS Dictionary. */

export class OrgUnitTreePanel {
    readonly panel: Locator;

    constructor(app: App) {
        this.panel = app.root.locator('[data-test="org-unit-tree"]');
    }

    get opener() {
        return this.panel.getByRole("button", { name: /Organisation units/ });
    }

    get tree() {
        return this.panel.getByRole("tree");
    }

    get assigned() {
        return this.panel.locator('[data-assigned="true"]');
    }

    get items() {
        return this.panel.getByRole("treeitem");
    }

    get collapsedBranches() {
        return this.panel.locator('[role="treeitem"][aria-expanded="false"] > button');
    }

    get summary() {
        return this.panel.getByText(/Assigned organisation units: \d+/);
    }
}
