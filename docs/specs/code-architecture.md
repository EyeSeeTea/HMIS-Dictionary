# Code architecture

Status: completed. Domain, data and presentation are written, and the e2e suite passes on v40 and v42.

Source: the Angular app (`e2e/baseline` worktree, `app/**`), with file references where the rule is not obvious.

## Progress

Counted as ticked items out of the total (34 of 34).

**Domain**

- [x] Shared types, `User`, `AppSettings`, `DossierConfigStatus`
- [x] `LayoutSettings` and its defaults
- [x] Formulas: `IndicatorFormula`, `ProgramExpression`, `ExpressionDescription`
- [x] Shared metadata: `Indicator`, `ProgramIndicator`, `IndicatorVisualization`
- [x] Health services and dossiers
- [x] Search: `SearchCatalog`, `SearchFilter`
- [x] Data sets
- [x] Indicators: `FormulaBreakdown`
- [x] Programs: `ProgramStage`, `ProgramRule`
- [x] Repository interfaces
- [x] Use cases
- [x] Unit tests

**Data**

- [x] `UserD2Repository`
- [x] `d2-api` v40 and v42 aliases, in one place
- [x] Settings: `AppSettings`, `LayoutSettings`, `UserGroup`, `Attribute`, `Session`
- [x] `Expression`, `Formula`, `Visualization`
- [x] `HealthService`, `HealthServiceText`, `Dossier`
- [x] `Search`
- [x] `DataSet`, `Indicator`
- [x] `Program`
- [x] Wire all use cases in `CompositionRoot`

**Presentation**

- [x] Decide the table component
- [x] App shell: navigation, translations, session check, loading indicator, print
- [x] Layout settings
- [x] `search`, with its Excel export and formula modal
- [x] `dossiers`: reader and editor
- [x] `datasets`
- [x] `dossierIndicators`
- [x] `dossierPrograms`, with its Excel export
- [x] `admin`

**E2E**

- [x] Adapt `e2e/support/widgets.ts`
- [x] Suite matches the baseline on v42
- [x] Suite matches the baseline on v40
- [x] Fix the problems found (P1-P12, decision 6). The "Known bugs" of `e2e.md` are left for a follow-up PR

## Conventions

```
class X { attr: T; opt?: T }    Struct<Attrs>() class, immutable, in src/domain/entities/X.ts
  method(args): T               pure, returns a new instance if it "changes" anything
  static build(args): X         named constructor, when the attributes are derived
type X = { ... } | "a" | "b"    plain type, for values without behaviour
```

- **Classes vs types:** a `Struct` class only when there is behaviour to attach. Otherwise a plain type, as in `Ref.ts`.
- **Types:** an attribute without a type is a string, unless it is an id, which is `Id`. Everything else has its type written.
- **Names:** `name`, `formName`, `shortName` and `description` mean the translated values, and the data layer maps `displayName` and friends. Exceptions in decision 5.
- **Empty text:** text attributes are required and `""` when empty, set by the data layer (`d2.displayDescription ?? ""`). The Excel writer skips `""` to leave the cell empty.
- **Optional:** `opt?: T` is `Maybe<T>`, only when absence means something (not configured, no option set, all stages...).
- **Always present:** DHIS2 falls back to the name for `displayFormName` and `displayShortName`. Checked on v42 for data elements and indicators; to confirm for other types in the data layer.
- **Health service:** a line of care, an org unit group in the configured group set. Stored names and DOM keys keep "service" (`serviceCode`, `service_name`, `servicesBasics`, `setup_organisationUnitGroupSet`).
- **Not in the domain:** rendering: HTML, translating text, the table of contents, showing progress, Excel writing. Also DHIS2 URLs and payloads. Use cases may report progress, and stored values like `translationKey` are data.

## Shared

```
type Id = string; type Ref = { id }; type NamedRef = Ref & { name }          // already in Ref.ts
type Option = { id; code; name }
class OptionSet { name; options: Option[] }
  withoutOptions(optionIds: Set<Id>): OptionSet                              // hides legacy options
type Locale = "en" | "es" | "fr" | "pt" | "ar"
type Progress = { current: number; total: number }
type AttributeValue = { attributeId; value }
```

