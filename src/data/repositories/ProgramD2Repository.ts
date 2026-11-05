import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import {
    Program,
    ProgramAttribute,
    ProgramResource,
    ProgramResourceType,
} from "$/domain/entities/Program";
import { ProgramExpression } from "$/domain/entities/ProgramExpression";
import { PeriodBoundary, ProgramIndicator } from "$/domain/entities/ProgramIndicator";
import { ProgramRule, ProgramRuleVariable } from "$/domain/entities/ProgramRule";
import { ProgramStage, StageDataElement } from "$/domain/entities/ProgramStage";
import { Id } from "$/domain/entities/Ref";
import { ProgramRepository } from "$/domain/repositories/ProgramRepository";
import { D2Api } from "$/types/d2-api";
import { D2OptionSet, text, toOptionSet, toRawNamedRef } from "./d2-mappers";

const resourcesAttributeCode = "HMIS-Dict_Resources";

const resourceTypes: ProgramResourceType[] = [
    "dashboards",
    "visualizations",
    "eventCharts",
    "eventReports",
];

const programFields = {
    id: true,
    displayName: true,
    displayDescription: true,
    programStages: { id: true },
    attributeValues: { value: true, attribute: { code: true } },
} as const;

type D2Program = {
    id: string;
    displayName: string;
    displayDescription?: string;
    programStages: { id: string }[];
    attributeValues: { value: string; attribute: { code?: string } }[];
};

export type D2StageDataElement = {
    id: string;
    displayName: string;
    displayFormName?: string;
    displayDescription?: string;
    valueType: string;
    dataElementGroups: { id: string }[];
    optionSet?: D2OptionSet;
};

export type D2Stage = {
    id: string;
    displayName: string;
    displayDescription?: string;
    repeatable: boolean;
    sortOrder: number;
    programStageSections: {
        id: string;
        displayName: string;
        dataElements: D2StageDataElement[];
    }[];
    programStageDataElements: { compulsory: boolean; dataElement: D2StageDataElement }[];
};

const dataElementQuery = [
    "id",
    "displayName",
    "displayFormName",
    "displayDescription",
    "valueType",
    "dataElementGroups[id]",
    "optionSet[displayName,options[id,code,displayName]]",
].join(",");

const stageQuery = [
    "id",
    "displayName",
    "displayDescription",
    "repeatable",
    "sortOrder",
    `programStageSections[id,displayName,dataElements[${dataElementQuery}]]`,
    `programStageDataElements[compulsory,dataElement[${dataElementQuery}]]`,
].join(",");

const namedQuery = "[id,name]";

const ruleQuery = [
    "name",
    "description",
    "condition",
    `programStage${namedQuery}`,
    "programRuleActions[" +
        [
            "programRuleActionType",
            `dataElement${namedQuery}`,
            `trackedEntityAttribute${namedQuery}`,
            `option${namedQuery}`,
            `optionGroup${namedQuery}`,
            `programStage${namedQuery}`,
            `programStageSection${namedQuery}`,
            "templateUid",
            "content",
            "data",
        ].join(",") +
        "]",
].join(",");

type D2Ref = { id: string; name: string };

type D2Rule = {
    name: string;
    description?: string;
    condition: string;
    programStage?: D2Ref;
    programRuleActions: {
        programRuleActionType: string;
        dataElement?: D2Ref;
        trackedEntityAttribute?: D2Ref;
        option?: D2Ref;
        optionGroup?: D2Ref;
        programStage?: D2Ref;
        programStageSection?: D2Ref;
        templateUid?: string;
        content?: string;
        data?: string;
    }[];
};

type D2Resource = { id: string; displayName: string; displayDescription?: string; type?: string };

type D2Resources = Partial<Record<ProgramResourceType | "eventVisualizations", D2Resource[]>>;

export class ProgramD2Repository implements ProgramRepository {
    constructor(private api: D2Api) {}

