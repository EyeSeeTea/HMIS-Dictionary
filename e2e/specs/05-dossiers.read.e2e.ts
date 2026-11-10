import { expect, fixtures, test } from "../support/fixtures";
import { hasServiceCode, serviceCode, serviceContents, services } from "../support/data";
import { t } from "../support/i18n";
import { DossiersPage, headersOf, rowsOf, tableAfter } from "../support/pages";

const svc = fixtures.service;

async function serviceWithContents(api: any, min = { dataSets: 1, groups: 1 }) {
    for (const s of await services(api, fixtures.groupSet)) {
        const contents = await serviceContents(api, s.code);
        if (contents.dataSets.length >= min.dataSets && contents.groups.length >= min.groups) {
            return { service: s, ...contents };
        }
    }
    test.skip(true, "No service with data sets and indicator groups on this instance");
    return undefined;
}

async function loadDossiers(dossiers: DossiersPage) {
    await dossiers.loadRoute("dossiers");
}

/** The start of a description as plain text, up to the first HTML entity. */
function descriptionStart(html: string) {
    return html
        .replace(/<[^>]+>/g, " ")
        .trim()
        .split("&")[0]!
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join(" ");
}

const counters = (dossiers: DossiersPage) => ({
    services: dossiers.pageText.getByText(new RegExp(`^${t("dos_Number of Services")}: `)),
    dataSets: dossiers.pageText.getByText(
        new RegExp(`^${t("dos_Number of DataSets in Service")}: `)
    ),
    groups: dossiers.pageText.getByText(
        new RegExp(`^${t("dos_Number of IndicatorGroups in Service")}: `)
    ),
});

