import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

const NUMERATOR = t("object_num_formula");

test.describe("HIS: more formula tokens", () => {
    test("Data element groups, category options and program data elements show their names", async ({
        search,
        api,
    }) => {
        const [type] = await api.list("indicatorTypes", {
            fields: "id",
            pageSize: 1,
            paging: true,
        });
        const [group] = await api.list("dataElementGroups", {
            fields: "id,displayName",
            pageSize: 1,
            paging: true,
        });
        const [option] = await api.list("categoryOptions", {
            fields: "id,displayName",
            pageSize: 1,
            paging: true,
        });
        const [element] = await api.list("dataElements", {
            fields: "id,displayName",
            filter: "domainType:eq:AGGREGATE",
            pageSize: 1,
            paging: true,
        });
        const [tracker] = await api.list("dataElements", {
            fields: "id,displayName",
            filter: "domainType:eq:TRACKER",
            pageSize: 1,
            paging: true,
        });
        const id = api.uid();

        await api.withMetadata(
            {
                indicators: [
                    {
                        id,
                        name: `E2E_${id}`,
                        shortName: `E2E_${id}`,
                        numerator: `#{deGroup:${group.id}} + #{${element.id}.co:${option.id}} + D{prog0000000.${tracker.id}}`,
                        numeratorDescription: "n",
                        denominator: "1",
                        denominatorDescription: "d",
                        annualized: false,
                        indicatorType: { id: type.id },
                    },
                ],
            },
            async () => {
                await search.load();
                await search.showColumn(NUMERATOR);
                await search.filterById(id);
                const cell = await search.table.cell(0, NUMERATOR);

                await expect(cell).toContainText(group.displayName);
                await expect(cell).toContainText(element.displayName);
                await expect(cell).toContainText(option.displayName);
                await expect(cell).toContainText(tracker.displayName);
                await expect(cell).not.toContainText("deGroup:");
                await expect(cell).not.toContainText("D{");
            }
        );
    });
});
