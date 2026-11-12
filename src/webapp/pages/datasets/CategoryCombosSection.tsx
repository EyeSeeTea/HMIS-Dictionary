import React from "react";
import { CategoryCombo } from "$/domain/entities/DataSet";
import { Maybe } from "$/utils/ts-utils";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { HelpIcon } from "$/webapp/components/help-icon/HelpIcon";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { Loader } from "$/webapp/utils/Loader";
import css from "./CategoryCombosSection.module.css";
import { helpTexts } from "$/webapp/pages/datasets/helpTexts";

type Props = {
    combos: Maybe<Loader<CategoryCombo[]>>;
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

/** One combo spans as many rows as it has categories, so this is not a plain DataTable. */
export const CategoryCombosSection: React.FC<Props> = React.memo(props => {
    const { combos, canSeeSection, canSeeColumn } = props;
    if (!canSeeSection) return null;

    const showCombo = canSeeColumn("categoryCombination");
    const showCategories = canSeeColumn("categories");
    const showItems = canSeeColumn("items");
    const data = combos?.type === "success" ? combos.data : [];

    return (
        <div id="categoryComboContainer">
            <ContentSection
                id="categoryCombinations"
                title={getLayoutLabel("dos_CategoryCombinations")}
                helpText={helpTexts.datasets_cc_description()}
                loader={combos}
            >
                <table className={`sectionElementsTable ${css.table}`}>
                    <thead>
                        <tr>
                            {showCombo && (
                                <th>
                                    {getLayoutLabel("dos_CategoryCombination")}
                                    <HelpIcon
                                        text={helpTexts.datasets_cc_categoryCombination_help()}
                                    />
                                </th>
                            )}
                            {showCategories && (
                                <th>
                                    {getLayoutLabel("dos_Categories")}
                                    <HelpIcon text={helpTexts.datasets_cc_categories_help()} />
                                </th>
                            )}
                            {showItems && (
                                <th>
                                    {getLayoutLabel("dos_Items")}
                                    <HelpIcon text={helpTexts.datasets_cc_items_help()} />
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.flatMap(combo =>
                            combo.categories.map((category, index) => (
                                <tr key={`${combo.id}-${index}`}>
                                    {showCombo && index === 0 && (
                                        <td id={combo.id} rowSpan={combo.categories.length}>
                                            {combo.name}
                                        </td>
                                    )}
                                    {showCategories && <td>{category.name}</td>}
                                    {showItems && (
                                        <td>
                                            <ul>
                                                {category.items.map((item, itemIndex) => (
                                                    <li key={itemIndex}>{item}</li>
                                                ))}
                                            </ul>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </ContentSection>
        </div>
    );
});
