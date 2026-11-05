import React from "react";
import { Checkbox } from "@dhis2/ui";
import { Program } from "$/domain/entities/Program";
import { Id } from "$/domain/entities/Ref";
import { Progress } from "$/domain/entities/Shared";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { useLayoutPermissions } from "$/webapp/hooks/useLayoutPermissions";
import { useLinkedName } from "$/webapp/hooks/useLinkedName";
import { isSelectionLoading, useSectionLoading } from "$/webapp/hooks/useSectionLoading";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";
import { PrintButton } from "$/webapp/components/print-button/PrintButton";
import { ExportButton } from "$/webapp/components/export-button/ExportButton";
import { ItemSelector } from "$/webapp/components/item-selector/ItemSelector";
import { LoadingBanner } from "$/webapp/components/loading-banner/LoadingBanner";
import { ProgressBar } from "$/webapp/components/progress-bar/ProgressBar";
import { HtmlContent } from "$/webapp/components/html-content/HtmlContent";
import { LayoutSettingsButton } from "$/webapp/components/layout-settings/LayoutSettingsButton";
import { TableOfContents, TocItem } from "$/webapp/components/table-of-contents/TableOfContents";
import { HelpIcon } from "$/webapp/components/help-icon/HelpIcon";
import { downloadExcel } from "$/webapp/utils/excel";
import { ProgramAttributesSection } from "$/webapp/pages/programs/ProgramAttributesSection";
import { ProgramIndicatorsSection } from "$/webapp/pages/programs/ProgramIndicatorsSection";
import { ProgramRulesSection } from "$/webapp/pages/programs/ProgramRulesSection";
import { RelatedIndicatorsSection } from "$/webapp/pages/programs/RelatedIndicatorsSection";
import { ResourcesSection } from "$/webapp/pages/programs/ResourcesSection";
import { RuleVariablesSection } from "$/webapp/pages/programs/RuleVariablesSection";
import { getSectionAnchor, StagesSection } from "$/webapp/pages/programs/StagesSection";
import { buildProgramSheets, getProgramFilename } from "$/webapp/pages/programs/programExport";
import { programHelp as help, programTexts as t } from "$/webapp/pages/programs/programTexts";
import { compareNames } from "$/webapp/utils/compare";

const showLegacyKey = "programs_show_legacy";

