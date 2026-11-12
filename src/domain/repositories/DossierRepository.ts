import { DossierCandidate, DossierElement, DossierSection } from "$/domain/entities/Dossier";
import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";

export interface DossierRepository {
    getDataSets(): FutureData<DossierCandidate[]>;
    getIndicatorGroups(): FutureData<DossierCandidate[]>;
    getSections(dataSetId: Id): FutureData<DossierSection[]>;
    getIndicators(groupId: Id): FutureData<DossierElement[]>;
}
