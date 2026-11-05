import React from "react";
import { Link } from "react-router-dom";
import { FormulaComponent } from "$/domain/entities/FormulaBreakdown";
import i18n from "$/utils/i18n";
import { ContentSection } from "$/webapp/components/content-section/ContentSection";
import { DataTable, withColumnAccess } from "$/webapp/components/data-table/DataTable";
import { getLayoutLabel } from "$/webapp/components/layout-settings/layoutLabels";
import { linkedNameKeys } from "$/webapp/hooks/useLinkedName";
import { appRoutes } from "$/webapp/routes";
import { compareNames } from "$/webapp/utils/compare";

type Props = {
    id: string;
    title: string;
    helpText: string;
    description: string;
    components: FormulaComponent[];
    hidden: boolean;
    canSeeColumn: (column: string) => boolean;
    columnHelp: { type: string; name: string; datasets: string; program: string };
};

/** Numerator or denominator: what the formula is made of, with links to Data Sets and Programs. */
export const FormulaComponentsSection: React.FC<Props> = React.memo(props => {
    const { id, title, helpText, description, components, hidden, canSeeColumn, columnHelp } =
        props;

    const sorted = React.useMemo(
        () => [...components].sort((a, b) => compareNames(a.name, b.name)),
        [components]
    );

    const columns = withColumnAccess<FormulaComponent>(
        [
            {
                key: "type",
                header: getLayoutLabel("dos_Type"),
                helpText: columnHelp.type,
                render: component => getTypeLabel(component.type),
            },
            {
                key: "name",
                header: getLayoutLabel("dos_NameIndicator"),
                helpText: columnHelp.name,
                render: component => component.name,
            },
            {
                key: "datasets",
                header: getLayoutLabel("dos_DataSets"),
                helpText: columnHelp.datasets,
                render: component =>
                    component.type === "aggregateDataElement" &&
                    component.dataSetNames.length === 0 ? (
                        i18n.t("No Value")
                    ) : (
                        <ObjectLinks
                            names={component.dataSetNames}
                            path={appRoutes.dataSets.path}
                            storageKey={linkedNameKeys.dataSet}
                        />
                    ),
            },
            {
                key: "program",
                header: getLayoutLabel("dos_Program"),
                helpText: columnHelp.program,
                render: component => (
                    <ObjectLinks
                        names={component.programNames}
                        path={appRoutes.programs.path}
                        storageKey={linkedNameKeys.program}
                    />
                ),
            },
        ],
        canSeeColumn
    );

    return (
        <ContentSection
            id={id}
            level="h2"
            headingClassName=""
            title={title}
            helpText={helpText}
            hidden={hidden}
        >
            <p>{description}</p>
            <DataTable
                rows={sorted}
                columns={columns}
                getRowId={component => `${component.type}-${component.name}`}
            />
        </ContentSection>
    );
});

const ObjectLinks: React.FC<{ names: string[]; path: string; storageKey: string }> = ({
    names,
    path,
    storageKey,
}) => (
    <ul>
        {names.map(name => (
            <li key={name}>
                <Link to={path} onClick={() => sessionStorage.setItem(storageKey, name)}>
                    <button type="button">{name}</button>
                </Link>
            </li>
        ))}
    </ul>
);

function getTypeLabel(type: FormulaComponent["type"]): string {
    switch (type) {
        case "aggregateDataElement":
            return i18n.t("Data Element - Aggregate Value");
        case "trackerDataElement":
            return i18n.t("Data Element - Tracker Value");
        case "programIndicator":
            return i18n.t("Program Indicator");
        case "orgUnitGroup":
            return i18n.t("Organisation Unit Group");
        case "number":
            return i18n.t("Number");
    }
}