export const ProgramsPage: React.FC = React.memo(() => {
    const { compositionRoot, settings, currentUser } = useAppContext();
    const name = useLinkedName("programName");
    const context = React.useMemo(() => ({ user: currentUser, settings }), [currentUser, settings]);

    const [selectedId, setSelectedId] = React.useState<Maybe<Id>>();
    const [showLegacy, setShowLegacy] = React.useState(
        () => sessionStorage.getItem(showLegacyKey) === "true"
    );
    const [progress, setProgress] = React.useState<Maybe<Progress>>();
    const layout = useLayoutPermissions("programs");
    const { canSeeSection, canSeeColumn } = layout;

    const list = useFuture(
        () => compositionRoot.programs.getAll.execute({ name }),
        [compositionRoot, name]
    );
    const programs: Program[] = React.useMemo(
        () => (list?.type === "success" ? list.data : []),
        [list]
    );
    const program = programs.find(program => program.id === selectedId);

    // Pieces, in the order the screen needs them: rules -> stages -> program indicators -> related indicators
    const legacyIds = useFuture(
        () => compositionRoot.programs.getLegacyOptionIds.execute(settings),
        [compositionRoot, settings]
    );
    const legacyOptionIds = legacyIds?.type === "success" ? legacyIds.data : undefined;

    const rules = useFuture(
        () => (program ? compositionRoot.programs.getRules.execute(program) : null),
        [compositionRoot, program]
    );
    const rulesData = rules?.type === "success" ? rules.data : undefined;

    const stages = useFuture(
        () =>
            program && rulesData && legacyOptionIds
                ? compositionRoot.programs.getStages.execute(program, rulesData, settings, {
                      showLegacy,
                      legacyOptionIds,
                  })
                : null,
        [compositionRoot, program, rulesData, legacyOptionIds, showLegacy, settings]
    );
    const stagesData = React.useMemo(
        () =>
            stages?.type === "success"
                ? [...stages.data].sort((a, b) => a.sortOrder - b.sortOrder)
                : undefined,
        [stages]
    );

    const attributes = useFuture(
        () =>
            program && legacyOptionIds
                ? compositionRoot.programs.getAttributes.execute(program, {
                      showLegacy,
                      legacyOptionIds,
                  })
                : null,
        [compositionRoot, program, legacyOptionIds, showLegacy]
    );

    const programIndicators = useFuture(() => {
        if (!program || !stagesData) return null;
        setProgress(undefined);

        return compositionRoot.programs.getIndicators
            .execute(program, context)
            .flatMap(found =>
                compositionRoot.expressions.describeProgramIndicators.execute(
                    found,
                    stagesData,
                    setProgress
                )
            );
    }, [compositionRoot, program, stagesData, context]);
    const programIndicatorsData = React.useMemo(
        () =>
            programIndicators?.type === "success"
                ? [...programIndicators.data].sort((a, b) => compareNames(a.name, b.name))
                : undefined,
        [programIndicators]
    );

    const relatedIndicators = useFuture(() => {
        if (!program || !programIndicatorsData) return null;

        return compositionRoot.programs.getRelatedIndicators
            .execute(program, programIndicatorsData, context)
            .flatMap(found =>
                compositionRoot.expressions.describeIndicators.execute(found, setProgress)
            );
    }, [compositionRoot, program, programIndicatorsData, context]);
    const relatedData = React.useMemo(
        () =>
            relatedIndicators?.type === "success"
                ? [...relatedIndicators.data].sort((a, b) => compareNames(a.name, b.name))
                : undefined,
        [relatedIndicators]
    );

    const ruleVariables = useFuture(
        () =>
            program && rulesData
                ? compositionRoot.programs.getRuleVariables.execute(program, rulesData)
                : null,
        [compositionRoot, program, rulesData]
    );
    const resources = useFuture(
        () => (program ? compositionRoot.programs.getResources.execute(program) : null),
        [compositionRoot, program]
    );

    const pieces = [
        rules,
        stages,
        attributes,
        programIndicators,
        relatedIndicators,
        ruleVariables,
        resources,
    ];
    const isLoading =
        useSectionLoading([list, layout.loader, legacyIds, ...pieces]) ||
        isSelectionLoading(Boolean(program), pieces);

    const attributesData = attributes?.type === "success" ? attributes.data : [];
    const ruleVariablesData = ruleVariables?.type === "success" ? ruleVariables.data : [];
    const resourcesData = resources?.type === "success" ? resources.data : [];

    const toggleLegacy = (checked: boolean) => {
        sessionStorage.setItem(showLegacyKey, String(checked));
        setShowLegacy(checked);
    };

    const exportToExcel = () => {
        if (!program) return;

        const sheets = buildProgramSheets(
            {
                stages: stagesData ?? [],
                attributes: attributesData,
                programIndicators: programIndicatorsData ?? [],
                indicators: relatedData ?? [],
                rules: rulesData ?? [],
                ruleVariables: ruleVariablesData,
            },
            { canSeeSection, canSeeColumn }
        );

        downloadExcel(getProgramFilename(program.name), sheets);
    };

    const showDescription = Boolean(program?.description) && canSeeSection("programDescription");
    const toc = getToc({
        showDescription,
        hasAttributes: canSeeSection("trackedEntityAttributes") && attributesData.length > 0,
        stages: canSeeSection("programStages") ? (stagesData ?? []) : [],
        hasProgramIndicators:
            canSeeSection("programIndicators") && (programIndicatorsData?.length ?? 0) > 0,
        hasIndicators: canSeeSection("indicators") && (relatedData?.length ?? 0) > 0,
        hasRules: canSeeSection("programRules") && (rulesData?.length ?? 0) > 0,
        hasVariables: canSeeSection("programRuleVariables") && ruleVariablesData.length > 0,
        hasResources: resourcesData.length > 0,
    });

    return (
        <>
            <div id="headerDossierPanel">
                <PageHeader
                    title={t.dos_Programs()}
                    actions={
                        <>
                            <LayoutSettingsButton view="programs" layout={layout.loader} />
                            <PrintButton disabled={isLoading || !program} />
                        </>
                    }
                />

                <ItemSelector
                    label={i18n.t("Select a program")}
                    items={programs}
                    selectedId={selectedId}
                    onChange={setSelectedId}
                    counterText={`${t.dos_NumberOfPrograms()}: ${programs.length}`}
                    loading={list?.type === "loading"}
                >
                    <Checkbox
                        dense
                        label={t.dos_showLegacy()}
                        checked={showLegacy}
                        onChange={({ checked }) => toggleLegacy(checked)}
                        dataTest="show-legacy"
                    />
                </ItemSelector>

                <LoadingBanner visible={isLoading} />
                <ProgressBar progress={progress} label={i18n.t("Describing expressions")} />
            </div>

            {program && (
                <>
                    <div id="DossierTitleContainer">
                        <h1>{program.name}</h1>
                    </div>
                    <ExportButton
                        label={t.dos_exportToExcel()}
                        onClick={exportToExcel}
                        disabled={isLoading}
                    />
                    <TableOfContents items={toc} />

                    {showDescription && (
                        <div id="DossierTextTitleContainer">
                            <h2>
                                {t.dos_DescriptionOfProgram()}
                                <HelpIcon
                                    text={`${help.program_description_help()} ${help.programs_description_description()}`}
                                />
                            </h2>
                            <HtmlContent html={program.description} />
                        </div>
                    )}

                    <ProgramAttributesSection
                        attributes={attributesData}
                        canSeeSection={canSeeSection("trackedEntityAttributes")}
                        canSeeColumn={column => canSeeColumn("trackedEntityAttributes", column)}
                    />
                    <StagesSection
                        stages={stagesData ?? []}
                        canSeeSection={canSeeSection("programStages")}
                        canSeeColumn={column => canSeeColumn("programStages", column)}
                    />
                    <ProgramIndicatorsSection
                        programIndicators={programIndicatorsData ?? []}
                        stages={stagesData ?? []}
                        canSeeSection={canSeeSection("programIndicators")}
                        canSeeColumn={column => canSeeColumn("programIndicators", column)}
                    />
                    <RelatedIndicatorsSection
                        indicators={relatedData ?? []}
                        stages={stagesData ?? []}
                        programIndicators={programIndicatorsData ?? []}
                        canSeeSection={canSeeSection("indicators")}
                        canSeeColumn={column => canSeeColumn("indicators", column)}
                    />
                    <ProgramRulesSection
                        rules={rulesData ?? []}
                        canSeeSection={canSeeSection("programRules")}
                        canSeeColumn={column => canSeeColumn("programRules", column)}
                    />
                    <RuleVariablesSection
                        variables={ruleVariablesData}
                        canSeeSection={canSeeSection("programRuleVariables")}
                        canSeeColumn={column => canSeeColumn("programRuleVariables", column)}
                    />
                    <ResourcesSection resources={resourcesData} />
                </>
            )}
        </>
    );
});