## User and settings

```
class User { id; name; username; userGroups: NamedRef[] }                    // replaces today's User
  belongsToAnyGroup(ids): boolean
  belongsToGroupNamed(name): boolean

class AppSettings {                                                          // dataStore HMIS_Dictionary/*
  adminGroup?: NamedRef                                                      // setup_userGroup { value: name, object: { id, name } }
  healthServiceGroupSet?: NamedRef                                           // setup_organisationUnitGroupSet { value: id, object: { id, name } }
  dossierConfigComplete: boolean                                             // setup_dossierConfigComplete
  blacklist: { dataElementGroupIds: Id[]; dataSetIds: Id[]; indicatorGroupIds: Id[]; tag }   // tag defaults to "Blacklisted"
  notInUse: { indicatorGroupIds: Id[]; programIndicatorGroupIds: Id[]; tag } // tag defaults to "Not in Use"
  legacy: { dataElementGroupIds: Id[]; optionGroupIds: Id[] }
  metadataIds: MetadataIds                                                   // metadata_<key> { value: id }, defaults to the MSF uids
}
type MetadataIds = { advancedUserGroup; allUsersGroup; healthServiceAttribute; icd10Attribute; constantZero; constantOne; programResourcesAttribute }
  isAdmin(user): boolean                     // user in a group NAMED adminGroup.name, see decision 1
  canManage(user): boolean                   // isAdmin, or adminGroup not configured. Admin tab, editor Save, reader Edit
  showsDossiersTab(): boolean                // healthServiceGroupSet configured
  showsHealthServiceColumns(): boolean       // dossierConfigComplete; only Search, its columns and health services
  isDataElementBlacklisted(groupIds): boolean
  isIndicatorBlacklisted(groupIds): boolean
  isIndicatorNotInUse(groupIds): boolean
  isProgramIndicatorNotInUse(groupIds): boolean
  isIndicatorVisible(groupIds, user): boolean          // !blacklisted && (isAdmin || !notInUse)
  isProgramIndicatorVisible(groupIds, user): boolean   // isAdmin || !notInUse
  isDataElementVisibleInProgram(groupIds, showLegacy): boolean   // !blacklisted && (showLegacy || !legacy)

type AccessContext = { user: User; settings: AppSettings }                   // loaded once at startup

type Attribute = NamedRef & { dataSetAttribute: boolean; indicatorGroupAttribute: boolean; dataElementAttribute: boolean; programAttribute: boolean }
class DossierConfigStatus { adminGroup: boolean; healthServiceGroupSet: boolean; healthServiceCodes: boolean; healthServiceAttribute: boolean }
  isComplete(): boolean
  static build(settings, healthServices, attributes): DossierConfigStatus
  // healthServiceCodes: at least one health service, all with a code
  // healthServiceAttribute: the one in metadataIds (the one Search reads), dataSetAttribute && indicatorGroupAttribute
```

## Layout settings

Who sees which sections and columns, per screen. Stored in `layoutSettings_<view>`.

```
type LayoutView = "search" | "datasets" | "indicators" | "programs"
type Access = "admin" | "advanced" | "everyone"                              // stored as 0, 1, 2
type LayoutColumn = { key; index: number; translationKey; access: Access }
type LayoutSection = LayoutColumn & { columns: LayoutColumn[] }

class LayoutSettings { view: LayoutView; advancedUserGroupIds: Id[]; sections: LayoutSection[] }
  static defaults(view): LayoutSettings      // advanced group LjRqO9XzQPs, sections listed below
  mergedOverDefaults(): LayoutSettings       // all views, see decision 2
  isAdvancedUser(user): boolean
  getPermissions(context: AccessContext): LayoutPermissions
  update(sections, advancedUserGroupIds): LayoutSettings

class LayoutPermissions { allowed: Set<string> }                             // "section", "section.column"
  canSeeSection(section): boolean
  canSeeColumn(section, column): boolean

// Access granted when: isAdmin || access == "everyone" || (isAdvanced && access == "advanced")
// search:     objectsBasics, objectsDescriptions, groupsBasics, servicesBasics
// datasets:   sections, categoryCombinations, indicators
// indicators: formula, numerator, denominator
// programs:   programDescription, trackedEntityAttributes, programStages, programIndicators,
//             indicators, programRules, programRuleVariables
```

