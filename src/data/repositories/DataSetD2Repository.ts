import { apiToFuture } from "$/data/api-futures";
import { CategoryCombo, DataSet, DataSetElement } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { D2Api } from "$/types/d2-api";
import { Maybe } from "$/utils/ts-utils";
import { text, toNamedRef } from "./d2-mappers";

const comboFields = { id: true, displayName: true } as const;

const elementFields = {
    id: true,
    displayName: true,
    displayShortName: true,
    displayFormName: true,
    displayDescription: true,
    valueType: true,
    optionSet: { options: { displayName: true } },
    categoryCombo: comboFields,
} as const;

type D2Combo = { id: string; displayName: string };

export type D2DataElement = {
    id: string;
    displayName: string;
    displayShortName?: string;
    displayFormName?: string;
    displayDescription?: string;
    valueType: string;
    optionSet?: { options: { displayName: string }[] };
    categoryCombo: D2Combo;
};

export type D2DataSet = {
    id: string;
    displayName: string;
    displayDescription?: string;
    sections: { id: string; displayName: string; dataElements: D2DataElement[] }[];
    dataSetElements: { categoryCombo?: D2Combo; dataElement: D2DataElement }[];
};

export class DataSetD2Repository implements DataSetRepository {
    constructor(private api: D2Api) {}

    getAll(excludedIds: Id[]): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: { id: true, displayName: true },
                filter: excludedIds.length > 0 ? { id: { "!in": excludedIds } } : {},
                paging: false,
            })
        ).map(({ objects }) => objects.map(toNamedRef));
    }

    getByName(name: string): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: { id: true, displayName: true },
                filter: { displayName: { eq: name } },
                paging: false,
            })
        ).map(({ objects }) => objects.map(toNamedRef));
    }

    get(id: Id): FutureData<DataSet> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: {
                    id: true,
                    displayName: true,
                    displayDescription: true,
                    sections: { id: true, displayName: true, dataElements: elementFields },
                    dataSetElements: {
                        categoryCombo: comboFields,
                        dataElement: elementFields,
                    },
                },
                filter: { id: { eq: id } },
                paging: false,
            })
        ).flatMap(({ objects }) => {
            const [dataSet] = objects;

            return dataSet
                ? Future.success(toDataSet(dataSet))
                : Future.error(new Error(`Data set not found: ${id}`));
        });
    }

    getCategoryCombos(ids: Id[]): FutureData<CategoryCombo[]> {
        return apiToFuture(
            this.api.get<{
                categoryCombos: {
                    id: string;
                    displayName: string;
                    categories: { displayName: string; items?: { displayName: string }[] }[];
                }[];
            }>("/categoryCombos", {
                filter: `id:in:[${ids.join(",")}]`,
                fields: "id,displayName,categories[displayName,items[displayName]]",
                paging: false,
            })
        ).map(({ categoryCombos }) =>
            categoryCombos.map(combo => ({
                id: combo.id,
                name: combo.displayName,
                categories: combo.categories.map(category => ({
                    name: category.displayName,
                    items: (category.items ?? []).map(item => item.displayName),
                })),
            }))
        );
    }
}

export function toDataSet(dataSet: D2DataSet): DataSet {
    const toElement = (element: D2DataElement): DataSetElement => {
        const override: Maybe<D2Combo> = dataSet.dataSetElements.find(
            dataSetElement => dataSetElement.dataElement.id === element.id
        )?.categoryCombo;

        return {
            id: element.id,
            name: element.displayName,
            shortName: text(element.displayShortName),
            formName: text(element.displayFormName),
            description: text(element.displayDescription),
            valueType: element.valueType,
            optionNames: (element.optionSet?.options ?? []).map(option => option.displayName),
            categoryCombo: toNamedRef(override ?? element.categoryCombo),
        };
    };

    const hasRealSections = dataSet.sections.length > 0;

    return DataSet.create({
        id: dataSet.id,
        name: dataSet.displayName,
        description: text(dataSet.displayDescription),
        hasRealSections: hasRealSections,
        sections: hasRealSections
            ? dataSet.sections.map(section => ({
                  id: section.id,
                  name: section.displayName,
                  dataElements: section.dataElements.map(toElement),
              }))
            : [
                  {
                      id: "DataElements",
                      name: "Data Elements",
                      dataElements: dataSet.dataSetElements.map(({ dataElement }) =>
                          toElement(dataElement)
                      ),
                  },
              ],
        dataElementIds: dataSet.dataSetElements.map(({ dataElement }) => dataElement.id),
    });
}