type TocOptions = {
    showDescription: boolean;
    hasAttributes: boolean;
    stages: {
        id: string;
        name: string;
        repeatable: boolean;
        hasRealSections: boolean;
        sections: { id: string; name: string }[];
    }[];
    hasProgramIndicators: boolean;
    hasIndicators: boolean;
    hasRules: boolean;
    hasVariables: boolean;
    hasResources: boolean;
};

/** Description, attributes, stages (with their sections), program indicators, indicators, rules, variables, resources. */
function getToc(options: TocOptions): TocItem[] {
    return [
        ...(options.showDescription
            ? [{ id: "DossierTextTitleContainer", label: t.dos_DescriptionOfProgram() }]
            : []),
        ...(options.hasAttributes
            ? [{ id: "trackedEntityAttributes", label: t.dos_TrackedEntityAttributes() }]
            : []),
        ...options.stages.map(stage => ({
            id: stage.id,
            label: `${i18n.t("Stage")}: ${stage.name}${stage.repeatable ? ` (${i18n.t("Repeatable")})` : ""}`,
            children: stage.hasRealSections
                ? stage.sections.map(section => ({
                      id: getSectionAnchor(section.id),
                      label: section.name,
                  }))
                : undefined,
        })),
        ...(options.hasProgramIndicators
            ? [{ id: "programIndicators", label: t.dos_ProgramIndicators() }]
            : []),
        ...(options.hasIndicators ? [{ id: "indicators", label: t.dos_Indicators() }] : []),
        ...(options.hasRules ? [{ id: "rules", label: t.dos_ProgramRules() }] : []),
        ...(options.hasVariables
            ? [{ id: "ruleVariables", label: t.dos_ProgramRuleVariables() }]
            : []),
        ...(options.hasResources ? [{ id: "resources", label: i18n.t("Program Resources") }] : []),
    ];
}
