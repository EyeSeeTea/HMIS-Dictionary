import { apiToFuture } from "$/data/api-futures";
import { DossierCandidate, DossierElement, DossierSection } from "$/domain/entities/Dossier";
import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { DossierRepository } from "$/domain/repositories/DossierRepository";
import { D2Api } from "$/types/d2-api";
import { text } from "./d2-mappers";

const candidateFields = {
    id: true,
    displayName: true,
    attributeValues: { value: true, attribute: { id: true } },
} as const;

const elementFields = {
    id: true,
    displayName: true,
    displayFormName: true,
    displayDescription: true,
} as const;

type D2Candidate = {
    id: string;
    displayName: string;
    attributeValues: { value: string; attribute: { id: string } }[];
};

type D2Element = {
    id: string;
    displayName: string;
    displayFormName?: string;
    displayDescription?: string;
};

export class DossierD2Repository implements DossierRepository {
    constructor(private api: D2Api) {}

    getDataSets(): FutureData<DossierCandidate[]> {
        return apiToFuture(
            this.api.models.dataSets.get({ fields: candidateFields, paging: false })
        ).map(({ objects }) => objects.map(toCandidate));
    }

    getIndicatorGroups(): FutureData<DossierCandidate[]> {
        return apiToFuture(
            this.api.models.indicatorGroups.get({ fields: candidateFields, paging: false })
        ).map(({ objects }) => objects.map(toCandidate));
    }

    getSections(dataSetId: Id): FutureData<DossierSection[]> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: {
                    sections: {
                        id: true,
                        displayName: true,
                        dataElements: elementFields,
                    },
                },
                filter: { id: { eq: dataSetId } },
                paging: false,
            })
        ).map(({ objects }) =>
            (objects[0]?.sections ?? []).map(section => ({
                id: section.id,
                name: section.displayName,
                dataElements: section.dataElements.map(toElement),
            }))
        );
    }

    getIndicators(groupId: Id): FutureData<DossierElement[]> {
        return apiToFuture(
            this.api.models.indicators.get({
                fields: elementFields,
                filter: { "indicatorGroups.id": { eq: groupId } },
                paging: false,
            })
        ).map(({ objects }) => objects.map(toElement));
    }
}

function toCandidate(candidate: D2Candidate): DossierCandidate {
    return {
        id: candidate.id,
        name: candidate.displayName,
        attributeValues: candidate.attributeValues.map(attributeValue => ({
            attributeId: attributeValue.attribute.id,
            value: attributeValue.value,
        })),
    };
}

function toElement(element: D2Element): DossierElement {
    return {
        id: element.id,
        name: element.displayName,
        formName: text(element.displayFormName),
        description: text(element.displayDescription),
    };
}
