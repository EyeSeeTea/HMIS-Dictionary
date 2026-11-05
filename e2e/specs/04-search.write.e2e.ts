import { expect, test } from "../support/fixtures";
import { Api } from "../support/api";
import { visibleIndicators } from "../support/data";
import { t } from "../support/i18n";
import { env } from "../support/env";
import { SearchPage } from "../support/pages";

const NUM = t("object_num_formula");
const DEN = t("object_den_formula");
const EXP = t("object_exp_formula");

async function indicatorType(api: Api) {
    const [type] = await api.list("indicatorTypes", { fields: "id", pageSize: 1, paging: true });
    return type.id;
}

function indicator(api: Api, type: string, id: string, numerator: string, denominator = "1") {
    return {
        id,
        name: `E2E_${id}`,
        shortName: `E2E_${id}`,
        numerator,
        denominator,
        numeratorDescription: "n",
        denominatorDescription: "d",
        annualized: false,
        indicatorType: { id: type },
    };
}

/** A simple indicator not in any blacklisted group, whose formula has data elements. */
async function simpleIndicator(api: Api) {
    return (await visibleIndicators(api)).find(i => /#\{\w{11}\.\w{11}\}/.test(i.numerator))!;
}

async function cleanVisualizations(api: Api, name: string) {
    await api.deleteVisualizations(name);
}

test.describe("4. Search", () => {
    test("A translation error displays the error with the original expression", async ({
        search,
        api,
    }) => {
        const [program] = await api.list("programs", {
            fields: "id",
            filter: "programType:eq:WITHOUT_REGISTRATION",
        });
        const id = api.uid();
        const expression = "#{doesNotExist.doesNotExis}";
        await api.withMetadata(
            {
                programIndicators: [
                    {
                        id,
                        name: `E2E_${id}`,
                        shortName: `E2E_${id}`,
                        program: { id: program.id },
                        analyticsType: "EVENT",
                        aggregationType: "COUNT",
                        expression,
                    },
                ],
            },
            async () => {
                await search.load();
                await search.showColumn(EXP);
                await search.filterById(id);
                await expect(await search.table.cell(0, EXP)).toContainText(expression);
            }
        );
    });

    test('"Expand" appears only on formulas with nested indicators, in numerator and denominator', async ({
        search,
        api,
    }) => {
        const nested = await simpleIndicator(api);
        const type = await indicatorType(api);
        const id = api.uid();
        await api.withMetadata(
            { indicators: [indicator(api, type, id, "1", `N{${nested.id}}`)] },
            async () => {
                await search.load();
                await search.showColumn(DEN);
                await search.filterById(id);
                await expect(
                    (await search.table.cell(0, DEN)).getByRole("button", {
                        name: t("srch_formula_modal_expand"),
                    })
                ).toBeVisible();
            }
        );
    });

    test("Cyclic reference displays the cycle message and does not hang", async ({
        search,
        api,
    }) => {
        const type = await indicatorType(api);
        const a = api.uid();
        const b = api.uid();
        await api.withMetadata(
            {
                indicators: [
                    indicator(api, type, a, `N{${b}}`),
                    indicator(api, type, b, `N{${a}}`),
                ],
            },
            async () => {
                await search.load();
                await search.showColumn(NUM);
                await search.filterById(a);
                await (await search.table.cell(0, NUM))
                    .getByRole("button", { name: t("srch_formula_modal_expand") })
                    .click();
                await expect(search.formulaDialog).toContainText("cyclic indicator reference");
            }
        );
    });

    test.describe("Visualization link", () => {
        async function open(search: SearchPage, id: string) {
            await search.load();
            await search.filterById(id);
            return search.visualizationIcons.first();
        }

        const newTab = async (
            search: SearchPage,
            icon: ReturnType<SearchPage["visualizationIcons"]["first"]>
        ) => {
            const [popup] = await Promise.all([search.page.waitForEvent("popup"), icon.click()]);
            return popup;
        };

        test("First click creates a visualization named `<indicator> - <id>`, with its formula items and the indicator as rows", async ({
            search,
            api,
        }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            try {
                const popup = await newTab(search, await open(search, target.id));
                await popup.close();
                const [created] = await api.list("visualizations", {
                    fields: "id,rows[id,items[id]],dataDimensionItems",
                    filter: `name:eq:${name}`,
                });
                expect(created).toBeTruthy();
                const { dataDimensionItems } = created;
                const json = JSON.stringify(dataDimensionItems);
                expect(json).toContain(target.id);
                const [, deId] = /#\{(\w{11})/.exec(target.numerator)!;
                expect(json).toContain(deId);
            } finally {
                await cleanVisualizations(api, name);
            }
        });

        test("Second click updates the same visualization and does not create a duplicate", async ({
            search,
            api,
        }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            try {
                (await newTab(search, await open(search, target.id))).close();
                await expect
                    .poll(
                        async () =>
                            (
                                await api.list("visualizations", {
                                    fields: "id",
                                    filter: `name:eq:${name}`,
                                })
                            ).length
                    )
                    .toBe(1);
                const [{ id }] = await api.list("visualizations", {
                    fields: "id",
                    filter: `name:eq:${name}`,
                });
                (await newTab(search, await open(search, target.id))).close();
                await expect
                    .poll(async () =>
                        api.list("visualizations", { fields: "id", filter: `name:eq:${name}` })
                    )
                    .toEqual([{ id }]);
            } finally {
                await cleanVisualizations(api, name);
            }
        });

        test("Visualization is a pivot table for this year and the user's organisation unit", async ({
            search,
            api,
        }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            try {
                (await newTab(search, await open(search, target.id))).close();
                await expect
                    .poll(
                        async () =>
                            (
                                await api.list("visualizations", {
                                    fields: "id",
                                    filter: `name:eq:${name}`,
                                })
                            ).length
                    )
                    .toBe(1);
                const [created] = await api.list("visualizations", {
                    fields: "type,relativePeriods,userOrganisationUnit,columns[id],rows[id],filters[id]",
                    filter: `name:eq:${name}`,
                });
                expect(created.type).toBe("PIVOT_TABLE");
                expect(created.relativePeriods.thisYear).toBe(true);
                expect(created.userOrganisationUnit).toBe(true);
                expect(created.columns.map((c: any) => c.id)).toEqual(["pe"]);
                expect(created.rows.map((c: any) => c.id)).toEqual(["dx"]);
                expect(created.filters.map((c: any) => c.id)).toEqual(["ou"]);
            } finally {
                await cleanVisualizations(api, name);
            }
        });

        test("Sharing includes `ALL USERS` when that group exists", async ({ search, api }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            try {
                (await newTab(search, await open(search, target.id))).close();
                await expect
                    .poll(async () => {
                        const [v] = await api.list<any>("visualizations", {
                            fields: "sharing",
                            filter: `name:eq:${name}`,
                        });
                        return v ? Object.keys(v.sharing?.userGroups ?? {}) : [];
                    })
                    .toContain("epFY01iJN0Z");
            } finally {
                await cleanVisualizations(api, name);
            }
        });

        test("Sharing falls back to public read when that group does not exist", async ({
            search,
            api,
            page,
        }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            await page.route(/\/api(\/\d+)?\/userGroups\/epFY01iJN0Z/, route =>
                route.fulfill({ status: 404, json: { httpStatusCode: 404 } })
            );
            try {
                (await newTab(search, await open(search, target.id))).close();
                await expect
                    .poll(async () => {
                        const [v] = await api.list<any>("visualizations", {
                            fields: "sharing",
                            filter: `name:eq:${name}`,
                        });
                        return v?.sharing?.public;
                    })
                    .toBe("r-------");
            } finally {
                await cleanVisualizations(api, name);
            }
        });

        test("Data Visualizer opens in a new tab with the visualization id, and loads without errors", async ({
            search,
            api,
        }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            try {
                const popup = await newTab(search, await open(search, target.id));
                await expect
                    .poll(
                        async () =>
                            (
                                await api.list("visualizations", {
                                    fields: "id",
                                    filter: `name:eq:${name}`,
                                })
                            ).length
                    )
                    .toBe(1);
                const [{ id }] = await api.list("visualizations", {
                    fields: "id",
                    filter: `name:eq:${name}`,
                });
                await expect(popup).toHaveURL(new RegExp(id));
                expect(popup.url()).toContain(env.dhis2Url);
                await expect(popup.locator("body")).not.toContainText(/not found|404/i, {
                    timeout: 30_000,
                });
                await popup.close();
            } finally {
                await cleanVisualizations(api, name);
            }
        });

        test("Search stays responsive after opening a visualization", async ({ search, api }) => {
            const target = await simpleIndicator(api);
            const name = `${target.displayName} - ${target.id}`;
            await cleanVisualizations(api, name);
            try {
                (await newTab(search, await open(search, target.id))).close();
                await search.table.filter(t("object_id"), "");
                await expect(search.table.rows).toHaveCount(10);
                await search.table.goToPage(2);
                await expect(search.table.rows.first()).toBeVisible();
            } finally {
                await cleanVisualizations(api, name);
            }
        });
    });
});
