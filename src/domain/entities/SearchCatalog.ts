import { AccessContext, AppSettings } from "./AppSettings";
import { Struct } from "./generic/Struct";
import { HealthService } from "./HealthService";
import { hardcodedIds } from "./HardcodedIds";
import {
    FormulaLookup,
    FormulaObject,
    FormulaTags,
    IndicatorFormula,
    formulaToPlainText,
} from "./IndicatorFormula";
import { ProgramExpression } from "./ProgramExpression";
import { Id, NamedRef } from "./Ref";
import { SearchRow } from "./SearchFilter";
import { AttributeValue } from "./Shared";

type SearchGroup = NamedRef & { code: string };

type SearchObjectBase = {
    id: Id;
    code: string;
    name: string;
    formName: string;
    description: string;
    /** Data sets of a data element, or the groups of an indicator or a program indicator. */
    groups: SearchGroup[];
};

/** The stored text of the type column, which filters match against. */
const typeLabels = {
    dataElement: "dataElement",
    indicator: "indicator",
    programIndicator: "program indicator",
} as const;

export type SearchObject = SearchObjectBase &
    (
        | { type: "dataElement"; shortName: string; icd10: string; healthServices: HealthService[] }
        | {
              type: "indicator";
              shortName: string;
              numerator: IndicatorFormula;
              denominator: IndicatorFormula;
              healthServices: HealthService[];
          }
        | { type: "programIndicator"; expression: ProgramExpression; filter: ProgramExpression }
    );

export type SearchGroupSource = SearchGroup & { attributeValues: AttributeValue[] };

export type SearchDataElementSource = NamedRef & {
    code: string;
    shortName: string;
    formName: string;
    description: string;
    icd10: string;
    groupIds: Id[];
    dataSets: SearchGroupSource[];
};

export type SearchIndicatorSource = NamedRef & {
    code: string;
    shortName: string;
    formName: string;
    description: string;
    numerator: string;
    denominator: string;
    groups: SearchGroupSource[];
};

export type SearchProgramIndicatorSource = NamedRef & {
    code: string;
    formName: string;
    description: string;
    expression: string;
    filter: string;
    groups: SearchGroup[];
};

export type SearchSources = {
    dataElements: SearchDataElementSource[];
    categoryOptionCombos: NamedRef[];
    programIndicators: SearchProgramIndicatorSource[];
    indicators: SearchIndicatorSource[];
};

export type SearchCatalogAttrs = {
    objects: SearchObject[];
    /** Includes hidden objects, flagged, as formulas can reference them. */
    lookup: FormulaLookup;
    tags: FormulaTags;
};

export class SearchCatalog extends Struct<SearchCatalogAttrs>() {
    static build(
        sources: SearchSources,
        healthServices: HealthService[],
        context: AccessContext
    ): SearchCatalog {
        const { settings, user } = context;
        const servicesByKey = new Map(healthServices.map(service => [service.key(), service]));

        const dataElements = sources.dataElements
            .filter(source => !settings.isDataElementBlacklisted(source.groupIds))
            .map((source): SearchObject => {
                const dataSets = source.dataSets.filter(
                    dataSet => !settings.blacklist.dataSetIds.includes(dataSet.id)
                );

                return {
                    type: "dataElement",
                    ...getBase(source),
                    shortName: source.shortName,
                    icd10: source.icd10,
                    groups: dataSets.map(toGroup),
                    healthServices: uniqueById(
                        dataSets.flatMap(dataSet =>
                            findServices(dataSetServiceValue(dataSet), servicesByKey)
                        )
                    ),
                };
            });

        const indicators = sources.indicators
            .filter(source => settings.isIndicatorVisible(source.groups.map(getGroupId), user))
            .map(
                (source): SearchObject => ({
                    type: "indicator",
                    ...getBase(source),
                    shortName: source.shortName,
                    numerator: IndicatorFormula.create({ expression: source.numerator }),
                    denominator: IndicatorFormula.create({ expression: source.denominator }),
                    groups: source.groups.map(toGroup),
                    healthServices: uniqueById(
                        source.groups.flatMap(group =>
                            findServices(group.attributeValues[0]?.value ?? "", servicesByKey)
                        )
                    ),
                })
            );

        const programIndicators = sources.programIndicators
            .filter(source =>
                settings.isProgramIndicatorVisible(source.groups.map(getGroupId), user)
            )
            .map(
                (source): SearchObject => ({
                    type: "programIndicator",
                    ...getBase(source),
                    expression: ProgramExpression.create({ expression: source.expression }),
                    filter: ProgramExpression.create({ expression: source.filter }),
                    groups: source.groups.map(toGroup),
                })
            );

        return SearchCatalog.create({
            objects: [...dataElements, ...indicators, ...programIndicators],
            lookup: buildLookup(sources, settings),
            tags: { blacklist: settings.blacklist.tag, notInUse: settings.notInUse.tag },
        });
    }

