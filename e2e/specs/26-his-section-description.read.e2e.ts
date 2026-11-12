import { config } from "../support/data";
import { expect, test } from "../support/fixtures";

test.describe("HIS: section description", () => {
    test("It is shown under the section title, only when there is one", async ({
        dataSets,
        api,
    }) => {
        const { blacklistDS } = await config(api);
        const sections = await api.list("sections", {
            fields: "id,description,dataSet[id,displayName,sections~size]",
            filter: "description:!null",
        });
        const section = sections
            .filter((s: any) => !blacklistDS.includes(s.dataSet.id))
            .sort((a: any, b: any) => a.dataSet.sections - b.dataSet.sections)[0];
        const { sections: all } = await api.get(`dataSets/${section.dataSet.id}`, {
            fields: "sections[id,description]",
        });

        await dataSets.load();
        await dataSets.select(section.dataSet.displayName);
        const text = (id: string) =>
            dataSets.root.locator(`[data-test="section-description-${id}"]`);
        await expect(text(section.id)).toHaveText(section.description.trim());

        const without = all.find((s: any) => !s.description);
        if (without) await expect(text(without.id)).toHaveCount(0);
    });
});
