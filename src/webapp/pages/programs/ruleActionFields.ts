import { ProgramRuleAction } from "$/domain/entities/ProgramRule";
import { programTexts } from "$/webapp/pages/programs/programTexts";

export type ActionField = { label: string; value: string };

/** Which fields each type of program rule action shows, with their labels. */
export function getActionFields(action: ProgramRuleAction): ActionField[] {
    const t = programTexts;
    const field = (label: string, value: string | undefined): ActionField[] =>
        value ? [{ label, value }] : [];

    const target = [
        ...field(t.dos_DataElement(), action.dataElement?.name),
        ...field(t.dos_TrackedEntityAttributes(), action.attribute?.name),
    ];
    const widget = field(t.dos_DisplayWidget(), action.location);
    const contentAndData = (contentLabel: string) => [
        ...field(contentLabel, action.content),
        ...field(t.dos_Expression(), action.data),
    ];

    switch (action.type) {
        case "ASSIGN":
            return [...target, ...contentAndData(t.dos_ProgramRuleVariableAssign())];
        case "DISPLAYKEYVALUEPAIR":
            return [...widget, ...contentAndData(t.dos_KeyLabel())];
        case "DISPLAYTEXT":
            return [...widget, ...contentAndData(t.dos_StaticText())];
        case "ERRORONCOMPLETE":
        case "SHOWERROR":
        case "SHOWWARNING":
        case "WARNINGONCOMPLETE":
            return [...target, ...contentAndData(t.dos_StaticText())];
        case "HIDEFIELD":
            return [...target, ...field(t.dos_CustomMessageBlankedField(), action.content)];
        case "HIDEOPTION":
            return [...target, ...field(t.dos_OptionToHide(), action.option?.name)];
        case "HIDEOPTIONGROUP":
            return [
                ...target,
                ...field(t.dos_OptionGroupToHide(), (action.optionGroup ?? action.option)?.name),
            ];
        case "HIDEPROGRAMSTAGE":
            return field(t.dos_OptionstageToHide(), action.stage?.name);
        case "HIDESECTION":
            return field(t.dos_OptionstageSectionToHide(), action.section?.name);
        case "SETMANDATORYFIELD":
            return target;
        case "SCHEDULEMESSAGE":
            return [
                ...field(t.dos_DateToSendMessage(), action.data),
                ...field(t.dos_MessageTemplate(), action.templateName),
            ];
        case "SENDMESSAGE":
            return field(t.dos_MessageTemplate(), action.templateName);
        case "SHOWOPTIONGROUP":
            return [...target, ...field(t.dos_OptionGroupToShow(), action.optionGroup?.name)];
        default:
            return [];
    }
}