## Formulas

The app parses formulas in five places with different regexes. All of them move here.

Careful: `#{a.b}` means data element + category option combo in an indicator, but program stage + data element in a program indicator. That is why there are two classes.

```
type FormulaToken =
  | { type: "dataElement"; dataElementId; categoryOptionComboId? }           // #{de} #{de.coc}
  | { type: "programDataElement"; programId; dataElementId }                 // D{program.de}
  | { type: "programAttribute"; programId; attributeId }                     // A{program.tea}
  | { type: "programIndicator"; id }                                         // I{id}
  | { type: "indicator"; id }                                                // N{id}
  | { type: "orgUnitGroup"; id }                                             // G{id}
  | { type: "constant"; id }                                                 // C{id}
  | { type: "number"; value }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }

class IndicatorFormula { expression: string }                                // numerator or denominator
  tokens(): FormulaToken[]
  dataElementIds(): Id[]
  hasNestedIndicators(): boolean
  referencesAnyDataElement(ids): boolean                                     // datasets screen; only #{de.coc}, see decision 6
  referencesProgram(programId, programIndicatorIds): boolean                 // programs screen
  visualizationItemIds(): Id[]                                               // ids in #{}, I{}, N{}
  resolve(lookup: FormulaLookup, options?): FormulaNode[]
  // walks the raw string and only replaces #{}, I{} and N{} with known ids; everything else stays as raw text
  // + - * between a reference and the next #, I or N become operator nodes; other operators stay as raw text
  // (parentheses, spaces, unknown ids, D{}, A{}, G{}, C{})

class ProgramExpression { expression: string }                               // expression or filter, "" when absent
  isEmpty(): boolean                                                         // nothing to translate through the API
  stageIds(): Id[]                                                           // V{program_stage_id}, #{stage.de}, PS_EVENTDATE
  stageNames(): string[]                                                     // V{program_stage_name}
  withOptionNames(stages): ProgramExpression                                 // #{stage.de} == 'code' -> 'option name'
  // only one-character codes, on purpose: bug P11 is kept, do not write the "correct" regex yet

type FormulaLookup = {                                                       // includes hidden objects, flagged
  dataElements: Map<Id, FormulaObject>; programIndicators: Map<Id, FormulaObject>
  indicators: Map<Id, FormulaIndicator>; categoryOptionCombos: Map<Id, NamedRef>
}
type FormulaObject = NamedRef & { description; status: "active" | "blacklisted" | "notInUse" }
type FormulaIndicator = FormulaObject & { numerator: IndicatorFormula; denominator: IndicatorFormula }
type FormulaOptions = { expandIndicators: boolean; maxDepth: number; visited: Set<Id> }   // maxDepth 3 in the modal
type FormulaNode =
  | { type: "text"; value }
  | { type: "operator"; value }                                              // rendered on a new line
  | { type: "object"; object: FormulaObject; tag?: "programIndicator" | "indicator"; categoryOptionCombo?: string }
  | { type: "expanded"; legend: FormulaLegendItem; numerator: FormulaNode[]; denominator: FormulaNode[] }
  | { type: "cycle"; name }
type FormulaLegendItem = { id; name; description; depth: number; order: number }
  // presentation renders the nodes; formulaToPlainText(nodes, tags) gives the row and Excel text: tags included, no tooltips
  // getFormulaLegend(nodes) gives the expanded indicators, for the modal

class ExpressionDescription { result: { ok: true; text } | { ok: false; message; description } }   // from the DHIS2 API
  toDisplayText(kind, expression): string          // unescapes "\.", or "message: description Expression: x"
  // filter texts with "Program stage id" stay as returned (P11)
```

## Metadata shared by screens