    getAll(): FutureData<Program[]> {
        return apiToFuture(
            this.api.models.programs.get({ fields: programFields, paging: false })
        ).map(({ objects }) => objects.map(toProgram));
    }

    getByName(name: string): FutureData<Program[]> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: programFields,
                filter: { displayName: { eq: name } },
                paging: false,
            })
        ).map(({ objects }) => objects.map(toProgram));
    }

    getStages(ids: Id[]): FutureData<ProgramStage[]> {
        return Future.parallel(
            ids.map(id =>
                apiToFuture(
                    this.api.get<D2Stage>(`/programStages/${id}`, {
                        fields: stageQuery,
                        paging: false,
                    })
                ).map(toProgramStage)
            ),
            { concurrency: 5 }
        );
    }

    getAttributes(programId: Id): FutureData<ProgramAttribute[]> {
        return apiToFuture(
            this.api.get<{
                programTrackedEntityAttributes: {
                    mandatory: boolean;
                    trackedEntityAttribute: {
                        id: string;
                        displayName: string;
                        displayFormName?: string;
                        displayDescription?: string;
                        valueType: string;
                        aggregationType?: string;
                        optionSet?: D2OptionSet;
                    };
                }[];
            }>(`/programs/${programId}`, {
                fields:
                    "programTrackedEntityAttributes[mandatory,trackedEntityAttribute[id,displayName," +
                    "displayFormName,displayDescription,optionSet[displayName,options[id,displayName]]," +
                    "valueType,aggregationType]]",
                paging: false,
            })
        ).map(({ programTrackedEntityAttributes }) =>
            programTrackedEntityAttributes.map(({ mandatory, trackedEntityAttribute: tea }) => ({
                id: tea.id,
                name: tea.displayName,
                formName: text(tea.displayFormName),
                description: text(tea.displayDescription),
                valueType: tea.valueType,
                aggregationType: text(tea.aggregationType),
                optionSet: toOptionSet(tea.optionSet),
                mandatory: mandatory,
                visibility: [], // Always empty for now: bug P10, kept
            }))
        );
    }

    getIndicators(programId: Id): FutureData<ProgramIndicator[]> {
        return apiToFuture(
            this.api.get<{
                programIndicators: {
                    id: string;
                    displayName: string;
                    displayFormName?: string;
                    displayDescription?: string;
                    filter?: string;
                    expression?: string;
                    aggregationType?: string;
                    analyticsType?: string;
                    analyticsPeriodBoundaries: {
                        boundaryTarget?: string;
                        analyticsPeriodBoundaryType?: string;
                        offsetPeriods?: number;
                        offsetPeriodType?: string;
                    }[];
                    programIndicatorGroups: { id: string }[];
                }[];
            }>(`/programs/${programId}`, {
                fields:
                    "programIndicators[id,displayName,displayFormName,displayDescription,filter," +
                    "expression,aggregationType,analyticsType,analyticsPeriodBoundaries[boundaryTarget," +
                    "analyticsPeriodBoundaryType,offsetPeriods,offsetPeriodType],programIndicatorGroups[id]]",
                paging: false,
            })
        ).map(({ programIndicators }) =>
            programIndicators.map(programIndicator =>
                ProgramIndicator.create({
                    id: programIndicator.id,
                    name: programIndicator.displayName,
                    formName: text(programIndicator.displayFormName),
                    description: text(programIndicator.displayDescription),
                    expression: ProgramExpression.create({
                        expression: text(programIndicator.expression),
                    }),
                    filter: ProgramExpression.create({
                        expression: text(programIndicator.filter),
                    }),
                    expressionText: "",
                    filterText: "",
                    aggregationType: text(programIndicator.aggregationType),
                    analyticsType: text(programIndicator.analyticsType),
                    boundaries: programIndicator.analyticsPeriodBoundaries.map(boundary =>
                        PeriodBoundary.create({
                            target: text(boundary.boundaryTarget),
                            type: text(boundary.analyticsPeriodBoundaryType),
                            offsetPeriods: boundary.offsetPeriods ?? 0,
                            offsetPeriodType: text(boundary.offsetPeriodType),
                        })
                    ),
                    groupIds: programIndicator.programIndicatorGroups.map(group => group.id),
                })
            )
        );
    }

    getRules(programId: Id): FutureData<ProgramRule[]> {
        return apiToFuture(
            this.api.get<{ programRules: D2Rule[] }>("/programRules", {
                filter: `program.id:eq:${programId}`,
                fields: ruleQuery,
                paging: false,
            })
        ).flatMap(({ programRules }) => {
            const templateIds = programRules.flatMap(rule =>
                rule.programRuleActions.flatMap(action => action.templateUid ?? [])
            );

            return this.getTemplateNames(templateIds).map(templateNames =>
                programRules.map(rule => toProgramRule(rule, templateNames))
            );
        });
    }

    getRuleVariables(programId: Id): FutureData<ProgramRuleVariable[]> {
        return apiToFuture(
            this.api.get<{
                programRuleVariables: {
                    name: string;
                    programRuleVariableSourceType: string;
                    programStage?: D2Ref;
                    dataElement?: D2Ref;
                    trackedEntityAttribute?: D2Ref;
                }[];
            }>("/programRuleVariables", {
                filter: `program.id:eq:${programId}`,
                fields: `name,programRuleVariableSourceType,programStage${namedQuery},dataElement${namedQuery},trackedEntityAttribute${namedQuery}`,
                paging: false,
            })
        ).map(({ programRuleVariables }) =>
            programRuleVariables.map(variable =>
                ProgramRuleVariable.create({
                    name: variable.name,
                    sourceType: variable.programRuleVariableSourceType,
                    stage: toRawNamedRef(variable.programStage),
                    dataElement: toRawNamedRef(variable.dataElement),
                    attribute: toRawNamedRef(variable.trackedEntityAttribute),
                    associatedRuleNames: [],
                })
            )
        );
    }

    /** Only reads these types, so v42's eventVisualizations are lost: bug P3, kept. */
    getResources(ids: Id[]): FutureData<ProgramResource[]> {
        return apiToFuture(
            this.api.get<D2Resources>("/metadata", {
                filter: `id:in:[${ids.join(",")}]`,
                fields: "id,displayName,displayDescription,type",
            })
        ).map(metadata => [
            ...resourceTypes.flatMap(type =>
                (metadata[type] ?? []).map(resource => toResource(resource, type))
            ),
            // Recent versions of DHIS2 return event charts and reports all together under this name
            ...(metadata.eventVisualizations ?? []).map(resource =>
                toResource(resource, getEventVisualizationType(resource))
            ),
        ]);
    }

    getEventResources(programId: Id): FutureData<ProgramResource[]> {
        const eventTypes: ("eventCharts" | "eventReports")[] = ["eventCharts", "eventReports"];

        return Future.parallel(
            eventTypes.map(type =>
                apiToFuture(
                    this.api.get<Partial<Record<typeof type, D2Resource[]>>>(`/${type}`, {
                        filter: `program.id:eq:${programId}`,
                        fields: "id,displayName,displayDescription",
                        paging: false,
                    })
                ).map(response =>
                    (response[type] ?? []).map(resource => toResource(resource, type))
                )
            ),
            { concurrency: eventTypes.length }
        ).map(resources => resources.flat());
    }

    getOptionIdsOfGroups(ids: Id[]): FutureData<Set<Id>> {
        if (ids.length === 0) return Future.success(new Set());

        return apiToFuture(
            this.api.get<{ optionGroups: { options?: { id: string }[] }[] }>("/optionGroups", {
                filter: `id:in:[${ids.join(",")}]`,
                fields: "options[id]",
                paging: false,
            })
        ).map(({ optionGroups }) => {
            const optionIds = optionGroups.flatMap(group =>
                (group.options ?? []).map(option => option.id)
            );

            return new Set(optionIds);
        });
    }

    private getTemplateNames(ids: Id[]): FutureData<Map<Id, string>> {
        if (ids.length === 0) return Future.success(new Map());

        return apiToFuture(
            this.api.get<{ programNotificationTemplates: D2Ref[] }>(
                "/programNotificationTemplates",
                {
                    filter: `id:in:[${ids.join(",")}]`,
                    fields: "id,name",
                    paging: false,
                }
            )
        ).map(
            ({ programNotificationTemplates }) =>
                new Map(programNotificationTemplates.map(template => [template.id, template.name]))
        );
    }
}

