import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

const NAME = t("object_name");

test.describe("HIS: exact phrase first", () => {
    test("Rows with the whole phrase go on top, also when sorting by a column", async ({
        search,
        api,
    }) => {
        const [type] = await api.list("indicatorTypes", {
            fields: "id",
            pageSize: 1,
            paging: true,
        });
        const tag = api.uid().toLowerCase();
        const [one, two] = [`one${tag}`, `two${tag}`];
        const apart = `a ${one} middle ${two}`;
        const together = `z ${one} ${two}`;
        const indicator = (name: string) => {
            const id = api.uid();
            return {
                id,
                name: `E2E_${name}`,
                shortName: `E2E_${id}`,
                numerator: "1",
                numeratorDescription: "n",
                denominator: "1",
                denominatorDescription: "d",
                annualized: false,
                indicatorType: { id: type.id },
            };
        };

        await api.withMetadata(
            { indicators: [indicator(apart), indicator(together)] },
            async () => {
                await search.load();
                await search.searchFor(`${one} ${two}`);
                await expect(search.table.rows).toHaveCount(2);
                const names = () => search.table.columnValues(NAME);
                expect((await names())[0]).toContain(together);

                await search.table.sortBy(NAME);
                expect((await names())[0]).toContain(together);
                await search.table.sortBy(NAME);
                expect((await names())[0]).toContain(together);
            }
        );
    });
});