```
class Indicator {
  id; name; shortName; formName; description; type: string
  numerator: IndicatorFormula; denominator: IndicatorFormula
  numeratorDescription; denominatorDescription
  numeratorText; denominatorText                     // readable formulas from the API, "" until described
  groupIds: Id[]
}
  withTexts(numeratorText, denominatorText): Indicator
  referencesAnyDataElement(ids): boolean
  referencesProgram(programId, programIndicatorIds): boolean
  stageNames(stages, programIndicators): string[]    // through D{} and I{}

class ProgramIndicator {
  id; name; formName; description
  expression: ProgramExpression; filter: ProgramExpression
  expressionText; filterText                         // readable from the API, "" until described
  aggregationType; analyticsType; boundaries: PeriodBoundary[]; groupIds: Id[]
}
  stageNames(stages): string[]
  withTexts(expressionText, filterText): ProgramIndicator
class PeriodBoundary { target; type; offsetPeriods: number; offsetPeriodType }
  targetLabel(stages): string                // "PS_EVENTDATE - stage name", or "CUSTOM" when empty

class IndicatorVisualization { name; itemIds: Id[]; sharedWithAllUsers: boolean }
  static build(indicator | programIndicator, allUsersGroupExists): IndicatorVisualization
  // name "<name> - <id>"; items: indicator: formula ids + own id; program indicator: own id only
  // ALL USERS group is epFY01iJN0Z
```

## Health services and dossiers (`dossiers`)

```
class HealthService { id; code; name }                                       // org unit group, code "" when missing
  key(): string                              // code.split("_")[2], "" when there is none
  matchesAttributeValue(value): boolean      // regex "_<key>(_|$)", false when key is ""
  static keysFromAttributeValue(value): string[]   // value.split("_").slice(1), used by search

type DossierElement = NamedRef & { formName; description }
type DossierSection = NamedRef & { dataElements: DossierElement[] }
type DossierCandidate = NamedRef & { attributeValues: AttributeValue[] }             // light data set or indicator group, to filter by service
type DossierDataSet = NamedRef & { sections: DossierSection[] }
type DossierIndicatorGroup = NamedRef & { indicators: DossierElement[] }

class HealthServiceTranslations { healthServiceId; translations: Translation[] }   // the dossier text, rich HTML
  withDescription(locale: Locale, html): HealthServiceTranslations   // empty text removes it; other translations kept
type Translation = { property; locale; value }                               // locale is a string: other languages are kept on save
```

## Search (`search`)

```
type SearchObject = SearchObjectBase & (
  | { type: "dataElement"; shortName; icd10; healthServices: HealthService[] }
  | { type: "indicator"; shortName; numerator: IndicatorFormula; denominator: IndicatorFormula; healthServices: HealthService[] }
  | { type: "programIndicator"; expression: ProgramExpression; filter: ProgramExpression }
)
type SearchObjectBase = {
  id; code; name; formName; description
  groups: (NamedRef & { code })[]            // data sets (data element), indicator or program indicator groups
}

class SearchCatalog { objects: SearchObject[]; lookup: FormulaLookup }
  static build(sources: SearchSources, healthServices, context): SearchCatalog
  rows(): SearchRow[]
  // applies blacklist and not-in-use rules, resolves groups and health services; lookup keeps hidden objects, flagged

type SearchSources = {
  dataElements: SearchDataElementSource[]; categoryOptionCombos: NamedRef[]
  programIndicators: SearchProgramIndicatorSource[]; indicators: SearchIndicatorSource[]
}
type SearchGroupSource = NamedRef & { code; attributeValues: AttributeValue[] }
type SearchDataElementSource = NamedRef & {
  code; shortName; formName; description; icd10; groupIds: Id[]; dataSets: SearchGroupSource[]
}
type SearchIndicatorSource = NamedRef & {
  code; shortName; formName; description; numerator; denominator; groups: SearchGroupSource[]
}
type SearchProgramIndicatorSource = NamedRef & {
  code; formName; description; expression; filter; groups: (NamedRef & { code })[]
}

type SearchColumn =                                // also the translation keys and the layout permissions
  | "object_type" | "object_id" | "object_code" | "object_ICD10" | "object_name" | "object_shortName" | "object_form"
  | "object_description" | "object_num_formula" | "object_den_formula" | "object_flt_formula" | "object_exp_formula"
  | "objectGroup_id" | "objectGroup_code" | "objectGroup_name" | "service_id" | "service_code" | "service_name"

type SearchRow = {
  columns: Record<SearchColumn, string>
  raw: { numerator; denominator; expression; filter }   // not columns, but global search looks here too
}
// num and den formula columns: resolve() + toPlainText
// exp and flt formula columns: the raw expression, then the API text once the row is on the current page

class SearchFilter { global: string; columns: Partial<Record<SearchColumn, string>> }
  matches(row: SearchRow): boolean
  // "a|b" = OR inside a filter, AND across filters, case-insensitive; global checks every column and raw
  highlightTerms(column): string[]

// hard-coded attributes: health service pG4YeQyynJh on data sets, ICD10 zC3TBJnSxar on data elements
// indicator groups take the health service from attributeValues[0], see decision 3
```

