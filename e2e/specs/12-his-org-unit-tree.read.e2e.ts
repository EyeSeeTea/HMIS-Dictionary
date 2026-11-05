import { config } from "../support/data";
import { expect, fixtures, test } from "../support/fixtures";
import { OrgUnitTreePanel } from "../support/his";
import { App } from "../support/pages";

type Item = { type: "dataSets" | "programs"; id: string };

async function assignedNames(api: any, { type, id }: Item): Promise<string[]> {
    const { organisationUnits } = await api.get(`${type}/${id}`, {
        fields: "organisationUnits[displayName,path]",
    });
    const { organisationUnits: roots } = await api.get("me", { fields: "organisationUnits[id]" });
    const rootIds: string[] = roots.map((root: any) => root.id);

    return organisationUnits
        .filter((unit: any) => rootIds.some(id => unit.path.includes(id)))
        .map((unit: any) => unit.displayName.trim())
        .sort();
}

async function expectTree(app: App, api: any, item: Item) {
    const panel = new OrgUnitTreePanel(app);
    const expected = await assignedNames(api, item);

    await expect(panel.tree).toBeHidden();
    await panel.opener.click();
    await expect(panel.tree).toBeVisible();
    await expect(panel.summary).toHaveText(`Assigned organisation units: ${expected.length}`);
    const names = (await panel.assigned.allInnerTexts()).map(name => name.trim()).sort();
    expect(names).toEqual(expected);
}

test.describe("HIS: organisation unit tree", () => {
    test("Data Sets: shows the org units of the data set, on demand", async ({ dataSets, api }) => {
        const { id, name } = fixtures.dataSets.small;
        await dataSets.load();
        await dataSets.select(name);
        await expectTree(dataSets, api, { type: "dataSets", id });
    });

    test("Programs: shows the org units of the program, on demand", async ({ programs, api }) => {
        const { id, name } = fixtures.programs.ambulances;
        await programs.load();
        await programs.select(name);
        await expectTree(programs, api, { type: "programs", id });
    });

    test("Selecting another item closes the panel and loads its own tree", async ({
        dataSets,
        api,
    }) => {
        const { small } = fixtures.dataSets;
        const others = await api.list("dataSets", {
            fields: "id,displayName,organisationUnits~size",
        });
        const { blacklistDS } = await config(api);
        const other = others.find(
            (d: any) =>
                d.id !== small.id &&
                d.organisationUnits > 0 &&
                d.organisationUnits <= 100 &&
                !blacklistDS.includes(d.id)
        );

        await dataSets.load();
        await dataSets.select(small.name);
        const panel = new OrgUnitTreePanel(dataSets);
        await panel.opener.click();
        await expect(panel.tree).toBeVisible();

        await dataSets.select(other.displayName);
        await expectTree(dataSets, api, { type: "dataSets", id: other.id });
    });

    test("A large tree starts with only its first levels expanded", async ({ dataSets, api }) => {
        const { blacklistDS } = await config(api);
        const all = await api.list("dataSets", {
            fields: "id,displayName,organisationUnits~size",
        });
        const large = all
            .filter((d: any) => d.organisationUnits > 100 && !blacklistDS.includes(d.id))
            .sort((a: any, b: any) => a.organisationUnits - b.organisationUnits)[0];

        await dataSets.load();
        await dataSets.select(large.displayName);
        const panel = new OrgUnitTreePanel(dataSets);
        await panel.opener.click();
        await expect(panel.summary).toBeVisible();

        const before = await panel.items.count();
        expect(before).toBeLessThan(large.organisationUnits);
        await panel.collapsedBranches.first().click();
        await expect.poll(() => panel.items.count()).toBeGreaterThan(before);
    });

    test("The panel is not printed", async ({ dataSets, page }) => {
        await dataSets.load();
        await dataSets.select(fixtures.dataSets.small.name);
        const panel = new OrgUnitTreePanel(dataSets);
        await expect(panel.opener).toBeVisible();
        await page.emulateMedia({ media: "print" });
        await expect(panel.opener).toBeHidden();
    });
});
