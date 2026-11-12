import { FutureData } from "$/domain/entities/generic/Future";
import { NamedRef } from "$/domain/entities/Ref";
import {
    SearchDataElementSource,
    SearchIndicatorSource,
    SearchProgramIndicatorSource,
    SearchProgramSource,
} from "$/domain/entities/SearchCatalog";

export interface SearchRepository {
    getDataElements(): FutureData<SearchDataElementSource[]>;
    getPrograms(): FutureData<SearchProgramSource[]>;
    getCategoryOptionCombos(): FutureData<NamedRef[]>;
    getDataElementGroups(): FutureData<(NamedRef & { description: string })[]>;
    getCategoryOptions(): FutureData<NamedRef[]>;
    getProgramIndicators(): FutureData<SearchProgramIndicatorSource[]>;
    getIndicators(): FutureData<SearchIndicatorSource[]>;
}