## Data sets (`datasets`)

```
class DataSet {
  id; name
  sections: DataSetSection[]                 // if none, one virtual "Data Elements" section, with id "DataElements"
  hasRealSections: boolean
  dataElementIds: Id[]                       // all its elements, also those outside sections; finds its indicators
}
  categoryComboIds(): Id[]

type DataSetSection = NamedRef & { dataElements: DataSetElement[] }
type DataSetElement = NamedRef & {
  shortName; formName; description; valueType; optionNames: string[]
  categoryCombo: NamedRef                    // data set override, else the data element's own
}
type CategoryCombo = NamedRef & { categories: { name; items: string[] }[] }
```

## Indicators (`dossierIndicators`)

```
class FormulaBreakdown { text: string; components: FormulaComponent[] }
  static build(formula, references: FormulaReferences): FormulaBreakdown
  // text: every reference by name or id; constants m70zf14qLvm = 0, qRquxuP5Zow = 1, see decision 4
  // components: only the types below, as today

type FormulaComponent = {
  type: "aggregateDataElement" | "trackerDataElement" | "programIndicator" | "orgUnitGroup" | "number"
  name; dataSetNames: string[]; programNames: string[]                       // links to the other screens
  // programNames only for D{}; presentation shows "No Value" for an aggregate data element in no data set
}
type FormulaReferences = { names: Map<Id, string>; dataSetNames: Map<Id, string[]> }   // dataSetNames by data element
```

## Programs (`dossierPrograms`)

```
type Program = NamedRef & { description; stageIds: Id[]; resourceIds: Id[] }  // attribute HMIS-Dict_Resources, split by ";"

class ProgramStage {
  id; name; description; repeatable: boolean; sortOrder: number; sections: StageSection[]; hasRealSections: boolean
  dataElementIds: Id[]                       // all, not affected by forDisplay; used by Indicator.stageNames
}
  withRules(ruleSet: ProgramRuleSet): ProgramStage                           // fills visibility and calculation
  forDisplay(settings, { showLegacy, legacyOptionIds }): ProgramStage            // removes hidden elements and options
  optionName(dataElementId, code): string?   // used by ProgramExpression.withOptionNames
type StageSection = NamedRef & { dataElements: StageDataElement[] }          // same virtual section as DataSet when none
type StageDataElement = NamedRef & {
  formName; description; valueType; optionSet?: OptionSet; groupIds: Id[]
  compulsory: boolean; visibility: VisibilityRule[]; calculation: CalculationMode
}
type VisibilityRule = { type: "HIDEFIELD" | "HIDESECTION"; ruleName }
type CalculationMode = { type: "default" } | { type: "programRule"; ruleNames: string[] } | { type: "other" }

type ProgramAttribute = NamedRef & {
  formName; description; valueType; aggregationType; optionSet?: OptionSet
  mandatory: boolean; visibility: VisibilityRule[]                           // always [] for now (P10)
}

class ProgramRule { name; description; condition; stage?: NamedRef; actions: ProgramRuleAction[] }   // no stage: all stages
  isAlwaysTrue(): boolean                    // condition === "true"
  assignsVariable(name): boolean             // ASSIGN with content "#{name}"

class ProgramRuleSet { rules: ProgramRule[] }
  dataElementVisibility(dataElementId, stageId): VisibilityRule[]
  sectionVisibility(sectionId, stageId): VisibilityRule[]
  calculationMode(dataElementId, sectionId?, stageId): CalculationMode
  // ASSIGN -> programRule; else section hidden by an always-true rule -> other; else default

type ProgramRuleAction = {
  type: string                               // ASSIGN, HIDEFIELD, HIDESECTION, SHOWERROR, SCHEDULEMESSAGE...
  dataElement?: NamedRef; attribute?: NamedRef; option?: NamedRef; optionGroup?: NamedRef
  stage?: NamedRef; section?: NamedRef; templateId?: Id; templateName; content; data
}

class ProgramRuleVariable { name; sourceType; stage?: NamedRef; dataElement?: NamedRef; attribute?: NamedRef; associatedRuleNames: string[] }
  withAssociatedRules(rules): ProgramRuleVariable

type ProgramResourceType = "dashboards" | "visualizations" | "eventCharts" | "eventReports"
// v42 returns event charts and reports under eventVisualizations, so they disappear (P3, kept): fixed in the data layer later
type ProgramResource = NamedRef & { description; type: ProgramResourceType }
```

