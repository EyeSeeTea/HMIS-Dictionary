import { describe, expect, it } from "vitest";
import { OrgUnitTree } from "$/domain/entities/OrgUnitTree";

const assigned = [
    { id: "c", name: " Clinic ", path: "/world/root/region/c" },
    { id: "a", name: "Annex", path: "/world/root/region/a" },
    { id: "out", name: "Outside", path: "/world/other/out" },
];

describe("OrgUnitTree", () => {
    it("asks only for the names of the visible branches that are not assigned", () => {
        expect(OrgUnitTree.getAncestorIds(assigned, ["root"])).toEqual(["root", "region"]);
    });

    it("builds the branches from the user's org units, sorted, and marks the assigned ones", () => {
        const tree = OrgUnitTree.build({
            assigned,
            userRootIds: ["root"],
            ancestors: [
                { id: "root", name: "Root" },
                { id: "region", name: "Region" },
            ],
        });

        expect(tree.assignedCount).toBe(2);
        expect(tree.roots).toEqual([
            {
                id: "root",
                name: "Root",
                assigned: false,
                children: [
                    {
                        id: "region",
                        name: "Region",
                        assigned: false,
                        children: [
                            { id: "a", name: "Annex", assigned: true, children: [] },
                            { id: "c", name: "Clinic", assigned: true, children: [] },
                        ],
                    },
                ],
            },
        ]);
    });

    it("keeps an assigned org unit that also has assigned children", () => {
        const tree = OrgUnitTree.build({
            assigned: [
                { id: "p", name: "Parent", path: "/p" },
                { id: "k", name: "Kid", path: "/p/k" },
            ],
            userRootIds: ["p"],
            ancestors: [],
        });

        expect(tree.assignedCount).toBe(2);
        expect(tree.roots[0]?.assigned).toBe(true);
        expect(tree.roots[0]?.children[0]?.assigned).toBe(true);
    });

    it("leaves out org units with _geo in their name or in their branch", () => {
        const tree = OrgUnitTree.build({
            assigned: [
                { id: "g", name: "Clinic_GEO", path: "/root/g" },
                { id: "k", name: "Kid", path: "/root/geoParent/k" },
                { id: "ok", name: "Fine", path: "/root/ok" },
            ],
            userRootIds: ["root"],
            ancestors: [
                { id: "root", name: "Root" },
                { id: "geoParent", name: "Parent_geo" },
            ],
        });

        expect(tree.assignedCount).toBe(1);
        expect(tree.roots[0]?.children.map(node => node.id)).toEqual(["ok"]);
    });

    it("is empty when nothing hangs from the user's org units", () => {
        const tree = OrgUnitTree.build({ assigned, userRootIds: ["none"], ancestors: [] });

        expect(tree.roots).toEqual([]);
        expect(tree.assignedCount).toBe(0);
    });
});
