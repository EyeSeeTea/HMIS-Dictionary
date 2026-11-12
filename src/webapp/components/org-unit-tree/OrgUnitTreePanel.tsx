import React from "react";
import { CircularLoader, NoticeBox } from "@dhis2/ui";
import { OrgUnitTree, OrgUnitTreeNode } from "$/domain/entities/OrgUnitTree";
import { Id } from "$/domain/entities/Ref";
import { OrgUnitOwner } from "$/domain/repositories/OrgUnitRepository";
import i18n from "$/utils/i18n";
import { CollapsiblePanel } from "$/webapp/components/collapsible-panel/CollapsiblePanel";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import css from "./OrgUnitTreePanel.module.css";

type OwnerProps = { ownerType: OrgUnitOwner["type"]; ownerId: Id };

/** Above this many assigned org units, only the first levels start expanded. */
const maxFullyExpanded = 100;
const initialLevels = 2;

/** Read-only tree of the org units of a data set or program. It loads when opened. */
export const OrgUnitTreePanel: React.FC<OwnerProps> = React.memo(({ ownerType, ownerId }) => {
    return (
        <div className="no-print" data-test="org-unit-tree">
            <CollapsiblePanel key={ownerId} title={i18n.t("Organisation units")}>
                <OrgUnitTreeContent ownerType={ownerType} ownerId={ownerId} />
            </CollapsiblePanel>
        </div>
    );
});

const OrgUnitTreeContent: React.FC<OwnerProps> = ({ ownerType, ownerId }) => {
    const { compositionRoot } = useAppContext();
    const tree = useFuture(
        () => compositionRoot.orgUnits.getTree.execute({ type: ownerType, id: ownerId }),
        [compositionRoot, ownerType, ownerId]
    );

    if (!tree || tree.type === "loading") return <CircularLoader small />;
    if (tree.type === "error") {
        return (
            <NoticeBox error title={i18n.t("Organisation units")}>
                {tree.error.message}
            </NoticeBox>
        );
    }

    return <Tree tree={tree.data} />;
};

const Tree: React.FC<{ tree: OrgUnitTree }> = ({ tree }) => {
    if (tree.roots.length === 0) return <p>{i18n.t("No organisation units")}</p>;
    const expandedLevels = tree.assignedCount > maxFullyExpanded ? initialLevels : Infinity;

    return (
        <>
            <p>
                {i18n.t("Assigned organisation units")}: {tree.assignedCount}
            </p>
            <ul className={css.tree} role="tree">
                {tree.roots.map(node => (
                    <TreeNode key={node.id} node={node} level={1} expandedLevels={expandedLevels} />
                ))}
            </ul>
        </>
    );
};

type TreeNodeProps = { node: OrgUnitTreeNode; level: number; expandedLevels: number };

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, expandedLevels }) => {
    const [open, setOpen] = React.useState(level < expandedLevels);
    const hasChildren = node.children.length > 0;

    return (
        <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
            {hasChildren ? (
                <button
                    type="button"
                    className={css.toggle}
                    aria-label={node.name}
                    onClick={() => setOpen(prev => !prev)}
                >
                    {open ? "▾" : "▸"}
                </button>
            ) : (
                <span className={css.toggle} />
            )}
            <span
                className={node.assigned ? css.assigned : undefined}
                data-assigned={node.assigned}
            >
                {node.name}
            </span>
            {hasChildren && open && (
                <ul role="group">
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedLevels={expandedLevels}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};