## Repositories

Interfaces in `src/domain/repositories`. Every method returns `FutureData<T>`; only `T` is written here.

```
UserRepository                getCurrent(): User
UserGroupRepository           getAll(): NamedRef[];  exists(id): boolean
AppSettingsRepository         get(): AppSettings;  update(changes: Partial<AppSettingsAttrs>): void    // writes only those keys
LayoutSettingsRepository      get(view): LayoutSettings?;  save(settings): void
SessionRepository             isActive(): boolean                                                      // system/ping
ExpressionRepository          describe(kind: ExpressionKind, expression): ExpressionDescription
HealthServiceRepository       getGroupSets(): NamedRef[];  getHealthServices(groupSetId): HealthService[]
AttributeRepository           getAll(): Attribute[]
DossierRepository             getDataSets(): DossierCandidate[];  getIndicatorGroups(): DossierCandidate[]   // light lists
                              getSections(dataSetId): DossierSection[];  getIndicators(groupId): DossierElement[]
HealthServiceTextRepository   getText(healthServiceId, locale: Locale): string                                       // with the API's fallback
                              getTranslations(healthServiceId): HealthServiceTranslations;  saveTranslations(t): void
SearchRepository              getDataElements(): SearchDataElementSource[];  getCategoryOptionCombos(): NamedRef[]
                              getProgramIndicators(): SearchProgramIndicatorSource[];  getIndicators(): SearchIndicatorSource[]
DataSetRepository             getAll(excludedIds): NamedRef[];  getByName(name): NamedRef[];  get(id): DataSet
                              getCategoryCombos(ids): CategoryCombo[]
IndicatorRepository           getForIndicatorsScreen(); getForDataSets(); getForPrograms()   // Indicator[], see decision 5
FormulaRepository             getReferences(tokens: FormulaToken[]): FormulaReferences                 // one batch per type
                              // names cover every reference: #{}, I{}, N{}, G{}, C{}, A{}, and the programs and data elements of D{}
ProgramRepository             getAll(): Program[];  getByName(name): Program[];  getStages(ids): ProgramStage[]
                              getAttributes(programId): ProgramAttribute[];  getIndicators(programId): ProgramIndicator[]
                              getRules(programId): ProgramRule[];  getRuleVariables(programId): ProgramRuleVariable[]
                              getResources(ids): ProgramResource[];  getOptionIdsOfGroups(ids): Set<Id>
VisualizationRepository       save(visualization): Id                                                  // upsert by name, with sharing

type ExpressionKind = "indicator" | "programIndicatorExpression" | "programIndicatorFilter"
```

## Use cases

One per piece a screen loads, because screens fill in piece by piece and report progress. Grouped as in `CompositionRoot`, with `execute(args): T` written as `Name(args): T`. Each takes the narrowest input: `settings`, and `context` only when the user matters.