test.describe("5. Dossiers - reader", () => {
    test("Counter shows the number of services, sorted by name in the selector @smoke", async ({
        dossiers,
        api,
    }) => {
        const all = await services(api, fixtures.groupSet);
        await loadDossiers(dossiers);
        await expect(counters(dossiers).services).toHaveText(
            `${t("dos_Number of Services")}: ${all.length}`
        );
        const labels = await dossiers.optionLabels();
        expect(labels).toHaveLength(all.length);
        expect([...labels].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))).toEqual(
            [...labels].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        );
        expect(new Set(labels)).toEqual(new Set(all.map(s => s.displayName)));
    });

    test("Before selecting: counters at zero, and no title, table of contents or description", async ({
        dossiers,
    }) => {
        await loadDossiers(dossiers);
        await expect(counters(dossiers).dataSets).toHaveText(
            `${t("dos_Number of DataSets in Service")}: 0`
        );
        await expect(counters(dossiers).groups).toHaveText(
            `${t("dos_Number of IndicatorGroups in Service")}: 0`
        );
        await expect(dossiers.title).toHaveCount(0);
        await expect(dossiers.toc.locator("a")).toHaveCount(0);
        await expect(dossiers.description).toHaveCount(0);
    });

    test("Selecting a service while the data sets are loading keeps them (P2)", async ({
        dossiers,
        api,
        page,
    }) => {
        const found = (await serviceWithContents(api))!;
        await page.route(/\/api(\/\d+)?\/dataSets\?/, async route => {
            await new Promise(resolve => setTimeout(resolve, 2_000));
            await route.continue();
        });
        await dossiers.loadRoute("dossiers");
        await dossiers.select(found.service.displayName);
        await expect(counters(dossiers).dataSets).toContainText(`: ${found.dataSets.length}`);
    });

    test("Selecting a service updates the title and the data set and indicator group counters", async ({
        dossiers,
        api,
    }) => {
        const found = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        await expect(dossiers.title).toHaveText(found.service.displayName);
        await expect(counters(dossiers).dataSets).toContainText(`: ${found.dataSets.length}`);
        await expect(counters(dossiers).groups).toContainText(`: ${found.groups.length}`);
    });

    test("Only data sets and groups with that service code are listed, including multi-service values", async ({
        dossiers,
        api,
    }) => {
        const all = await services(api, fixtures.groupSet);
        const dataSets = await api.list<any>("indicatorGroups", {
            fields: "id,displayName,attributeValues[value]",
        });
        const multi = dataSets.find(
            d => all.filter(s => hasServiceCode(d.attributeValues, serviceCode(s.code))).length > 1
        );
        test.skip(!multi, "No multi-service indicator group");
        const matching = all.filter(s =>
            hasServiceCode(multi.attributeValues, serviceCode(s.code))
        );
        await loadDossiers(dossiers);
        for (const service of matching.slice(0, 2)) {
            await dossiers.select(service.displayName);
            const contents = await serviceContents(api, service.code);
            const titles = dossiers.root.locator("h2.dataset");
            await expect(titles).toHaveCount(contents.dataSets.length);
            const groups = dossiers.root.locator("h2.indicatorGroup");
            await expect(groups).toHaveCount(contents.groups.length);
            await expect(groups.filter({ hasText: multi.displayName })).toHaveCount(1);
        }
    });

    test("Code matching is exact (`_AB` does not match a service `A`)", async ({
        dossiers,
        api,
    }) => {
        const all = await services(api, fixtures.groupSet);
        const dataSets = await api.list<any>("dataSets", {
            fields: "displayName,attributeValues[value]",
        });
        const groups = await api.list<any>("indicatorGroups", {
            fields: "displayName,attributeValues[value]",
        });
        const pair = all
            .map(s => serviceCode(s.code))
            .flatMap(code =>
                dataSets
                    .concat(groups)
                    .filter(x => x.attributeValues.some((a: any) => a.value.includes(`_${code}`)))
                    .filter(x => !hasServiceCode(x.attributeValues, code))
                    .map(x => ({ code, name: x.displayName }))
            )[0];
        test.skip(!pair, "No code on this instance is a prefix of another");
        const service = all.find(s => serviceCode(s.code) === pair!.code)!;
        await loadDossiers(dossiers);
        await dossiers.select(service.displayName);
        await expect(dossiers.pageText).toContainText(service.displayName);
        await expect(dossiers.root.locator("h2").filter({ hasText: pair!.name })).toHaveCount(0);
    });

    test('Data sets show "Data Set: X", and each section shows "Section: X" with its element count', async ({
        dossiers,
        api,
    }) => {
        const found = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        const dataSet = found.dataSets.find((d: any) => d.sections.length > 0);
        await expect(dossiers.root.locator(`h2[id="${dataSet.id}"]`)).toHaveText(
            `${t("dos_Data Set")}: ${dataSet.displayName}`
        );
        const section = dataSet.sections[0];
        const heading = dossiers.root.locator(`h3[id="${section.id}"]`);
        await expect(heading).toHaveText(`${t("dos_Section")}: ${section.displayName}`);
        await expect(heading.locator("xpath=following-sibling::p[1]")).toContainText(
            `${t("dos_NumberElementsSection")}: ${section.dataElements}`
        );
    });

    test("Section tables show name, form name and description", async ({ dossiers, api }) => {
        const found = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        const table = dossiers.root.locator("table.sectionElementsTable").first();
        await expect(table).toBeVisible();
        expect(await headersOf(table)).toEqual(
            ["dos_NameElement", "dos_FormNameElement", "dos_DescriptionElement"].map(key => t(key))
        );
    });

    test('Section named "Comments" (translated) is excluded', async ({ dossiers, api }) => {
        const all = await services(api, fixtures.groupSet);
        for (const service of all) {
            const contents = await serviceContents(api, service.code);
            const dataSet = contents.dataSets.find((d: any) =>
                d.sections.some((s: any) => s.displayName === t("dos_Comments"))
            );
            if (!dataSet) continue;
            await loadDossiers(dossiers);
            await dossiers.select(service.displayName);
            await expect(dossiers.root.locator(`h2[id="${dataSet.id}"]`)).toBeVisible();
            await expect(
                dossiers.root.getByRole("heading", {
                    name: `${t("dos_Section")}: ${t("dos_Comments")}`,
                    exact: true,
                })
            ).toHaveCount(0);
            return;
        }
        test.skip(true, 'No service with a "Comments" section');
    });

    test("Data set with no data elements renders with no errors", async ({ dossiers, api }) => {
        const all = await services(api, fixtures.groupSet);
        for (const service of all) {
            const contents = await serviceContents(api, service.code);
            const empty = contents.dataSets.find(
                (d: any) =>
                    d.sections.length === 0 || d.sections.every((s: any) => s.dataElements === 0)
            );
            if (!empty) continue;
            await loadDossiers(dossiers);
            await dossiers.select(service.displayName);
            await expect(dossiers.root.locator(`h2[id="${empty.id}"]`)).toBeVisible();
            return;
        }
        test.skip(true, "No service with an empty data set");
    });

    test('Indicator groups show "Indicator Group: X", with name and description sorted by name, and the count', async ({
        dossiers,
        api,
    }) => {
        const found = (await serviceWithContents(api))!;
        const group = found.groups.find((g: any) => g.indicators > 0);
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        const heading = dossiers.root.locator(`h2[id="${group.id}"]`);
        await expect(heading).toHaveText(`${t("dos_Indicator Group")}: ${group.displayName}`);
        await expect(heading.locator("xpath=following-sibling::div[1]")).toContainText(
            `${t("dos_Number of Indicators in Group")}: ${group.indicators}`
        );
        const table = tableAfter(heading);
        expect(await headersOf(table)).toEqual(
            ["dos_NameIndicator", "dos_DescriptionIndicator"].map(key => t(key))
        );
        await expect(rowsOf(table)).toHaveCount(group.indicators);
        const names = (await rowsOf(table).locator("td:first-child").allInnerTexts()).map(n =>
            n.trim()
        );
        const expected = [...names].sort((a, b) =>
            a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
        );
        expect(names).toEqual(expected);
    });

    test("Description is rendered as HTML, in the user's language", async ({ dossiers, api }) => {
        const { displayDescription } = await api.get(`organisationUnitGroups/${svc.id}`, {
            fields: "displayDescription",
            locale: "en",
        });
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        const plain = displayDescription
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-z]+;/g, " ")
            .trim()
            .split(/\s+/);
        await expect(dossiers.description).toContainText(plain.slice(0, 2).join(" "));
        await expect(dossiers.description).not.toContainText("</");
    });

    test("Service with no description renders with no errors", async ({ dossiers, api }) => {
        const all = await services(api, fixtures.groupSet);
        const details = await api.list<any>("organisationUnitGroups", {
            fields: "id,displayDescription",
            filter: `id:in:[${all.map(s => s.id).join(",")}]`,
        });
        const none = details.find(d => !d.displayDescription);
        test.skip(!none, "Every service has a description");
        await loadDossiers(dossiers);
        await dossiers.select(all.find(s => s.id === none.id)!.displayName);
        await expect(dossiers.description).toBeVisible();
    });

    test("Table of contents lists the description, data sets with their sections, and indicator groups, sorted by name", async ({
        dossiers,
        api,
    }) => {
        const found = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        const entries = async () => dossiers.tocEntries();
        await expect.poll(entries).toContain(t("dos_Description of Service"));
        await expect.poll(entries).toContain(t("dos_Data Sets"));
        await expect.poll(entries).toContain(t("dos_Indicator Groups"));
        for (const dataSet of found.dataSets)
            await expect.poll(entries).toContain(dataSet.displayName);
        for (const group of found.groups) await expect.poll(entries).toContain(group.displayName);
        const firstDataSet = found.dataSets[0];
        for (const section of firstDataSet.sections.filter(
            (s: any) => s.displayName !== t("dos_Comments")
        )) {
            await expect.poll(entries).toContain(section.displayName);
        }
    });

    test("Each table of contents link scrolls to its target", async ({ dossiers, api }) => {
        const found = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        const dataSet = found.dataSets[0];
        const group = found.groups[0];
        await expect(dossiers.tocLink(group.displayName)).toBeVisible();
        await dossiers.expectTocScrolls([
            [group.displayName, dossiers.root.locator(`h2[id="${group.id}"]`)],
            [dataSet.displayName, dossiers.root.locator(`h2[id="${dataSet.id}"]`)],
            [t("dos_Indicator Groups"), dossiers.root.locator("#IndicatorGroupsTitleContainer")],
            [t("dos_Data Sets"), dossiers.root.locator("#DataSetsTitleContainer")],
            [t("dos_Description of Service"), dossiers.root.locator("#DossierTextTitleContainer")],
        ]);
    });

    test('"Back to Top" and "Go to index" links scroll to the top', async ({
        dossiers,
        api,
        page,
    }) => {
        const found = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(found.service.displayName);
        for (const name of [t("dos_BackToTop"), t("dos_GoToIndex")]) {
            const link = page.getByRole("link", { name }).last();
            await link.scrollIntoViewIfNeeded();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await link.click();
            await dossiers.expectInView(dossiers.topOfPage);
        }
    });

    test("Switching service replaces all content, with nothing left over", async ({
        dossiers,
        api,
    }) => {
        const all = await services(api, fixtures.groupSet);
        const measles = all.find(s => s.id === svc.id)!;
        const contents = await serviceContents(api, measles.code);
        const other = (await serviceWithContents(api))!;
        await loadDossiers(dossiers);
        await dossiers.select(other.service.displayName);
        await dossiers.select(measles.displayName);
        await expect(dossiers.root.locator("h2.dataset")).toHaveCount(contents.dataSets.length);
        await expect(dossiers.root.locator("h2.indicatorGroup")).toHaveCount(
            contents.groups.length
        );
        const measlesIds = new Set(contents.dataSets.map((d: any) => d.id));
        const leftover = other.dataSets.find((d: any) => !measlesIds.has(d.id));
        if (leftover)
            await expect(dossiers.toc.getByText(leftover.displayName, { exact: true })).toHaveCount(
                0
            );
    });

    test("Switching between services that share an indicator group keeps that group in the table of contents", async ({
        dossiers,
        api,
    }) => {
        const all = await services(api, fixtures.groupSet);
        const groups = await api.list<any>("indicatorGroups", {
            fields: "id,displayName,attributeValues[value]",
        });
        const shared = groups
            .map(g => ({
                g,
                ss: all.filter(s => hasServiceCode(g.attributeValues, serviceCode(s.code))),
            }))
            .find(x => x.ss.length > 1);
        test.skip(!shared, "No indicator group shared by two services");
        await loadDossiers(dossiers);
        const link = dossiers.toc.getByText(shared!.g.displayName, { exact: true });
        await dossiers.select(shared!.ss[0]!.displayName);
        await expect(link).toBeVisible();
        await dossiers.select(shared!.ss[1]!.displayName);
        await expect(link).toBeVisible();
    });

    test("Edit button is visible", async ({ dossiers }) => {
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await expect(dossiers.editButton).toBeVisible();
    });
});

