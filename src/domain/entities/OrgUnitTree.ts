import { Struct } from "./generic/Struct";
import { Id, NamedRef } from "./Ref";

export type AssignedOrgUnit = NamedRef & { path: string };

export type OrgUnitTreeNode = NamedRef & { assigned: boolean; children: OrgUnitTreeNode[] };

export type OrgUnitTreeAttrs = { roots: OrgUnitTreeNode[]; assignedCount: number };

type BuildOptions = {
    assigned: AssignedOrgUnit[];
    userRootIds: Id[];
    /** Names of the org units in the paths that are not assigned themselves. */
    ancestors: NamedRef[];
};

/**
 * The org units an item is assigned to, with the branches that lead to them. Only what hangs from
 * the org units of the user is shown, starting from them.
 */
export class OrgUnitTree extends Struct<OrgUnitTreeAttrs>() {
    /** The org units whose names are still needed to draw the branches. */
    static getAncestorIds(assigned: AssignedOrgUnit[], userRootIds: Id[]): Id[] {
        const assignedIds = new Set(assigned.map(orgUnit => orgUnit.id));
        const ids = assigned.flatMap(orgUnit => getVisiblePath(orgUnit.path, userRootIds));

        return Array.from(new Set(ids)).filter(id => !assignedIds.has(id));
    }

    static build(options: BuildOptions): OrgUnitTree {
        const { assigned, userRootIds, ancestors } = options;
        const names = new Map([...ancestors, ...assigned].map(item => [item.id, item.name.trim()]));
        const assignedIds = new Set(assigned.map(orgUnit => orgUnit.id));

        const paths = assigned
            .map(orgUnit => getVisiblePath(orgUnit.path, userRootIds))
            .filter(path => path.length > 0 && !path.some(id => isGeo(names.get(id) ?? "")));

        const toNode = (id: Id): MutableNode => ({
            id,
            name: names.get(id) ?? id,
            assigned: assignedIds.has(id),
            children: new Map(),
        });

        const roots = new Map<Id, MutableNode>();
        paths.forEach(path => {
            path.reduce((level, id) => {
                const node = level.get(id) ?? toNode(id);
                level.set(id, node);
                return node.children;
            }, roots);
        });

        const shown = new Set(paths.flat());

        return OrgUnitTree.create({
            roots: toSortedNodes(roots),
            assignedCount: [...assignedIds].filter(id => shown.has(id)).length,
        });
    }
}

type MutableNode = NamedRef & { assigned: boolean; children: Map<Id, MutableNode> };

function getVisiblePath(path: string, userRootIds: Id[]): Id[] {
    const ids = path.split("/").filter(Boolean);
    const start = ids.findIndex(id => userRootIds.includes(id));

    return start === -1 ? [] : ids.slice(start);
}

/** Org units that only hold the map geometry of another one. */
function isGeo(name: string): boolean {
    return name.toLowerCase().includes("_geo");
}

function toSortedNodes(level: Map<Id, MutableNode>): OrgUnitTreeNode[] {
    return Array.from(level.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(node => ({ ...node, children: toSortedNodes(node.children) }));
}
