/**
 * Helpers for third-party widgets that the React app is free to replace. Selectors specific to those
 * widgets live only in this file, so moving to React means changing this file and not the specs.
 */
import { expect, Locator, Page } from "@playwright/test";

type Root = Page | ReturnType<Page["frameLocator"]>;

/** The Search table: sorting, column filters and pagination (ng-table today). */
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
        const cells = this.rows.locator(`td:nth-child(${index + 1}) > span`);
        return cells.allTextContents();
    }

    async cell(rowIndex: number, name: string): Promise<Locator> {
        const index = await this.columnIndex(name);
        return this.rows.nth(rowIndex).locator("td").nth(index);
    }

    async sortBy(name: string) {
        const index = await this.columnIndex(name);
        await this.headerCells.nth(index).click();
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
        return this.root.locator(".ng-table-counts button", {
            hasText: new RegExp(`^\\s*${size}\\s*$`),
        });
    }

    async setPageSize(size: number) {
        await this.pageSizeButton(size).click();
        await expect(this.pageSizeButton(size)).toHaveClass(/active/);
    }

    get activePage() {
        return this.root.locator(".ng-table-pagination li.active");
    }

    pageButton(page: number) {
        return this.root
            .locator(".ng-table-pagination li a", { hasText: new RegExp(`^\\s*${page}\\s*$`) })
            .first();
    }

    async goToPage(page: number) {
        await this.pageButton(page).click();
        await expect(this.activePage).toHaveText(new RegExp(`^\\s*${page}\\s*$`));
    }

    /** The number of the last page, or 1 when there is no pagination. */
    async pageCount(): Promise<number> {
        const pager = this.root.locator(".ng-table-pagination li a");
        const numbers = (await pager.allInnerTexts())
            .map(Number)
            .filter(n => !Number.isNaN(n) && n > 0);
        return numbers.length ? Math.max(...numbers) : 1;
    }
}

/** The dossier description editor (TinyMCE today). */
export class RichTextEditor {
    constructor(private root: Root) {}

    private get frame() {
        return this.root.frameLocator(".mce-edit-area iframe");
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

    toolbarButton(name: string) {
        return this.root
            .locator(
                `.mce-toolbar [aria-label="${name}"], .mce-toolbar .mce-btn:has-text("${name}")`
            )
            .first();
    }

    /** TinyMCE syncs its content about 400ms after a change, so saving earlier loses it (P4). */
    private async commit() {
        await this.root.locator("#drpBoxLanguage").focus();
        await this.body.page().waitForTimeout(700);
    }
}
