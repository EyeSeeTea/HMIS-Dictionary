import { expect, FrameLocator, Locator, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { Api } from "./api";
import { env } from "./env";
import { t } from "./i18n";
import { RichTextEditor, SearchTable } from "./widgets";

type Root = Page | FrameLocator;

export const tabIds = {
    search: "search",
    dossiers: "dossiers",
    programs: "dossierPrograms",
    dataSets: "datasets",
    indicators: "dossierIndicators",
    admin: "admin",
} as const;

export const NS_KEY_RE = (key: string) =>
    new RegExp(`/api(/\\d+)?/dataStore/HMIS_Dictionary/${key}$`);

/**
 * Forces dataStore values for this page only, without writing to the instance. A value of undefined
 * means the key does not exist. Writes to a mocked key succeed and are discarded.
 */
export async function mockKeys(page: Page, keys: Record<string, unknown>) {
    for (const [key, value] of Object.entries(keys)) {
        await page.route(NS_KEY_RE(key), route => {
            if (route.request().method() !== "GET") {
                return route.fulfill({ status: 200, json: { status: "OK" } });
            }
            return value === undefined
                ? route.fulfill({ status: 404, json: { httpStatusCode: 404, status: "ERROR" } })
                : route.fulfill({ json: value });
        });
    }
}

/** A table located through the heading above it. */
export function tableAfter(heading: Locator): Locator {
    return heading.locator("xpath=following::table[1]");
}

export async function headersOf(table: Locator): Promise<string[]> {
    return (await table.locator("thead th").allInnerTexts()).map(text => text.trim());
}

export function rowsOf(table: Locator): Locator {
    return table.locator("tbody tr");
}

export class App {
    readonly root: Root;

    constructor(
        readonly page: Page,
        root?: Root
    ) {
        this.root = root ?? page;
    }

    url(route = "") {
        return `${env.baseUrl}#/${route}`;
    }

    /** Always a full page load, because a hash change alone would keep the previous page state. */
    async open(route = "") {
        await this.page.goto("about:blank");
        await this.page.goto(this.url(route));
    }

    tab(id: string) {
        return this.root.locator(`#menu-container li#${id}`);
    }

    tabLink(id: string) {
        return this.tab(id).locator("a");
    }

    get tabs() {
        return this.root.locator("#menu-container li");
    }

    get loading() {
        return this.root.locator(".loading");
    }

    get printButton() {
        return this.root.locator(".printButton:visible").first();
    }

    get header() {
        return this.root.locator("#header");
    }

    async waitIdle() {
        await expect(this.loading).toBeHidden({ timeout: 150_000 });
    }

    /** Expects the element to be scrolled into view. */
    async expectInView(locator: Locator) {
        await expect(locator.first()).toBeInViewport({ timeout: 10_000 });
    }

    async stubPrint() {
        await this.page.addInitScript(() => {
            (window as any).__printCalls = 0;
            window.print = () => {
                (window as any).__printCalls++;
            };
        });
    }

    printCalls(): Promise<number> {
        return this.page.evaluate(() => (window as any).__printCalls);
    }

    async download(trigger: () => Promise<unknown>, file?: string) {
        const [download] = await Promise.all([this.page.waitForEvent("download"), trigger()]);
        const target = path.join(
            fs.mkdtempSync(path.join(require("os").tmpdir(), "hmis-e2e-")),
            file ?? download.suggestedFilename()
        );
        await download.saveAs(target);
        return { path: target, name: download.suggestedFilename() };
    }

    get settingsButton() {
        return this.root.getByRole("button", { name: t("layout_settings"), exact: true });
    }

    get settings() {
        return new LayoutSettings(this);
    }
}

export class LayoutSettings {
    readonly dialog: Locator;

    constructor(private app: App) {
        this.dialog = app.root.locator("#layoutSettingsModal");
    }

    async open() {
        await this.app.settingsButton.click();
        await expect(this.dialog).toBeVisible();
        await expect(this.dialog).toHaveCSS("opacity", "1");
    }

    get rows() {
        return this.dialog.locator("tbody tr");
    }

    get groups() {
        return this.dialog.locator('input[name="advancedUserGroups"]');
    }

    row(label: string) {
        return this.rows.filter({ hasText: label }).first();
    }

    button(name: string) {
        return this.dialog.getByRole("button", { name, exact: true });
    }

    get apply() {
        return this.button(t("APPLY_CHANGES"));
    }

    get restore() {
        return this.button(t("RESTORE_CHANGES"));
    }

    get close() {
        return this.dialog.locator(".modal-footer").getByRole("button", { name: t("CLOSE") });
    }

    get closeX() {
        return this.dialog.locator(".modal-header").getByRole("button", { name: "Close" });
    }

    get formatError() {
        return this.dialog.getByText(t("invalid_array_format"));
    }

    get groupError() {
        return this.dialog.getByText(t("invalid_user_group"));
    }

    /** Checkboxes of a row, in order: admin, advanced user, normal user. */
    checks(row: Locator) {
        return row.locator('input[type="checkbox"]');
    }
}

export class SearchPage extends App {
    readonly table = new SearchTable(this.root);

    async load() {
        await this.open("search");
        await this.table.waitLoaded();
        await this.waitIdle();
    }

    get globalSearch() {
        return this.root.locator('input[name="searchTerm"]');
    }

    get searchButton() {
        return this.root.locator('form button[type="submit"]');
    }

    get clearFilters() {
        return this.root.getByRole("button", { name: t("srch_SearchAll_Clear") });
    }

    get filtersCheckbox() {
        return this.root.getByRole("checkbox", { name: t("srch_SearchAll_Row") });
    }

    panelToggle(name: string) {
        return this.root.locator("#accordion").getByRole("button", { name });
    }

    /** Toggles a panel and waits for its animation, because clicks during it are ignored. */
    async togglePanel(name: string) {
        await this.panelToggle(name).click();
        await this.page.waitForFunction(() => !document.querySelector(".collapsing"));
    }

    get visualizationIcons() {
        return this.table.table.getByRole("button", { name: "View Table" });
    }

    async openColumns() {
        const panel = this.columnsPanel;
        if (!(await panel.isVisible())) await this.togglePanel(t("srch_SelectColumns"));
        await expect(this.columnCheckbox(t("object_name"))).toBeVisible();
    }

    get columnsPanel() {
        return this.root.locator("#collapseTwo");
    }

    get searchPanel() {
        return this.root.locator("#collapseOne");
    }

    get helpPanel() {
        return this.root.locator("#collapseThree");
    }

    columnCheckbox(label: string) {
        return this.columnsPanel
            .locator("label")
            .filter({ hasText: new RegExp(`^\\s*${label.replace(/[()]/g, "\\$&")}\\s*$`) })
            .locator("input");
    }

    get advancedLink() {
        return this.root.getByRole("link", { name: "Show / Hide advanced columns" });
    }

    async showColumn(label: string, advanced = false) {
        await this.openColumns();
        if (advanced && !(await this.columnCheckbox(label).isVisible())) {
            await this.advancedLink.click();
        }
        await this.columnCheckbox(label).check();
    }

    async searchFor(term: string) {
        await this.globalSearch.fill(term);
    }

    /** Filters by the ID column, because global search also matches ids inside formulas. */
    async filterById(id: string) {
        await this.showColumn(t("object_id"), true);
        await this.table.filter(t("object_id"), id);
    }

    get exportButton() {
        return this.root.getByRole("button", { name: t("srch_exportToExcel") });
    }

    get formulaDialog() {
        return this.root.locator("#indicatorFormulaModal");
    }
}

/** Selector-driven modules: Dossiers, Programs, Data Sets and Indicators. */
export class DossierPage extends App {
    get selector() {
        return this.root.locator("#drpBoxServices");
    }

    get options() {
        return this.selector.locator("option:not([disabled])");
    }

    async optionLabels(): Promise<string[]> {
        return (await this.options.allInnerTexts()).map(text => text.trim());
    }

    /** Waits until the selector has its options, then until loading has finished. */
    async loadRoute(route: string) {
        await this.open(route);
        await expect(this.options.first()).toBeAttached({ timeout: 120_000 });
        await this.waitIdle();
        // Selecting while the module's initial requests are running is a known problem (P2).
        await this.page.waitForLoadState("networkidle");
    }

    async select(label: string) {
        await expect(this.selector.locator("option", { hasText: label }).first()).toBeAttached();
        await this.selector.selectOption({ label });
        await expect(this.title).toHaveText(label);
        await this.waitIdle();
    }

    get title() {
        return this.root.locator("#DossierTitleContainer h1");
    }

    get toc() {
        return this.root.locator("#tocContainer");
    }

    tocLink(name: string | RegExp) {
        const text =
            typeof name === "string"
                ? new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`)
                : name;
        return this.toc.locator("a").filter({ hasText: text }).first();
    }

    async tocEntries(): Promise<string[]> {
        return (await this.toc.locator("a").allInnerTexts()).map(text => text.trim());
    }

    get topOfPage() {
        return this.root.locator("#headerDossierPanel");
    }

    get goToIndex() {
        return this.root.getByRole("link", { name: t("dos_GoToIndex") });
    }

    heading(name: string | RegExp) {
        return this.root.getByRole("heading", { name });
    }

    /** Checks each table of contents link, from the last to the first, scrolls to its target. */
    async expectTocScrolls(targets: Array<[string | RegExp, Locator]>) {
        for (const [name, target] of targets) {
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.tocLink(name).scrollIntoViewIfNeeded();
            await this.tocLink(name).click();
            await this.expectInView(target);
        }
    }

    /** Scrolls down, clicks a "Go to index" link, and expects the top of the page. */
    async expectGoToIndexScrolls() {
        const link = this.goToIndex.last();
        await link.scrollIntoViewIfNeeded();
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await link.click();
        await this.expectInView(this.topOfPage);
    }

    get pageText() {
        return this.root.locator("#view-container");
    }
}

export class DossiersPage extends DossierPage {
    readonly editor = new RichTextEditor(this.root);

    get editButton() {
        return this.root.locator("#editDescButton");
    }

    get saveButton() {
        return this.root.locator("#saveButton");
    }

    get languageSelector() {
        return this.root.locator("#drpBoxLanguage");
    }

    get backToReader() {
        return this.root
            .locator("#dossierDescription")
            .locator("xpath=following-sibling::div//button")
            .first();
    }

    get description() {
        return this.root.locator("#dossierDescription");
    }

    async selectService(label: string) {
        await this.select(label);
    }

    async openEditor() {
        await this.editButton.click();
        await this.editor.waitLoaded();
        await this.waitForEditorReady();
    }

    /** About 500ms after loading a description, the app resets the save button state, so wait for it. */
    async waitForEditorReady() {
        await expect(this.saveButton).not.toHaveClass(/disabled/);
        await this.waitIdle();
        await this.page.waitForTimeout(1_000);
    }
}

export class ProgramsPage extends DossierPage {
    async load() {
        await this.loadRoute("dossierPrograms");
    }

    get legacyToggle() {
        return this.root.getByRole("checkbox", { name: t("dos_showLegacy") });
    }

    get exportButton() {
        return this.root.getByRole("button", { name: t("dos_exportToExcel") });
    }

    get stages() {
        return this.root.locator("h2.stage");
    }

    get stageContainer() {
        return this.root.locator("#stageContainer");
    }

    get attributesHeading() {
        return this.root.locator("h3#trackedEntityAttributes");
    }

    get programIndicatorsHeading() {
        return this.root.locator("h2.indicatorGroup");
    }

    get indicatorsHeading() {
        return this.root.locator("h3#indicators");
    }

    get rulesHeading() {
        return this.root.locator("h3#rules");
    }

    get variablesHeading() {
        return this.root.locator("h3#ruleVariables");
    }

    get resourcesHeading() {
        return this.root.locator("h3#resources");
    }
}

export class DataSetsPage extends DossierPage {
    async load() {
        await this.loadRoute("datasets");
    }

    get sections() {
        return this.root.locator("#sectionContainer h3.section");
    }

    get categoryCombosHeading() {
        return this.root.locator("h3#categoryCombinations");
    }

    get indicatorsHeading() {
        return this.root.locator("h3#indicators");
    }
}

export class IndicatorsPage extends DossierPage {
    async load() {
        await this.loadRoute("dossierIndicators");
    }

    get formulaHeading() {
        return this.root.locator("h2#formulaIndicator");
    }

    get numeratorHeading() {
        return this.root.locator("h2#numerator");
    }

    get denominatorHeading() {
        return this.root.locator("h2#denominator");
    }
}

export class AdminPage extends App {
    async load() {
        await this.open("admin");
        await expect(this.check("divA")).toBeVisible();
        await this.waitIdle();
    }

    check(id: "divUG" | "divOUGS" | "divOUG" | "divA") {
        return this.root.locator(`#${id}`);
    }

    get userGroup() {
        return this.root.locator("#drpBoxUG");
    }

    get groupSet() {
        return this.root.locator("#drpBoxOUGS");
    }

    submit(id: string) {
        return this.root.locator(`#${id}`);
    }

    input(name: string) {
        return this.root.locator(`input[name="${name}"]`);
    }

    /** Fills a field and submits it, waiting for the page to reload. */
    async submitField(inputLocator: Locator, submitId: string, value: string) {
        await inputLocator.fill(value);
        await this.submit(submitId).click();
    }
}

export async function readKeyEventually(api: Api, key: string, expected: unknown) {
    await expect.poll(() => api.getKey(key), { timeout: 20_000 }).toEqual(expected);
}
