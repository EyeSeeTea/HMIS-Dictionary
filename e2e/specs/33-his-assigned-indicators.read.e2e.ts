import { visibleIndicators } from "../support/data";
import { expect, fixtures, test } from "../support/fixtures";
import { rowsOf, tableAfter } from "../support/pages";

const { small } = fixtures.dataSets;

test.describe("HIS: indicators assigned to the data set", () => {
    test("They are listed even if no formula refers to the data set", async ({
        dataSets,
        api,
        page,
    }) => {
        const { dataSetElements } = await api.get(`dataSets/${small.id}`, {
            fields: "dataSetElements[dataElement[id]]",
        });
        const elementIds: string[] = dataSetElements.map((e: any) => e.dataElement.id);
        const indicators = await visibleIndicators(api);
        const unrelated = indicators.find(
            i => !elementIds.some(id => `${i.numerator} ${i.denominator}`.includes(id))
        )!;

        // Only one data set of the instance has assigned indicators, so one is made from a real one
        await page.route(/\/api(\/\d+)?\/dataSets(\.json)?\?.*indicators/, async route => {
            const response = await route.fetch();
            const json = await response.json();
            json.dataSets[0].indicators = [{ id: unrelated.id }];
            await route.fulfill({ response, json });
        });

        await dataSets.load();
        await dataSets.select(small.name);
        await expect(dataSets.indicatorsHeading).toBeVisible();
        await expect(
            rowsOf(tableAfter(dataSets.indicatorsHeading)).filter({
                hasText: unrelated.displayName,
            })
        ).toHaveCount(1);
    });
});
