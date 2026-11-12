import { apiToFuture } from "$/data/api-futures";
import { FormulaReferences } from "$/domain/entities/FormulaBreakdown";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { FormulaToken } from "$/domain/entities/IndicatorFormula";
import { Id } from "$/domain/entities/Ref";
import { FormulaRepository } from "$/domain/repositories/FormulaRepository";
import { D2Api } from "$/types/d2-api";

type Named = { id: Id; name: string };

/** Translated names, so the links to Data Sets and Programs find them by display name. */
export class FormulaD2Repository implements FormulaRepository {
    constructor(private api: D2Api) {}

    getReferences(tokens: FormulaToken[]): FutureData<FormulaReferences> {
        const ids = collectIds(tokens);

        return Future.joinObj({
            dataElements: this.getDataElements(ids.dataElements),
            categoryOptionCombos: this.getNames("categoryOptionCombos", ids.categoryOptionCombos),
            programIndicators: this.getNames("programIndicators", ids.programIndicators),
            indicators: this.getNames("indicators", ids.indicators),
            organisationUnitGroups: this.getNames(
                "organisationUnitGroups",
                ids.organisationUnitGroups
            ),
            constants: this.getConstants(ids.constants),
            programs: this.getNames("programs", ids.programs),
            attributes: this.getNames("trackedEntityAttributes", ids.attributes),
        }).map(({ dataElements, ...others }) => ({
            names: new Map(
                [...dataElements, ...Object.values(others).flat()].map(item => [item.id, item.name])
            ),
            dataSetNames: new Map(
                dataElements.map(dataElement => [dataElement.id, dataElement.dataSetNames])
            ),
        }));
    }

    private getDataElements(ids: Id[]): FutureData<(Named & { dataSetNames: string[] })[]> {
        if (ids.length === 0) return Future.success([]);

        return apiToFuture(
            this.api.get<{
                dataElements: {
                    id: Id;
                    displayName: string;
                    dataSetElements?: { dataSet: { displayName: string } }[];
                }[];
            }>("/dataElements", {
                filter: `id:in:[${ids.join(",")}]`,
                fields: "id,displayName,dataSetElements[dataSet[displayName]]",
                paging: false,
            })
        ).map(({ dataElements }) =>
            dataElements.map(dataElement => ({
                id: dataElement.id,
                name: dataElement.displayName,
                dataSetNames: (dataElement.dataSetElements ?? []).map(
                    ({ dataSet }) => dataSet.displayName
                ),
            }))
        );
    }

    /** A constant shows as its value, so its "name" is the value. */
    private getConstants(ids: Id[]): FutureData<Named[]> {
        if (ids.length === 0) return Future.success([]);

        return apiToFuture(
            this.api.get<{ constants: { id: Id; value?: number }[] }>("/constants", {
                filter: `id:in:[${ids.join(",")}]`,
                fields: "id,value",
                paging: false,
            })
        ).map(({ constants }) =>
            constants.flatMap(constant =>
                constant.value === undefined
                    ? []
                    : [{ id: constant.id, name: String(constant.value) }]
            )
        );
    }

    private getNames(model: string, ids: Id[]): FutureData<Named[]> {
        if (ids.length === 0) return Future.success([]);

        return apiToFuture(
            this.api.get<Record<string, { id: Id; displayName: string }[]>>(`/${model}`, {
                filter: `id:in:[${ids.join(",")}]`,
                fields: "id,displayName",
                paging: false,
            })
        ).map(response =>
            (response[model] ?? []).map(item => ({ id: item.id, name: item.displayName }))
        );
    }
}

function collectIds(tokens: FormulaToken[]) {
    const ids = {
        dataElements: new Set<Id>(),
        categoryOptionCombos: new Set<Id>(),
        programIndicators: new Set<Id>(),
        indicators: new Set<Id>(),
        organisationUnitGroups: new Set<Id>(),
        constants: new Set<Id>(),
        programs: new Set<Id>(),
        attributes: new Set<Id>(),
    };

    tokens.forEach(token => {
        switch (token.type) {
            case "dataElement":
                ids.dataElements.add(token.dataElementId);
                if (token.categoryOptionComboId)
                    ids.categoryOptionCombos.add(token.categoryOptionComboId);
                break;
            case "programDataElement":
                ids.programs.add(token.programId);
                ids.dataElements.add(token.dataElementId);
                break;
            case "programAttribute":
                ids.programs.add(token.programId);
                ids.attributes.add(token.attributeId);
                break;
            case "programIndicator":
                ids.programIndicators.add(token.id);
                break;
            case "indicator":
                ids.indicators.add(token.id);
                break;
            case "orgUnitGroup":
                ids.organisationUnitGroups.add(token.id);
                break;
            case "constant":
                ids.constants.add(token.id);
                break;
            default:
                break;
        }
    });

    return {
        dataElements: [...ids.dataElements],
        categoryOptionCombos: [...ids.categoryOptionCombos],
        programIndicators: [...ids.programIndicators],
        indicators: [...ids.indicators],
        organisationUnitGroups: [...ids.organisationUnitGroups],
        constants: [...ids.constants],
        programs: [...ids.programs],
        attributes: [...ids.attributes],
    };
}