```
app        GetCurrentUser(): User
           GetAppSettings(): AppSettings
           CheckSession(): boolean                          // on tab switches and selections; reloads if false
           // a 401 goes unnoticed on v42, so it does not count as false (P1, kept)
layout     GetLayoutSettings(view): LayoutSettings          // merged over defaults; if none stored, tries to save the defaults on first view, ignoring errors
           SaveLayoutSettings(settings): void               // fails if an advanced group does not exist
expression DescribeExpressions(kind, expressions, onProgress?: (p: Progress) => void): Map<string, string>
           // one request per unique expression, in sequence; map of raw expression -> display text
           // for expression and filter on the Search rows of the current page; the program and indicator screens use the two below
           DescribeIndicators(indicators, onProgress?): Indicator[]    // texts filled
           DescribeProgramIndicators(programIndicators, stages, onProgress?): ProgramIndicator[]
           // texts filled; filters go through withOptionNames first, with the display stages, as today
           // so option names depend on showLegacy, on purpose
visualize  SaveIndicatorVisualization(indicator | programIndicator): Id   // presentation opens it

dossiers   GetHealthServices(settings): HealthService[]                 // [] when no group set, see decision 7
           GetHealthServiceContent(healthService, excludedSectionName): { dataSets; indicatorGroups }
           // excludedSectionName is the translated dos_Comments, so it depends on the UI language
           // filters the light lists in memory with matchesAttributeValue, then loads sections and indicators only for the matches
           GetHealthServiceText(healthServiceId, locale: Locale): string
           SaveHealthServiceText(healthServiceId, locale: Locale, html): void   // read translations, withDescription, save

search     GetSearchCatalog(context, onStep?: (step: SearchStep) => void): SearchCatalog
           // health services only when showsHealthServiceColumns
           // type SearchStep = "dataElements" | "categoryOptionCombos" | "programIndicators" | "indicators", in that order

datasets   GetDataSets(settings, { name? }): NamedRef[]     // without blacklist.dataSetIds; by name when linked from indicators
           GetDataSet(id): DataSet
           GetCategoryCombos(dataSet): CategoryCombo[]
           GetDataSetIndicators(dataSet, context): Indicator[]    // visible, referencing its data elements

indicators GetVisibleIndicators(context): Indicator[]
           GetFormulaBreakdown(formula): FormulaBreakdown

programs   GetPrograms({ name? }): Program[]
           GetLegacyOptionIds(settings): Set<Id>
           GetProgramStages(program, rules, settings, { showLegacy, legacyOptionIds }): ProgramStage[]
           GetProgramAttributes(program, { showLegacy, legacyOptionIds }): ProgramAttribute[]
           GetProgramIndicators(program, context): ProgramIndicator[]   // visible
           GetProgramRelatedIndicators(program, programIndicators, context): Indicator[]
           GetProgramRules(program): ProgramRule[]          // with template names
           GetProgramRuleVariables(program, rules): ProgramRuleVariable[]
           GetProgramResources(program): ProgramResource[]

admin      GetAdminOptions(): { userGroups; groupSets }
           UpdateAppSettings(changes): void
           RefreshDossierConfigStatus(settings): { status: DossierConfigStatus; changed: boolean }
           // runs when the Admin screen opens; no write if the attribute check does not pass (decision 6), else saves the result if it differs
           // presentation reloads when changed
```

Order on the programs screen, as some pieces need others. Waiting for stages is an intentional change, see decision 8:

```
rules -> stages -> programIndicators (stage names) -> describe texts -> relatedIndicators (stage names) -> describe texts
rules -> ruleVariables (associated rules)
legacyOptionIds -> stages, attributes
resources: independent
```

Presentation, not use cases:

- **Excel export:** built from data already on screen, with translated headers and the user's permissions.
- **Formula cells in Search:** rendered from `resolve()` nodes, with tooltips and colours. Filters and the export use `SearchRow`.
- **User locale and RTL:** the skeleton's `Dhis2App` startup already handles them.
- **Layout settings gear:** only for `isAdmin`, not `canManage`.
- **Admin writes:** each one reloads the app, as today.