    rows(): SearchRow[] {
        return this.objects.map(object => this.toRow(object));
    }

    private toRow(object: SearchObject): SearchRow {
        const services = object.type === "programIndicator" ? [] : object.healthServices;
        const isIndicator = object.type === "indicator";
        const isProgramIndicator = object.type === "programIndicator";
        const numerator = isIndicator ? object.numerator : undefined;
        const denominator = isIndicator ? object.denominator : undefined;
        const expression = isProgramIndicator ? object.expression.expression : "";
        const filter = isProgramIndicator ? object.filter.expression : "";

        return {
            columns: {
                object_type: typeLabels[object.type],
                object_id: object.id,
                object_code: object.code,
                object_ICD10: object.type === "dataElement" ? object.icd10 : "",
                object_name: object.name,
                object_shortName: object.type === "programIndicator" ? "" : object.shortName,
                object_form: object.formName,
                object_description: object.description,
                object_num_formula: this.formulaText(numerator),
                object_den_formula: this.formulaText(denominator),
                object_exp_formula: expression,
                object_flt_formula: filter,
                objectGroup_id: joinValues(object.groups.map(group => group.id)),
                objectGroup_code: joinValues(object.groups.map(group => group.code)),
                objectGroup_name: joinValues(object.groups.map(group => group.name)),
                service_id: joinValues(services.map(service => service.id)),
                service_code: joinValues(services.map(service => service.code)),
                service_name: joinValues(services.map(service => service.name)),
            },
            raw: {
                numerator: numerator?.expression ?? "",
                denominator: denominator?.expression ?? "",
                expression: expression,
                filter: filter,
            },
        };
    }

    private formulaText(formula: IndicatorFormula | undefined): string {
        return formula ? formulaToPlainText(formula.resolve(this.lookup), this.tags) : "";
    }
}

function getBase(source: SearchObjectBase | SearchDataElementSource | SearchIndicatorSource) {
    return {
        id: source.id,
        code: source.code,
        name: source.name,
        formName: source.formName,
        description: source.description,
    };
}

function toGroup(group: SearchGroup): SearchGroup {
    return { id: group.id, code: group.code, name: group.name };
}

function getGroupId(group: SearchGroup): Id {
    return group.id;
}

/** Decision 3: by attribute id on data sets, and the first attribute on indicator groups. */
function dataSetServiceValue(dataSet: SearchGroupSource): string {
    const attribute = dataSet.attributeValues.find(
        attributeValue => attributeValue.attributeId === hardcodedIds.healthServiceAttribute
    );

    return attribute?.value ?? "";
}

function findServices(value: string, servicesByKey: Map<string, HealthService>): HealthService[] {
    return HealthService.keysFromAttributeValue(value).flatMap(key => servicesByKey.get(key) ?? []);
}

function uniqueById<T extends { id: Id }>(items: T[]): T[] {
    return Array.from(new Map(items.map(item => [item.id, item])).values());
}

function joinValues(values: string[]): string {
    return values.filter(Boolean).join(", ");
}

function buildLookup(sources: SearchSources, settings: AppSettings): FormulaLookup {
    const toObject = (
        source: NamedRef & { description: string },
        status: FormulaObject["status"]
    ): FormulaObject => ({
        id: source.id,
        name: source.name,
        description: source.description,
        status: status,
    });

    return {
        dataElements: toMap(
            sources.dataElements.map(source =>
                toObject(
                    source,
                    settings.isDataElementBlacklisted(source.groupIds) ? "blacklisted" : "active"
                )
            )
        ),
        programIndicators: toMap(
            sources.programIndicators.map(source =>
                toObject(
                    source,
                    settings.isProgramIndicatorNotInUse(source.groups.map(getGroupId))
                        ? "notInUse"
                        : "active"
                )
            )
        ),
        indicators: toMap(
            sources.indicators.map(source => {
                const groupIds = source.groups.map(getGroupId);
                return {
                    ...toObject(source, getIndicatorStatus(groupIds, settings)),
                    numerator: IndicatorFormula.create({ expression: source.numerator }),
                    denominator: IndicatorFormula.create({ expression: source.denominator }),
                };
            })
        ),
        categoryOptionCombos: toMap(sources.categoryOptionCombos),
    };
}

/** If both apply, not in use wins, as in the formula tags today. */
function getIndicatorStatus(groupIds: Id[], settings: AppSettings): FormulaObject["status"] {
    if (settings.isIndicatorNotInUse(groupIds)) return "notInUse";
    return settings.isIndicatorBlacklisted(groupIds) ? "blacklisted" : "active";
}

function toMap<T extends { id: Id }>(items: T[]): Map<Id, T> {
    return new Map(items.map(item => [item.id, item]));
}
