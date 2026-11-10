import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import {
    SearchDataElementSource,
    SearchGroupSource,
    SearchIndicatorSource,
    SearchProgramIndicatorSource,
    SearchProgramSource,
} from "$/domain/entities/SearchCatalog";
import { AttributeValue } from "$/domain/entities/Shared";
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
                    domainType: true,
                    attributeValues: attributeValueFields,
                    dataElementGroups: { id: true, displayName: true },
                    dataSetElements: { dataSet: groupFields },
                },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(dataElement => ({
                id: dataElement.id,
                domain: dataElement.domainType === "TRACKER" ? "tracker" : "aggregate",
                name: dataElement.displayName,
                code: text(dataElement.code),
                shortName: text(dataElement.displayShortName),
                formName: text(dataElement.displayFormName),
                description: text(dataElement.displayDescription),
                attributeValues: toAttributeValues(dataElement.attributeValues),
                groupIds: dataElement.dataElementGroups.map(group => group.id),
                groupNames: dataElement.dataElementGroups.map(group => group.displayName),
                dataSets: dataElement.dataSetElements.map(({ dataSet }) => toGroup(dataSet)),
            }))
        );
    }

    getPrograms(): FutureData<SearchProgramSource[]> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: {
                    id: true,
                    code: true,
                    displayName: true,
                    programStages: {
                        programStageDataElements: { dataElement: { id: true } },
                    },
                },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(program => ({
                id: program.id,
                code: text(program.code),
                name: program.displayName,
                dataElementIds: program.programStages.flatMap(stage =>
                    stage.programStageDataElements.map(({ dataElement }) => dataElement.id)
                ),
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

    getDataElementGroups(): FutureData<(NamedRef & { description: string })[]> {
        return apiToFuture(
            this.api.models.dataElementGroups.get({
                fields: { id: true, displayName: true, displayDescription: true },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(group => ({
                ...toNamedRef(group),
                description: text(group.displayDescription),
            }))
        );
    }

    getCategoryOptions(): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.models.categoryOptions.get({
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
                    displayShortName: true,
                    expression: true,
                    filter: true,
                    programIndicatorGroups: { id: true, code: true, name: true },
                    program: { displayName: true },
                },
                paging: false,
            })
        ).map(({ objects }) =>
            objects.map(programIndicator => ({
                id: programIndicator.id,
                name: programIndicator.displayName,
                code: text(programIndicator.code),
                shortName: text(programIndicator.displayShortName),
                programName: text(programIndicator.program?.displayName),
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
        attributeValues: toAttributeValues(group.attributeValues),
    };
}

function toAttributeValues(values: D2Group["attributeValues"]): AttributeValue[] {
    return values.map(({ attribute, value }) => ({ attributeId: attribute.id, value }));
}
