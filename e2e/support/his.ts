import { expect, Locator } from "@playwright/test";
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

export class PrintSelectionPanel {
    readonly panel: Locator;

    constructor(app: App) {
        this.panel = app.root.locator('[data-test="print-selection"]');
    }

    async open() {
        await this.panel.getByRole("button", { name: /Print selection/ }).click();
    }

    /** A checkbox of a group of columns, or of sections when there is no group. */
    option(label: string, groupTitle?: string) {
        const scope = groupTitle
            ? this.panel
                  .locator("div", {
                      has: this.panel
                          .page()
                          .getByRole("heading", { name: groupTitle, exact: true }),
                  })
                  .last()
            : this.panel;
        return scope.getByRole("checkbox", { name: label, exact: true }).first();
    }

    /** Checkboxes are drawn over a hidden input, so the click goes to the label. */
    async uncheck(label: string, groupTitle?: string) {
        const option = this.option(label, groupTitle);
        await option.uncheck({ force: true });
        await expect(option).not.toBeChecked();
    }
}