## Not modelled

- **`graph`:** unused in the app (commented out in `index.html`), so it will not be migrated.
- **Screen state:** selected item, `showLegacy`, table of contents and progress belong to presentation.

## Decisions

1. **Admin rule:** match the admin group by name (`me.userGroups[name] == setup_userGroup.value`), as the app does today, even though the id is also stored. This replaces the skeleton's `User.isAdmin` (the `ALL` authority).
2. **Layout defaults:** stored settings always merge over the defaults, on all four screens. Today only search and datasets merge, so new columns do not reach indicators and programs.
3. **Health service lookup:** keep the three variants for now, as they can return different health services, and unify them later: search on data sets (attribute `pG4YeQyynJh`), search on indicator groups (`attributeValues[0]`), and dossiers (regex on any attribute).
4. **References in the Indicators formula text:** `m70zf14qLvm` is 0 and `qRquxuP5Zow` is 1. Any other `C{id}`, and `N{}` and `A{}`, show the name, or the id if unknown. Today they add no name and shift the following ones, showing wrong text.
5. **Translated names:** keep what each query reads today, even if untranslated: `name` and `description` on the Indicators screen and its formula references, `description` on data set indicators, `name` on program rules, rule variables and their references, and program indicator groups in Search. Hence one indicator query per screen, filling the same attributes. Comparisons use untranslated names too: the admin group and the links from the Indicators screen, which send `name` and filter on `displayName`, so outside English they may not match. One exception: stage names are always translated, including in `Indicator.stageNames`.
6. **Known bugs:** everything under "Problems found" and "Known bugs" in `e2e.md` was kept during the migration, unless listed in decision 8. Once the e2e suite matched the baseline, the problems found (P1-P12) were fixed. The "Known bugs" are left for a follow-up PR. Those the model reproduced on purpose until then:
   - **P1:** a 401 on the session check goes unnoticed.
   - **P3:** event charts and reports disappear on v42.
   - **Missed indicators:** data sets only find indicators through `#{de.coc}`, not `#{de}`. On v42, 1698 of 1947 indicators contain at least one `#{de}`, so fixing this can change those lists a lot.
   - **P10:** the Visibility column for tracked entity attributes stays empty.
   - **P11:** program indicator filters keep `Program stage id == 'x'`, and only one-character option codes are replaced.
   - **P12:** "Display Widget" never shows, because the rules query does not fetch `location`.
   - **Config can stay true:** no write to `setup_dossierConfigComplete` if the attribute check does not pass (it returns false, or the request fails). A failure in another check can still save `false`.
7. **P5 is not carried over:** `GetHealthServices` returns `[]` when no group set is configured, and `HealthService.key()` tolerates a missing code, so Search always loads and Dossiers still works when the flag is off.
8. **Intentional changes from today's app:** decisions 2, 4 and 7, translated stage names (decision 5), and two more:
   - **Programs order:** stages load before program indicators, so their stage names are no longer silently dropped.
   - **Stale service codes:** a data set without the attribute no longer reuses the previous one's codes, as that depended on a variable shared across the loop.
   - **Hidden markup:** global search no longer matches the formula HTML, including the tooltip descriptions. It still matches raw expressions.
   - **ICD10:** found by attribute id. Today it only works if that attribute is the last one of the data element.
   - **Short name of data set indicators:** the column is filled. Today it stays empty, as its query does not ask for it.
   - **`advancedUserGroupIds`:** a stored empty list stays empty. Today, on Search and Data Sets, the merge brings back the default group.
   - **Filters with no terms:** a filter like `|` matches everything, not nothing.
   - **Search expression and filter columns:** they start with the raw expression, not today's partly parsed version, which misreads `#{stage.de}`.
9. **`d2-api` versions:** `src/types/d2-api.ts` imports `@eyeseetea/d2-api/2.40` and `/2.42` with aliases, and `getD2Api` picks one from `system/info`. The installed package already includes both, and no 40.x package is published. The rest of `data/` is typed against 2.42 and only uses what both have.