function toProgram(program: D2Program): Program {
    const resources = program.attributeValues.find(
        attributeValue => attributeValue.attribute.code === resourcesAttributeCode
    );

    return {
        id: program.id,
        name: program.displayName,
        description: text(program.displayDescription),
        stageIds: program.programStages.map(stage => stage.id),
        resourceIds: (resources?.value ?? "")
            .split(";")
            .map(id => id.trim())
            .filter(Boolean),
    };
}

export function toProgramStage(stage: D2Stage): ProgramStage {
    const toElement = (element: D2StageDataElement): StageDataElement => ({
        id: element.id,
        name: element.displayName,
        formName: text(element.displayFormName),
        description: text(element.displayDescription),
        valueType: element.valueType,
        optionSet: toOptionSet(element.optionSet),
        groupIds: element.dataElementGroups.map(group => group.id),
        compulsory:
            stage.programStageDataElements.find(
                stageElement => stageElement.dataElement.id === element.id
            )?.compulsory ?? false,
        visibility: [],
        calculation: { type: "default" },
    });

    const hasRealSections = stage.programStageSections.length > 0;

    return ProgramStage.create({
        id: stage.id,
        name: stage.displayName,
        description: text(stage.displayDescription),
        repeatable: stage.repeatable,
        sortOrder: stage.sortOrder,
        hasRealSections: hasRealSections,
        sections: hasRealSections
            ? stage.programStageSections.map(section => ({
                  id: section.id,
                  name: section.displayName,
                  dataElements: section.dataElements.map(toElement),
              }))
            : [
                  {
                      id: "DataElements",
                      name: "Data Elements",
                      dataElements: stage.programStageDataElements.map(({ dataElement }) =>
                          toElement(dataElement)
                      ),
                  },
              ],
        dataElementIds: stage.programStageDataElements.map(({ dataElement }) => dataElement.id),
    });
}

