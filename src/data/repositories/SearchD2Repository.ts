import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import { hardcodedIds } from "$/domain/entities/HardcodedIds";
import { NamedRef } from "$/domain/entities/Ref";
import {
    SearchDataElementSource,
    SearchGroupSource,
    SearchIndicatorSource,
    SearchProgramIndicatorSource,
} from "$/domain/entities/SearchCatalog";
import { SearchRepository } from "$/domain/repositories/SearchRepository";
import { D2Api } from "$/types/d2-api";
import { text, toNamedRef } from "./d2-mappers";

const attributeValueFields = { value: true, attribute: { id: true } } as const;

const groupFields = {
    id: true,
    code: true,
    displayName: true,
    attributeValues: attributeValueFields,
} as const;

const baseFields = {
    id: true,
    code: true,
    displayName: true,
    displayFormName: true,
    displayDescription: true,
} as const;

type D2Group = {
    id: string;
    code?: string;
    displayName: string;
    attributeValues: { value: string; attribute: { id: string } }[];
};

export class SearchD2Repository implements SearchRepository {
    constructor(private api: D2Api) {}

    getDataElements(): FutureData<SearchDataElementSource[]> {
        return apiToFuture(
            this.api.models.dataElements.get({
                fields: {
                    ...baseFields,
                    displayShortName: true,
                    attributeValues: attributeValueFields,
                    dataElementGroups: { id: true },
                    dataSetElements: { dataSet: groupFields },
                },
                filter: { domainType: { eq: "AGGREGATE" } },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(dataElement => ({
                id: dataElement.id,
                name: dataElement.displayName,
                code: text(dataElement.code),
                shortName: text(dataElement.displayShortName),
                formName: text(dataElement.displayFormName),
                description: text(dataElement.displayDescription),
                icd10: text(
                    dataElement.attributeValues.find(
                        attributeValue =>
                            attributeValue.attribute.id === hardcodedIds.icd10Attribute
                    )?.value
                ),
                groupIds: dataElement.dataElementGroups.map(group => group.id),
                dataSets: dataElement.dataSetElements.map(({ dataSet }) => toGroup(dataSet)),
            }))
        );
    }

    getCategoryOptionCombos(): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.categoryOptionCombos.get({
                fields: { id: true, displayName: true },
                paging: false,
            })
        ).map(({ objects }) => objects.map(toNamedRef));
    }

    getProgramIndicators(): FutureData<SearchProgramIndicatorSource[]> {
        return apiToFuture(
            this.api.models.programIndicators.get({
                fields: {
                    ...baseFields,
                    expression: true,
                    filter: true,
                    programIndicatorGroups: { id: true, code: true, name: true },
                },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(programIndicator => ({
                id: programIndicator.id,
                name: programIndicator.displayName,
                code: text(programIndicator.code),
                formName: text(programIndicator.displayFormName),
                description: text(programIndicator.displayDescription),
                expression: text(programIndicator.expression),
                filter: text(programIndicator.filter),
                // The untranslated name, as today (decision 5)
                groups: programIndicator.programIndicatorGroups.map(group => ({
                    id: group.id,
                    code: text(group.code),
                    name: group.name,
                })),
            }))
        );
    }

    getIndicators(): FutureData<SearchIndicatorSource[]> {
        return apiToFuture(
            this.api.models.indicators.get({
                fields: {
                    ...baseFields,
                    displayShortName: true,
                    numerator: true,
                    denominator: true,
                    indicatorGroups: groupFields,
                },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(indicator => ({
                id: indicator.id,
                name: indicator.displayName,
                code: text(indicator.code),
                shortName: text(indicator.displayShortName),
                formName: text(indicator.displayFormName),
                description: text(indicator.displayDescription),
                numerator: text(indicator.numerator),
                denominator: text(indicator.denominator),
                groups: indicator.indicatorGroups.map(toGroup),
            }))
        );
    }
}

function toGroup(group: D2Group): SearchGroupSource {
    return {
        id: group.id,
        code: text(group.code),
        name: group.displayName,
        attributeValues: group.attributeValues.map(attributeValue => ({
            attributeId: attributeValue.attribute.id,
            value: attributeValue.value,
        })),
    };
}
