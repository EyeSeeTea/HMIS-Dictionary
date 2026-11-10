import { config } from "../support/data";
import { expect, fixtures, test } from "../support/fixtures";
import { mockKeys } from "../support/pages";

const limitOn = { selector_limitToUserOrgUnits: { value: true } };

/** The org units of the user become only this one, for this page. */
async function mockUserOrgUnit(page: any, id: string) {
    await page.route(
        /\/api(\/\d+)?\/me(\.json)?\?.*organisationUnits%5Bid%5D|\/api(\/\d+)?\/me(\.json)?\?.*organisationUnits\[id\]/,
        (route: any) => route.fulfill({ json: { organisationUnits: [{ id }] } })
    );
}

test.describe("HIS: limit the selectors to the org units of the user", () => {
    test("Off by default: data sets with no org units are listed", async ({ dataSets, api }) => {
        const { blacklistDS } = await config(api);
        const all = await api.list("dataSets", { fields: "id,displayName,organisationUnits~size" });
        const orphan = all.find((d: any) => !d.organisationUnits && !blacklistDS.includes(d.id));

        await dataSets.load();
        expect(await dataSets.optionLabels()).toContain(orphan.displayName);
    });

    test("On: data sets are limited, and the blacklist still applies", async ({
        dataSets,
        api,
        page,
    }) => {
        const { blacklistDS } = await config(api);
        const { organisationUnits } = await api.get(`dataSets/${fixtures.dataSets.small.id}`, {
            fields: "organisationUnits[id]",
        });
        const [orgUnit] = organisationUnits;
        const expected = await api.list("dataSets", {
            fields: "id,displayName",
            filter: `organisationUnits.path:like:${orgUnit.id}`,
        });
        const names = expected
            .filter((d: any) => !blacklistDS.includes(d.id))
            .map((d: any) => d.displayName)
            .sort();

        await mockKeys(page, limitOn);
        await mockUserOrgUnit(page, orgUnit.id);
        await dataSets.load();
        await expect.poll(async () => (await dataSets.optionLabels()).sort()).toEqual(names);
    });

    test("On: programs are limited", async ({ programs, api, page }) => {
        const { organisationUnits } = await api.get(
            `programs/${fixtures.programs.eventProgram.id}`,
            {
                fields: "organisationUnits[id,level]",
            }
        );
        const orgUnit = [...organisationUnits].sort((a: any, b: any) => b.level - a.level)[0];
        const expected = await api.list("programs", {
            fields: "displayName",
            filter: `organisationUnits.path:like:${orgUnit.id}`,
        });
        const all = await api.list("programs", { fields: "id" });
        expect(expected.length).toBeLessThan(all.length);

        await mockKeys(page, limitOn);
        await mockUserOrgUnit(page, orgUnit.id);
        await programs.load();
        await expect
            .poll(async () => (await programs.optionLabels()).sort())
            .toEqual(expected.map((p: any) => p.displayName).sort());
    });
});