function toProgramRule(rule: D2Rule, templateNames: Map<Id, string>): ProgramRule {
    return ProgramRule.create({
        name: rule.name,
        description: text(rule.description),
        condition: rule.condition,
        stage: toRawNamedRef(rule.programStage),
        actions: rule.programRuleActions.map(action => ({
            type: action.programRuleActionType,
            dataElement: toRawNamedRef(action.dataElement),
            attribute: toRawNamedRef(action.trackedEntityAttribute),
            option: toRawNamedRef(action.option),
            optionGroup: toRawNamedRef(action.optionGroup),
            stage: toRawNamedRef(action.programStage),
            section: toRawNamedRef(action.programStageSection),
            templateId: action.templateUid,
            templateName: action.templateUid ? (templateNames.get(action.templateUid) ?? "") : "",
            content: text(action.content),
            data: text(action.data),
        })),
    });
}

function toResource(resource: D2Resource, type: ProgramResourceType): ProgramResource {
    return {
        id: resource.id,
        name: resource.displayName,
        description: text(resource.displayDescription),
        type: type,
    };
}

function getEventVisualizationType(resource: D2Resource): ProgramResourceType {
    return resource.type === "PIVOT_TABLE" || resource.type === "LINE_LIST"
        ? "eventReports"
        : "eventCharts";
}