test.describe("6. Dossiers - editor", () => {
    test("Edit button opens the editor (`#/dossiers/editor`) with the current description loaded", async ({
        dossiers,
        api,
        page,
    }) => {
        const { displayDescription } = await api.get(`organisationUnitGroups/${svc.id}`, {
            fields: "displayDescription",
            locale: "en",
        });
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await dossiers.openEditor();
        await expect(page).toHaveURL(/#\/dossiers\/editor$/);
        const firstWord = displayDescription
            .replace(/<[^>]+>/g, " ")
            .trim()
            .split(/\s+/)[0];
        await expect(dossiers.editor.body).toContainText(firstWord);
    });

    test("Toggle button returns to the reader", async ({ dossiers, page }) => {
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await dossiers.openEditor();
        await dossiers.backToReader.click();
        await expect(page).toHaveURL(/#\/dossiers$/);
        await expect(dossiers.editButton).toBeVisible();
    });

    test("Opening `#/dossiers/editor` directly with no service selected displays the selector, with no errors", async ({
        dossiers,
    }) => {
        await dossiers.loadRoute("dossiers/editor");
        await expect(dossiers.selector).toBeVisible();
        await expect(dossiers.title).toHaveCount(0);
    });

    test("Editor shows the expected tools: undo, styles, font size, formatting, alignment, lists, indent, link, image, table and preview", async ({
        dossiers,
    }) => {
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await dossiers.openEditor();
        for (const name of [
            "Undo",
            "Redo",
            "Formats",
            "Font Sizes",
            "Bold",
            "Italic",
            "Align left",
            "Align center",
            "Align right",
            "Justify",
            "Bullet list",
            "Numbered list",
            "Decrease indent",
            "Increase indent",
            "Insert/edit link",
            "Insert/edit image",
            "Table",
            "Preview",
        ]) {
            await expect(dossiers.editor.toolbarButton(name), name).toBeVisible();
        }
    });

    test("Language selector offers AR, EN, ES, FR, PT, with EN selected by default", async ({
        dossiers,
    }) => {
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await dossiers.openEditor();
        await expect(dossiers.languageSelector.locator("option:not([disabled])")).toHaveText([
            "AR",
            "EN",
            "ES",
            "FR",
            "PT",
        ]);
        await expect(dossiers.languageSelector.locator("option:checked")).toHaveText("EN");
    });

    for (const title of [
        "Changing language loads that locale's description",
        "Each locale loads its own description on v42 (regression)",
    ]) {
        test(title, async ({ dossiers, api }) => {
            await loadDossiers(dossiers);
            await dossiers.select(svc.name);
            await dossiers.openEditor();
            for (const locale of ["es", "fr", "pt", "en"]) {
                const { translations } = await api.get(`organisationUnitGroups/${svc.id}`, {
                    fields: "translations",
                });
                const value = translations.find(
                    (x: any) => x.locale === locale && x.property === "DESCRIPTION"
                ).value;
                await dossiers.languageSelector.selectOption({ label: locale.toUpperCase() });
                const word = descriptionStart(value);
                await expect(dossiers.editor.body).toContainText(word);
                await expect(dossiers.saveButton).not.toHaveClass(/disabled/);
            }
        });
    }

    test("Changing service in the editor loads its description", async ({ dossiers, api }) => {
        const all = await services(api, fixtures.groupSet);
        const details = await api.list<any>("organisationUnitGroups", {
            fields: "id,displayDescription",
            filter: `id:in:[${all.map(s => s.id).join(",")}]`,
            locale: "en",
        });
        const other = details.find(d => d.id !== svc.id && d.displayDescription);
        const label = all.find(s => s.id === other.id)!.displayName;
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await dossiers.openEditor();
        await dossiers.selector.selectOption({ label });
        const word = descriptionStart(other.displayDescription);
        await expect(dossiers.editor.body).toContainText(word);
    });

    test("Save button is disabled while loading, and enabled afterwards", async ({ dossiers }) => {
        await loadDossiers(dossiers);
        await dossiers.select(svc.name);
        await dossiers.editButton.click();
        await dossiers.editor.waitLoaded();
        await dossiers.languageSelector.selectOption({ label: "FR" });
        await expect(dossiers.saveButton).toHaveClass(/disabled/);
        await expect(dossiers.saveButton).not.toHaveClass(/disabled/);
    });
});
