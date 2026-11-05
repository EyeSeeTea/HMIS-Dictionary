import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import {
    SearchDataElementSource,
    SearchIndicatorSource,
    SearchProgramIndicatorSource,
} from "$/domain/entities/SearchCatalog";

export interface SearchRepository {
    getDataElements(): FutureData<SearchDataElementSource[]>;
    getCategoryOptionCombos(): FutureData<NamedRef[]>;
    getProgramIndicators(): FutureData<SearchProgramIndicatorSource[]>;
    getIndicators(): FutureData<SearchIndicatorSource[]>;
}
