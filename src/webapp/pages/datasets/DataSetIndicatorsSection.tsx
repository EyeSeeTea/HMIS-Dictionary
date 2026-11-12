import React from "react";
import { Indicator } from "$/domain/entities/Indicator";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { usePrintSelection } from "$/webapp/components/print-selection/PrintSelection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { helpTexts } from "$/webapp/pages/datasets/helpTexts";

import css from "./LongCell.module.css";

type Props = {
    /** Already sorted by name. */
    indicators: Indicator[];
    canSeeSection: boolean;
    canSeeColumn: (column: string) => boolean;
};

export const DataSetIndicatorsSection: React.FC<Props> = React.memo(props => {
    const { indicators, canSeeSection, canSeeColumn } = props;
    const print = usePrintSelection();
    if (!canSeeSection || indicators.length === 0) return null;

    const columns = withColumnAccess<Indicator>(
        [
            {
                key: "name",
                header: getLayoutLabel("dos_NameIndicator"),
                helpText: helpTexts.datasets_ind_name_help(),
                render: indicator => indicator.name,
            },
            {
                key: "shortName",
                header: getLayoutLabel("dos_ShortNameIndicator"),
                helpText: helpTexts.datasets_ind_shortName_help(),
                render: indicator => indicator.shortName,
            },
            {
                key: "type",
                header: getLayoutLabel("dos_Type"),
                helpText: helpTexts.datasets_ind_type_help(),
                render: indicator => indicator.type,
            },
            {
                key: "numerator",
                header: getLayoutLabel("dos_NumeratorIndicator"),
                helpText: helpTexts.datasets_ind_numerator_help(),
                render: indicator => (
                    <div className={css.longCell} data-test="formula-cell">
                        {indicator.numeratorText}
                    </div>
                ),
            },
            {
                key: "numeratorDescription",
                header: getLayoutLabel("dos_NumeratorIndicatorDescription"),
                helpText: helpTexts.datasets_ind_numeratorDescription_help(),
                render: indicator => indicator.numeratorDescription,
            },
            {
                key: "denominator",
                header: getLayoutLabel("dos_DenominatorIndicator"),
                helpText: helpTexts.datasets_ind_denominator_help(),
                render: indicator => (
                    <div className={css.longCell} data-test="formula-cell">
                        {indicator.denominatorText}
                    </div>
                ),
            },
            {
                key: "denominatorDescription",
                header: getLayoutLabel("dos_DenominatorIndicatorDescription"),
                helpText: helpTexts.datasets_ind_denominatorDescription_help(),
                render: indicator => indicator.denominatorDescription,
            },
        ],
        canSeeColumn,
        column => print.isColumnPrinted("indicators", column)
    );

    return (
        <div id="indicatorContainer">
            <ContentSection
                id="indicators"
                title={getLayoutLabel("dos_Indicators")}
                helpText={helpTexts.datasets_i_description()}
            >
                <DataTable
                    rows={indicators}
                    columns={columns}
                    getRowId={indicator => indicator.id}
                />
            </ContentSection>
        </div>
    );
});
