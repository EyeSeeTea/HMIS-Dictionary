import React from "react";
import { Checkbox, NoticeBox } from "@dhis2/ui";
import { DossierConfigStatus } from "$/domain/entities/DossierConfigStatus";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useFuture } from "$/webapp/hooks/useFuture";
import { isSelectionLoading } from "$/webapp/hooks/useSectionLoading";
import { LoadingBanner } from "$/webapp/components/loading-banner/LoadingBanner";
import { PageHeader } from "$/webapp/components/page-header/PageHeader";
import { ConfigBox, ConfigStatus, DetailsBox } from "$/webapp/pages/admin/ConfigBox";
import { parseIds, stringifyIds } from "$/webapp/pages/admin/adminSettings";
import { SettingSelect } from "$/webapp/pages/admin/SettingSelect";
import { TextSetting } from "$/webapp/pages/admin/TextSetting";
import { AppSettingsAttrs } from "$/domain/entities/AppSettings";
import css from "./Admin.module.css";

const exampleIds = '["rD7MJ3LaakW","vnoUusJDY1Z","vCfO0z5igGT"]';

export const AdminPage: React.FC = React.memo(() => {
    const { compositionRoot, settings } = useAppContext();
    const [isSaving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string>();

    const options = useFuture(() => compositionRoot.admin.getOptions.execute(), [compositionRoot]);

    // Checks the configuration on open, and reloads if the "complete" flag had to change
    const refresh = useFuture(
        () => compositionRoot.admin.refreshDossierConfigStatus.execute(settings),
        [compositionRoot, settings]
    );

    // The page reloads when the flag changed, and stays "loading" until then
    const willReload = refresh?.type === "success" && refresh.data.changed;
    React.useEffect(() => {
        if (willReload) window.location.reload();
    }, [willReload]);

    const status: Partial<DossierConfigStatus> =
        refresh?.type === "success" ? refresh.data.status : {};
    const check = (value: boolean | undefined): ConfigStatus =>
        value === undefined ? "pending" : value ? "ok" : "error";

    /** Every write reloads the app, so the rest of it uses the new settings. */
    const save = (changes: Partial<AppSettingsAttrs>) => {
        setSaving(true);
        setSaveError(undefined);

        compositionRoot.admin.updateSettings.execute(changes).run(
            () => window.location.reload(),
            error => {
                setSaving(false);
                setSaveError(error.message);
            }
        );
    };

    const validateIds = (text: string) =>
        parseIds(text).type === "invalid" ? i18n.t("Invalid array format") : undefined;

    const saveIds = (update: (ids: string[]) => Partial<AppSettingsAttrs>) => (text: string) => {
        const parsed = parseIds(text);
        if (parsed.type === "valid") save(update(parsed.ids));
    };

    const { blacklist, notInUse, legacy } = settings;
    const idsFormat = (
        <>
            {i18n.t("The arrays should be formatted as follows:")} <code>{exampleIds}</code>.
        </>
    );

    return (
        <>
            <div id="headerPanel">
                <PageHeader title={i18n.t("Admin")} />
            </div>
            <LoadingBanner visible={isSelectionLoading(true, [options, refresh]) || willReload} />

            <div className={`${css.info} alert-info`}>
                <NoticeBox title={i18n.t("About this version")}>
                    {i18n.t(
                        "This version of the app has been tested for dhis v2.42.4 with default locale assumed to be English and accepts translations in Spanish, French, Portuguese and Arabic. The latest version is available at:"
                    )}{" "}
                    <a
                        href="https://github.com/EyeSeeTea/HMIS-Dictionary"
                        target="_blank"
                        rel="noreferrer"
                    >
                        https://github.com/EyeSeeTea/HMIS-Dictionary
                    </a>
                </NoticeBox>
            </div>

            {saveError && (
                <NoticeBox error title={i18n.t("The setting could not be saved")}>
                    {saveError}
                </NoticeBox>
            )}
            {options?.type === "error" && (
                <NoticeBox error title={i18n.t("Admin")}>
                    {options.error.message}
                </NoticeBox>
            )}

            <div className={css.heading}>
                <h3>{i18n.t("Dossiers configuration check:")}</h3>
                <h3>{i18n.t("Details:")}</h3>
            </div>

            <div className={css.row}>
                <ConfigBox status={check(status.adminGroup)} id="divUG">
                    <p>{i18n.t("A userGroup is defined for administrators:")}</p>
                    <SettingSelect
                        selectId="drpBoxUG"
                        submitId="submitUG"
                        label={i18n.t("User group")}
                        options={options?.type === "success" ? options.data.userGroups : []}
                        savedId={settings.adminGroup?.id}
                        disabled={isSaving}
                        onSubmit={group => save({ adminGroup: group })}
                    />
                </ConfigBox>
                <DetailsBox>
                    <p>{i18n.t("The members of this userGroup will have access to:")}</p>
                    <ul>
                        <li>
                            {i18n.t("the 'Admin' panel (which you are currently visualizing) and,")}
                        </li>
                        <li>
                            {i18n.t("to the service description editor in the 'Dossier' panel.")}
                        </li>
                    </ul>
                </DetailsBox>
            </div>

            <div className={css.row}>
                <ConfigBox status={check(status.healthServiceGroupSet)} id="divOUGS">
                    <p>
                        {i18n.t(
                            "An organisationUnitGroupSet is defined to contain the list of services."
                        )}
                    </p>
                    <SettingSelect
                        selectId="drpBoxOUGS"
                        submitId="submitOUGS"
                        label={i18n.t("Organisation unit group set")}
                        options={options?.type === "success" ? options.data.groupSets : []}
                        savedId={settings.healthServiceGroupSet?.id}
                        disabled={isSaving}
                        onSubmit={groupSet => save({ healthServiceGroupSet: groupSet })}
                    />
                </ConfigBox>
                <div />
            </div>

            <div className={css.row}>
                <ConfigBox status={check(status.healthServiceCodes)} id="divOUG">
                    <p>
                        {i18n.t(
                            "organisationUnitGroups are associated to the organisationUnitGroupSet as a list of services... and each of the organisationUnitGroups have a code."
                        )}
                    </p>
                </ConfigBox>
                <DetailsBox>
                    <p>
                        {i18n.t(
                            "To compile the information in the 'Dossiers' panel, the app reads:"
                        )}
                    </p>
                    <ul>
                        <li>
                            {i18n.t(
                                "the translations from the organisationUnitGroups names and descriptions and,"
                            )}
                        </li>
                        <li>
                            {i18n.t("the code should be formatted as follows, for instance:")}{" "}
                            <code>*SomeText*_CD1</code>
                        </li>
                    </ul>
                </DetailsBox>
            </div>

            <div className={css.row}>
                <ConfigBox status={check(status.healthServiceAttribute)} id="divA">
                    <p>
                        {i18n.t(
                            "An attribute named 'serviceCode' is defined and associated with dataSets and indicatorGroups."
                        )}
                    </p>
                </ConfigBox>
                <DetailsBox>
                    <p>
                        {i18n.t(
                            "The serviceCode should correspond to, at least, one code of a service. They should be formatted as follows:"
                        )}
                    </p>
                    <ul>
                        <li>
                            <code>*AnotherText*_CD1</code>{" "}
                            {i18n.t("where CD1 is an example of code used for a service.")}
                        </li>
                        <li>
                            {i18n.t(
                                "One or more codes can be added in the case of dataSets or indicatorGroups used in multiple services:"
                            )}{" "}
                            <code>*AnotherText*_CD1_CD2_CD3</code>
                        </li>
                    </ul>
                </DetailsBox>
            </div>

            <div className={css.row}>
                <ConfigBox status="pending">
                    <TextSetting
                        name="DEG_UIDs"
                        submitId="submitDEG"
                        label={i18n.t(
                            "[Optional] An array of dataElementGroups UIDs to blacklist from the panels."
                        )}
                        value={stringifyIds(blacklist.dataElementGroupIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            blacklist: { ...blacklist, dataElementGroupIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="DS_UIDs"
                        submitId="submitDS"
                        label={i18n.t(
                            "[Optional] An array of dataSets UIDs to blacklist from the panels."
                        )}
                        value={stringifyIds(blacklist.dataSetIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            blacklist: { ...blacklist, dataSetIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="PROGRAM_UIDs"
                        submitId="submitPrograms"
                        label={i18n.t(
                            "[Optional] An array of programs UIDs to blacklist from the panels."
                        )}
                        value={stringifyIds(blacklist.programIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            blacklist: { ...blacklist, programIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="IG_UIDs"
                        submitId="submitIG"
                        label={i18n.t(
                            "[Optional] An array of indicatorGroups UIDs to blacklist from the panels."
                        )}
                        value={stringifyIds(blacklist.indicatorGroupIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            blacklist: { ...blacklist, indicatorGroupIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="BL_TAG"
                        submitId="submitBL_Tag"
                        label={i18n.t(
                            "[Optional] Text of the tag to display for blacklisted elements in Search panel indicator formulas."
                        )}
                        value={JSON.stringify(blacklist.tag)}
                        disabled={isSaving}
                        onSubmit={text =>
                            save({ blacklist: { ...blacklist, tag: parseTag(text) } })
                        }
                    />
                </ConfigBox>
                <DetailsBox>
                    <p>
                        {i18n.t(
                            "These groups contain blacklisted elements and will not be displayed in the panels."
                        )}
                    </p>
                    <p>{idsFormat}</p>
                    <p>
                        {i18n.t(
                            "The tag text field is used to mark metadata elements in the blacklisted groups present in Indicator formulas. If no value is set it will default to Blacklisted."
                        )}
                    </p>
                </DetailsBox>
            </div>

            <div className={css.row}>
                <ConfigBox status="pending">
                    <TextSetting
                        name="NIU_IG_UIDs"
                        submitId="submitNIU_IG"
                        label={i18n.t(
                            "[Optional] An array of not in use indicatorGroups UIDs to hide in the panels for non-admin users."
                        )}
                        value={stringifyIds(notInUse.indicatorGroupIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            notInUse: { ...notInUse, indicatorGroupIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="NIU_PIG_UIDs"
                        submitId="submitNIU_PIG"
                        label={i18n.t(
                            "[Optional] An array of not in use programIndicatorGroups UIDs to hide in the panels for non-admin users."
                        )}
                        value={stringifyIds(notInUse.programIndicatorGroupIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            notInUse: { ...notInUse, programIndicatorGroupIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="NIU_TAG"
                        submitId="submitNIU_Tag"
                        label={i18n.t(
                            "[Optional] Text of the tag to display for not in use elements in Search panel indicator formulas."
                        )}
                        value={JSON.stringify(notInUse.tag)}
                        disabled={isSaving}
                        onSubmit={text => save({ notInUse: { ...notInUse, tag: parseTag(text) } })}
                    />
                </ConfigBox>
                <DetailsBox>
                    <p>
                        {i18n.t(
                            "These groups contain elements that are not in use and will be hidden in the panels for non-admin users but visible for admin users."
                        )}
                    </p>
                    <p>{idsFormat}</p>
                    <p>
                        {i18n.t(
                            "The tag text field is used to mark metadata elements in the not in use groups present in Indicator formulas. If no value is set it will default to Not in Use."
                        )}
                    </p>
                </DetailsBox>
            </div>

            <div className={css.row}>
                <ConfigBox status="pending">
                    <TextSetting
                        name="DEG_UIDs"
                        submitId="submitLEG_DEG"
                        label={i18n.t(
                            "[Optional] An array of legacy dataElementGroups UIDs for the 'Programs' panel."
                        )}
                        value={stringifyIds(legacy.dataElementGroupIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({
                            legacy: { ...legacy, dataElementGroupIds: ids },
                        }))}
                    />
                    <TextSetting
                        name="DS_UIDs"
                        submitId="submitLEG_OPG"
                        label={i18n.t(
                            "[Optional] An array of legacy optionGroups UIDs for the 'Programs' panel."
                        )}
                        value={stringifyIds(legacy.optionGroupIds)}
                        validate={validateIds}
                        disabled={isSaving}
                        onSubmit={saveIds(ids => ({ legacy: { ...legacy, optionGroupIds: ids } }))}
                    />
                </ConfigBox>
                <DetailsBox>
                    <p>
                        {i18n.t(
                            "These groups contain legacy elements that will be hidden in the 'Programs' panel unless the 'Show legacy data elements and options' option is enabled."
                        )}
                    </p>
                    <p>{idsFormat}</p>
                </DetailsBox>
            </div>

            <h4>{i18n.t("About dataElements and indicators:")}</h4>
            <DetailsBox>
                <ul>
                    <li>
                        {i18n.t(
                            "dataElements are listed unless they belong to a blacklisted data element group. Blacklisted dataset will not be displayed in the results. In the 'Search' panel, dataElements are displayed only from the 'Aggregated' domain. In the tables, the principal information used to display in columns is Name, Form Name and Description and their translations."
                        )}
                    </li>
                    <li>
                        {i18n.t(
                            "indicators have to be associated to a indicatorGroup (not blacklisted) to appear in the 'Search' and the 'Indicator' panels. In the tables, the principal information used to display in columns is Name and Description and their translations."
                        )}
                    </li>
                </ul>
            </DetailsBox>

            <div className={css.heading}>
                <h3>{i18n.t("Selectors of Data Sets and Programs")}:</h3>
            </div>
            <div className={css.setting}>
                <Checkbox
                    name="LIMIT_ORG_UNITS"
                    label={i18n.t(
                        "Only list the data sets and programs assigned to the organisation units of the user, or to their descendants."
                    )}
                    checked={settings.limitSelectorsToUserOrgUnits}
                    disabled={isSaving}
                    onChange={({ checked }) => save({ limitSelectorsToUserOrgUnits: checked })}
                    dataTest="limit-org-units"
                />
            </div>
        </>
    );
});

/** The tags are shown as JSON text (`"Tag text"`), as in the Angular app. Plain text is accepted too. */
function parseTag(text: string): string {
    try {
        const parsed: unknown = JSON.parse(text);
        return typeof parsed === "string" ? parsed : text;
    } catch {
        return text;
    }
}
