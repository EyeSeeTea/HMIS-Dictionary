import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { DataSetsPage, rowsOf, tableAfter } from "../support/pages";

/** A data set with no sections, with one element that has its own combo and option set. */
async function withDataSet(api: any, sections: boolean, fn: (d: any) => Promise<void>) {
    const [optionSet] = await api.list("optionSets", {
        fields: "id,valueType,options[displayName]",
        filter: "valueType:eq:TEXT",
        pageSize: 5,
        paging: true,
    });
    const [combo] = await api.list("categoryCombos", {
        fields: "id,displayName,categories~size",
        filter: "dataDimensionType:eq:DISAGGREGATION",
        pageSize: 5,
        paging: true,
    });
    const dataSetId = api.uid();
    const deId = api.uid();
    const sectionId = api.uid();
    const payload: Record<string, object[]> = {
        dataElements: [
            {
                id: deId,
                name: `E2E_DE_${deId}`,
                shortName: `E2E_DE_${deId}`,
                domainType: "AGGREGATE",
                valueType: "TEXT",
                aggregationType: "NONE",
                optionSet: { id: optionSet.id },
                categoryCombo: { id: combo.id },
            },
        ],
        dataSets: [
            {
                id: dataSetId,
                name: `E2E_DS_${dataSetId}`,
                shortName: `E2E_DS_${dataSetId}`,
                periodType: "Monthly",
                dataSetElements: [{ dataSet: { id: dataSetId }, dataElement: { id: deId } }],
            },
        ],
    };
    if (sections) {
        payload.sections = [
            {
                id: sectionId,
                name: `E2E_S_${sectionId}`,
                dataSet: { id: dataSetId },
                dataElements: [{ id: deId }],
                sortOrder: 1,
            },
        ];
    }
    await api.withMetadata(payload, () =>
        fn({
            name: `E2E_DS_${dataSetId}`,
            de: `E2E_DE_${deId}`,
            combo,
            option: optionSet.options[0].displayName,
        })
    );
}

async function open(dataSets: DataSetsPage, label: string) {
    await dataSets.load();
    await dataSets.select(label);
}

test.describe("8. Data Sets", () => {
    test('Data set with no sections shows one "Data Elements" table, and its table of contents is adjusted', async ({
        dataSets,
        api,
    }) => {
        await withDataSet(api, false, async d => {
            await open(dataSets, d.name);
            await expect(dataSets.sections).toHaveCount(1);
            await expect(dataSets.sections.first()).toHaveText("Data Elements");
            await expect(
                rowsOf(tableAfter(dataSets.sections.first())).filter({ hasText: d.de })
            ).toHaveCount(1);
            await expect(dataSets.tocLink("Data elements")).toBeVisible();
        });
    });

    test("Options are listed for data elements with an option set", async ({ dataSets, api }) => {
        await withDataSet(api, true, async d => {
            await open(dataSets, d.name);
            const row = rowsOf(tableAfter(dataSets.sections.first()))
                .filter({ hasText: d.de })
                .first();
            await expect(row.locator("li", { hasText: d.option }).first()).toBeVisible();
        });
    });

    test("Category combo is right per element, without sections (PR #68)", async ({
        dataSets,
        api,
    }) => {
        await withDataSet(api, false, async d => {
            await open(dataSets, d.name);
            const row = rowsOf(tableAfter(dataSets.sections.first()))
                .filter({ hasText: d.de })
                .first();
            await expect(row.locator("td").last()).toHaveText(d.combo.displayName);
            await expect(dataSets.root.locator(`td[id="${d.combo.id}"]`)).toHaveText(
                d.combo.displayName
            );
            expect(t("dos_CategoryCombination")).toBeTruthy();
        });
    });
});
