import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { IndicatorVisualization } from "$/domain/entities/IndicatorVisualization";
import { Id } from "$/domain/entities/Ref";
import { VisualizationRepository } from "$/domain/repositories/VisualizationRepository";
import { D2Api } from "$/types/d2-api";

type D2Created = { response?: { uid?: string; id?: string } };

export class VisualizationD2Repository implements VisualizationRepository {
    constructor(private api: D2Api) {}

    save(visualization: IndicatorVisualization): FutureData<Id> {
        const payload = buildPayload(visualization);

        return apiToFuture(
            this.api.get<{ visualizations: { id: Id }[] }>("/visualizations", {
                filter: `name:eq:${visualization.name}`,
                fields: "id",
                paging: false,
            })
        ).flatMap(({ visualizations }) => {
            const existingId = visualizations[0]?.id;

            const saved: FutureData<Id> = existingId
                ? apiToFuture(
                      this.api.put<unknown>(
                          `/visualizations/${existingId}`,
                          {},
                          { ...payload, id: existingId }
                      )
                  ).map(() => existingId)
                : apiToFuture(this.api.post<D2Created>("/visualizations", {}, payload)).flatMap(
                      response => {
                          const id = response.response?.uid ?? response.response?.id;

                          return id
                              ? Future.success<Error, Id>(id)
                              : Future.error<Error, Id>(new Error("Visualization not created"));
                      }
                  );

            return saved.flatMap(id => this.share(id, visualization).map(() => id));
        });
    }

    private share(id: Id, visualization: IndicatorVisualization): FutureData<void> {
        return apiToFuture(
            this.api.put<unknown>(
                "/sharing",
                { type: "visualization", id: id },
                {
                    object: {
                        id: id,
                        name: visualization.name,
                        publicAccess: getPublicAccess(visualization),
                        externalAccess: false,
                        userGroupAccesses: visualization.allUsersGroupId
                            ? [{ id: visualization.allUsersGroupId, access: "rw------" }]
                            : [],
                    },
                }
            )
        ).map(() => undefined);
    }
}

function getPublicAccess(visualization: IndicatorVisualization): string {
    return visualization.allUsersGroupId ? "--------" : "r-------";
}

/** A pivot table with the items as rows, for this year and the user's organisation unit. */
function buildPayload(visualization: IndicatorVisualization) {
    const description = "Created with HMIS Dictionary";

    return {
        name: visualization.name,
        displayName: visualization.name,
        description: description,
        displayDescription: description,
        type: "PIVOT_TABLE",
        publicAccess: getPublicAccess(visualization),
        showData: false,
        fixRowHeaders: false,
        fixColumnHeaders: false,
        numberType: "VALUE",
        legend: { showKey: false, style: "FILL", strategy: "FIXED" },
        hideEmptyColumns: false,
        hideEmptyRows: false,
        hideEmptyRowItems: "NONE",
        hideSubtitle: false,
        hideTitle: false,
        rowSubTotals: false,
        rowTotals: false,
        colSubTotals: false,
        colTotals: false,
        displayDensity: "NORMAL",
        fontSize: "NORMAL",
        regressionType: "NONE",
        completedOnly: false,
        cumulativeValues: false,
        showDimensionLabels: true,
        sortOrder: 0,
        topLimit: 0,
        aggregationType: "DEFAULT",
        percentStackedValues: false,
        noSpaceBetweenColumns: false,
        showHierarchy: false,
        seriesKey: { hidden: false },
        digitGroupSeparator: "SPACE",
        regression: false,
        colorSet: "DEFAULT",
        skipRounding: false,
        reportingParams: {
            organisationUnit: false,
            reportingPeriod: false,
            parentOrganisationUnit: false,
            grandParentOrganisationUnit: false,
        },
        columns: [{ dimension: "pe", items: [{ id: "THIS_YEAR" }] }],
        filters: [{ dimension: "ou", items: [{ id: "USER_ORGUNIT" }] }],
        rows: [{ dimension: "dx", items: visualization.itemIds.map(id => ({ id })) }],
    };
}
