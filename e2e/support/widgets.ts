/**
 * Helpers for third-party widgets that the React app is free to replace. Selectors specific to those
 * widgets live only in this file, so moving to React means changing this file and not the specs.
 */
import { expect, Locator, Page } from "@playwright/test";
import { escapeRegex } from "./data";

type Root = Page | ReturnType<Page["frameLocator"]>;

/** The Search table: sorting, column filters and pagination (the app's own table in React). */
export class SearchTable {
    readonly table: Locator;

    constructor(private root: Root) {
        this.table = root.locator("#searchTable");
    }

    get rows() {
        return this.table.locator("tbody tr");
    }

    private get headerCells() {
        return this.table.locator("thead tr").first().locator("th");
    }

    private get filterRow() {
        return this.table.locator("thead tr").nth(1);
    }

    async waitLoaded() {
        await expect(this.rows.first()).toBeVisible({ timeout: 150_000 });
    }

    async headers(): Promise<string[]> {
        const texts = await this.headerCells.allInnerTexts();
        return texts.map(text => text.trim()).filter(Boolean);
    }

    async columnIndex(name: string): Promise<number> {
        const index = (await this.headers()).indexOf(name);
        if (index < 0) throw new Error(`Column not found: ${name}`);
        return index;
    }

    async columnValues(name: string): Promise<string[]> {
        const index = await this.columnIndex(name);
        const cells = this.rows.locator(`td:nth-child(${index + 1})`);
        return (await cells.allInnerTexts()).map(text => text.trim());
    }

    /** The values as sorted, keeping spaces at the start of a name that the browser does not display. */
    async columnSortValues(name: string): Promise<string[]> {
        const index = await this.columnIndex(name);
        const cells = this.rows.locator(`td:nth-child(${index + 1})`);
        return cells.allTextContents();
    }

    async cell(rowIndex: number, name: string): Promise<Locator> {
        const index = await this.columnIndex(name);
        return this.rows.nth(rowIndex).locator("td").nth(index);
    }

    async sortBy(name: string) {
        const index = await this.columnIndex(name);
        await this.headerCells.nth(index).getByRole("button").first().click();
    }

    filterInput(index: number) {
        return this.filterRow.locator("th").nth(index).locator("input");
    }

    get filterInputs() {
        return this.filterRow.locator("input:visible");
    }

    async filter(name: string, value: string) {
        await this.filterInput(await this.columnIndex(name)).fill(value);
    }

    pageSizeButton(size: number) {
        return this.root.locator('[data-test="page-sizes"] button', {
            hasText: new RegExp(`^\\s*${size}\\s*$`),
        });
    }

    async setPageSize(size: number) {
        await this.pageSizeButton(size).click();
        await expect(this.pageSizeButton(size)).toHaveAttribute("aria-pressed", "true");
    }

    get activePage() {
        return this.root.locator('[data-test="pages"] li.active');
    }

    pageButton(page: number) {
        return this.root
            .locator('[data-test="pages"] li button', {
                hasText: new RegExp(`^\\s*${page}\\s*$`),
            })
            .first();
    }

    async goToPage(page: number) {
        await this.pageButton(page).click();
        await expect(this.activePage).toHaveText(new RegExp(`^\\s*${page}\\s*$`));
    }

    /** The number of the last page, or 1 when there is no pagination. */
    async pageCount(): Promise<number> {
        const pager = this.root.locator('[data-test="pages"] li button');
        const numbers = (await pager.allInnerTexts())
            .map(Number)
            .filter(n => !Number.isNaN(n) && n > 0);
        return numbers.length ? Math.max(...numbers) : 1;
    }
}

/** The dossier description editor (TinyMCE). */
export class RichTextEditor {
    constructor(private root: Root) {}

    private get frame() {
        return this.root.frameLocator("iframe.tox-edit-area__iframe");
    }

    get body() {
        return this.frame.locator("body");
    }

    async waitLoaded() {
        await expect(this.body).toBeVisible();
    }

    async html(): Promise<string> {
        return this.body.innerHTML();
    }

    async text(): Promise<string> {
        return (await this.body.innerText()).trim();
    }

    /** Replaces the content by typing, as a user would, so the editor reports the change. */
    async type(text: string) {
        await this.body.click();
        await this.body.press("ControlOrMeta+a");
        await this.body.press("Delete");
        await this.body.pressSequentially(text);
        await this.commit();
    }

    async clear() {
        await this.body.click();
        await this.body.press("ControlOrMeta+a");
        await this.body.press("Delete");
        await this.commit();
    }

    /** Applies a toolbar action by its accessible name, for example "Bold" or "Bullet list". */
    async toolbar(name: string) {
        await this.toolbarButton(name).click();
    }

    /** TinyMCE 8 names two buttons differently from the old editor, and adds the current value. */
    toolbarButton(name: string) {
        const prefixes: Record<string, string> = { Formats: "Format", "Font Sizes": "Font size" };
        const prefix = prefixes[name];
        const selector = prefix
            ? `.tox-toolbar [aria-label^="${prefix}"]`
            : `.tox-toolbar [aria-label="${name}"], .tox-toolbar [title="${name}"]`;

        return this.root.locator(selector).first();
    }

    /** The app has the text at once, so saving right after this must not lose it (P4). */
    private async commit() {
        await this.root.locator("#drpBoxLanguage").focus();
    }
}

/** A @dhis2/ui MultiSelect, by its `dataTest`. Its menu opens in a layer, outside the select. */
export class MultiSelect {
    readonly root: Locator;

    constructor(
        private scope: Root,
        private dataTest: string
    ) {
        this.root = scope.locator(`[data-test="${dataTest}"]`);
    }

    get chips() {
        return this.root.locator('[data-test="dhis2-uicore-chip"]');
    }

    async selected(): Promise<string[]> {
        await expect(this.root.locator(`[data-test="${this.dataTest}-loading"]`)).toHaveCount(0);
        return (await this.chips.allInnerTexts()).map(text => text.trim());
    }

    /** Picks an option by its whole label, filtering first, as the lists can be long. */
    async pick(label: string) {
        // Centered first: near an edge, the menu opens partly out of the viewport
        await this.root.evaluate(element => element.scrollIntoView({ block: "center" }));
        // On the arrow: the rest of the input has the chips, which remove on click
        const box = await this.root.boundingBox();
        if (!box) throw new Error(`${this.dataTest} is not visible`);
        await this.root.click({ position: { x: box.width - 12, y: box.height / 2 } });
        const filter = this.scope.locator(`[data-test="${this.dataTest}-filterinput"] input`);
        await filter.fill(label);
        await this.scope
            .locator('[data-test="dhis2-uicore-multiselectoption"]')
            .filter({ hasText: new RegExp(`^\\s*${escapeRegex(label)}\\s*$`) })
            .first()
            .click();
        await this.scope.locator("body").press("Escape");
    }

    /** The "Clear all" button of the input, shown when something is selected. */
    async clear() {
        await this.selected();
        const clear = this.root.locator(`[data-test="${this.dataTest}-clear"]`);
        if ((await clear.count()) > 0) await clear.click();
        await expect(this.chips).toHaveCount(0);
    }

    async remove(label: string) {
        await this.chips
            .filter({ hasText: label })
            .locator('[data-test="dhis2-uicore-chip-remove"]')
            .click();
    }
}
