import { expect, fixtures, test } from "../support/fixtures";
import { serviceCode, services } from "../support/data";

test.describe("5. Dossiers - reader", () => {
    test("Data set with no data elements renders with no errors", async ({ dossiers, api }) => {
        const all = await services(api, fixtures.groupSet);
        const service = all.find(s => s.id === fixtures.service.id)!;
        const id = api.uid();
        await api.withMetadata(
            {
                dataSets: [
                    {
                        id,
                        name: `E2E_DS_${id}`,
                        shortName: `E2E_DS_${id}`,
                        periodType: "Monthly",
                        attributeValues: [
                            {
                                value: `DS_${serviceCode(service.code)}`,
                                attribute: { id: fixtures.healthServiceAttribute },
                            },
                        ],
                    },
                ],
            },
            async () => {
                await dossiers.loadRoute("dossiers");
                await dossiers.select(service.displayName);
                await expect(dossiers.root.locator(`h2[id="${id}"]`)).toBeVisible();
            }
        );
    });
});
