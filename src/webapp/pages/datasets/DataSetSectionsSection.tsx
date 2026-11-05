import React from "react";
import { DataSet, DataSetElement } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import {
    PrintableBlock,
    usePrintSelection,
} from "$/webapp/components/print-selection/PrintSelection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { scrollToId } from "$/webapp/components/table-of-contents/TableOfContents";
import { helpTexts } from "$/webapp/pages/datasets/helpTexts";

import css from "./LongCell.module.css";

type Props = {
    dataSet: DataSet;
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

export const DataSetSectionsSection: React.FC<Props> = React.memo(props => {
    const { dataSet, canSeeSection, canSeeColumn } = props;
    const print = usePrintSelection();
    if (!canSeeSection) return null;

    const columns = withColumnAccess<DataSetElement>(
        [
            {
                key: "name",
                header: getLayoutLabel("dos_NameElement"),
                helpText: helpTexts.datasets_sec_name_help(),
                render: element => element.name,
                sortValue: element => element.name,
            },
            {
                key: "formName",
                header: getLayoutLabel("dos_FormNameElement"),
                helpText: helpTexts.datasets_sec_formName_help(),
                render: element => element.formName,
                sortValue: element => element.formName,
            },
            {
                key: "shortName",
                header: getLayoutLabel("dos_ShortNameElement"),
                helpText: helpTexts.datasets_sec_shortName_help(),
                render: element => element.shortName,
                sortValue: element => element.shortName,
            },
            {
                key: "description",
                header: getLayoutLabel("dos_DescriptionElement"),
                helpText: helpTexts.datasets_sec_description_help(),
                render: element => element.description,
            },
            {
                key: "dataTypeElement",
                header: getLayoutLabel("dos_DataTypeElement"),
                helpText: helpTexts.datasets_sec_dataTypeElement_help(),
                render: element => element.valueType,
                sortValue: element => element.valueType,
            },
            {
                key: "aggregationType",
                header: getLayoutLabel("dos_AggregationType"),
                helpText: i18n.t("Defines how the values of the data element are aggregated."),
                render: element => element.aggregationType,
                sortValue: element => element.aggregationType,
            },
            {
                key: "options",
                header: getLayoutLabel("dos_Options"),
                helpText: helpTexts.datasets_sec_options_help(),
                render: element => (
                    <ul className={css.longCell} data-test="options-cell">
                        {element.optionNames.map((option, index) => (
                            <li key={index}>{option || "-"}</li>
                        ))}
                    </ul>
                ),
            },
            {
                key: "categoryCombination",
                header: getLayoutLabel("dos_CategoryCombination"),
                helpText: helpTexts.datasets_sec_categoryCombination_help(),
                render: element => (
                    <a
                        href={`#${element.categoryCombo.id}`}
                        onClick={event => {
                            event.preventDefault();
                            scrollToId(element.categoryCombo.id);
                        }}
                    >
                        {element.categoryCombo.name}
                    </a>
                ),
                sortValue: element => element.categoryCombo.name,
            },
        ],
        canSeeColumn,
        column => print.isColumnPrinted("sections", column)
    );

    return (
        <div id="sectionContainer">
            {dataSet.sections.map(section => (
                <PrintableBlock key={section.id} section={section.id}>
                    <ContentSection
                        id={section.id}
                        title={section.name}
                        count={section.dataElements.length}
                        countLabel={i18n.t("Number of Elements in Section")}
                        helpText={helpTexts.datasets_sec_description()}
                    >
                        {section.description && (
                            <p data-test={`section-description-${section.id}`}>
                                {section.description}
                            </p>
                        )}
                        <DataTable
                            rows={section.dataElements}
                            columns={columns}
                            getRowId={element => element.id}
                            emptyText={i18n.t("No data elements")}
                        />
                    </ContentSection>
                </PrintableBlock>
            ))}
        </div>
    );
});
