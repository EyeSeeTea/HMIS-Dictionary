import { expect, fixtures, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { mockKeys, ProgramsPage, rowsOf, tableAfter } from "../support/pages";

const { ambulances, boat } = fixtures.programs;

async function select(programs: ProgramsPage, label: string) {
    await programs.load();
    await programs.select(label);
}

async function indicatorType(api: any) {
    const [type] = await api.list("indicatorTypes", { fields: "id", pageSize: 1, paging: true });
    return type.id;
}

test.describe("7. Programs", () => {
    test("Stage descriptions are displayed", async ({ programs, api }) => {
        const { programStages } = await api.get(`programs/${boat.id}`, {
            fields: "programStages[id,description]",
        });
        const stage = programStages[0];
        const set = (value: string) =>
            api.patch(`programStages/${stage.id}`, [{ op: "add", path: "/description", value }]);
        await set("E2E stage description");
        try {
            await select(programs, boat.name);
            await expect(programs.stageContainer).toContainText("E2E stage description");
        } finally {
            await set(stage.description ?? "");
        }
    });

    test("Legacy options are hidden unless the toggle is on", async ({ programs, api, page }) => {
        const all = await api.list<any>("programs", {
            fields: "id,displayName,programIndicators~size,programTrackedEntityAttributes[trackedEntityAttribute[displayName,optionSet[id,options[id,displayName]]]]",
        });
        const program = all
            .filter(p => p.programIndicators < 200)
            .find(p =>
                p.programTrackedEntityAttributes.some(
                    (a: any) => a.trackedEntityAttribute.optionSet?.options.length > 1
                )
            );
        const attribute = program.programTrackedEntityAttributes.find(
            (a: any) => a.trackedEntityAttribute.optionSet?.options.length > 1
        ).trackedEntityAttribute;
        const option = attribute.optionSet.options[0];
        const groupId = api.uid();
        await api.withMetadata(
            {
                optionGroups: [
                    {
                        id: groupId,
                        name: `E2E_${groupId}`,
                        shortName: `E2E_${groupId}`,
                        optionSet: { id: attribute.optionSet.id },
                        options: [{ id: option.id }],
                    },
                ],
            },
            async () => {
                await mockKeys(page, { legacy_optionGroups: [groupId] });
                await select(programs, program.displayName);
                const attributeRow = () =>
                    rowsOf(tableAfter(programs.attributesHeading))
                        .filter({
                            has: page.getByRole("cell", {
                                name: attribute.displayName,
                                exact: true,
                            }),
                        })
                        .first();
                const row = attributeRow();
                await expect(row.locator("select")).toBeVisible();
                await expect(
                    row.locator("option").filter({ hasText: new RegExp(`^${option.displayName}$`) })
                ).toHaveCount(0);
                await programs.legacyToggle.check();
                await select(programs, program.displayName);
                await expect(
                    attributeRow().locator("option").filter({ hasText: option.displayName }).first()
                ).toBeAttached();
            }
        );
    });

    test("Visualization link creates or updates a visualization and opens it", async ({
        programs,
        api,
    }) => {
        const { programIndicators } = await api.get(`programs/${ambulances.id}`, {
            fields: "programIndicators[id,displayName]",
        });
        const pi = [...programIndicators].sort((a: any, b: any) =>
            a.displayName.localeCompare(b.displayName)
        )[0];
        const name = `${pi.displayName} - ${pi.id}`;
        await api.deleteVisualizations(name);
        try {
            await select(programs, ambulances.name);
            const row = rowsOf(tableAfter(programs.programIndicatorsHeading))
                .filter({ hasText: pi.displayName })
                .first();
            const [popup] = await Promise.all([
                programs.page.waitForEvent("popup"),
                row
                    .getByRole("link")
                    .filter({ has: programs.page.getByRole("img", { name: "View Table" }) })
                    .click(),
            ]);
            await popup.close();
            await expect
                .poll(
                    async () =>
                        (
                            await api.list("visualizations", {
                                fields: "id",
                                filter: `name:eq:${name}`,
                            })
                        ).length
                )
                .toBe(1);
        } finally {
            await api.deleteVisualizations(name);
        }
    });

    test("Visualization link includes the formula items", async ({ programs, api }) => {
        const pis = await api.list("programIndicators", {
            fields: "id,program[id,displayName]",
            filter: `program.id:eq:${ambulances.id}`,
        });
        const pi = pis[0];
        const id = api.uid();
        const type = await indicatorType(api);
        const name = `E2E_${id} - ${id}`;
        await api.withMetadata(
            {
                indicators: [
                    {
                        id,
                        name: `E2E_${id}`,
                        shortName: `E2E_${id}`,
                        numerator: `I{${pi.id}}`,
                        denominator: "1",
                        numeratorDescription: "n",
                        denominatorDescription: "d",
                        annualized: false,
                        indicatorType: { id: type },
                    },
                ],
            },
            async () => {
                try {
                    await select(programs, ambulances.name);
                    const row = rowsOf(tableAfter(programs.indicatorsHeading))
                        .filter({ hasText: `E2E_${id}` })
                        .first();
                    const [popup] = await Promise.all([
                        programs.page.waitForEvent("popup"),
                        row
                            .getByRole("link")
                            .filter({ has: programs.page.getByRole("img", { name: "View Table" }) })
                            .click(),
                    ]);
                    await popup.close();
                    await expect
                        .poll(async () => {
                            const [v] = await api.list("visualizations", {
                                fields: "dataDimensionItems",
                                filter: `name:eq:${name}`,
                            });
                            return JSON.stringify(v?.dataDimensionItems ?? "");
                        })
                        .toContain(pi.id);
                } finally {
                    await api.deleteVisualizations(name);
                }
            }
        );
    });

    test("Table lists indicators referencing this program through `D{}`, `A{}` or `I{}`, sorted by name", async ({
        programs,
        api,
    }) => {
        const { programStages } = await api.get(`programs/${ambulances.id}`, {
            fields: "programStages[programStageDataElements[dataElement[id]]]",
        });
        const de = programStages[0].programStageDataElements[0].dataElement.id;
        const type = await indicatorType(api);
        const base = {
            denominator: "1",
            numeratorDescription: "n",
            denominatorDescription: "d",
            annualized: false,
            indicatorType: { id: type },
        };
        const d = api.uid();
        await api.withMetadata(
            {
                indicators: [
                    {
                        ...base,
                        id: d,
                        name: `E2E_${d}`,
                        shortName: `E2E_${d}`,
                        numerator: `D{${ambulances.id}.${de}}`,
                    },
                ],
            },
            async () => {
                await select(programs, ambulances.name);
                await expect(
                    rowsOf(tableAfter(programs.indicatorsHeading))
                        .filter({ hasText: `E2E_${d}` })
                        .first()
                ).toBeVisible();
            }
        );
    });

    test("`ASSIGN`, `DISPLAYKEYVALUEPAIR`, `DISPLAYTEXT`", async ({ programs, api }) => {
        await withRule(
            api,
            "E2E_KEY",
            [
                {
                    programRuleActionType: "DISPLAYKEYVALUEPAIR",
                    content: "E2E key",
                    data: "'1'",
                    location: "feedback",
                },
            ],
            async () => {
                await select(programs, boat.name);
                const row = rowsOf(tableAfter(programs.rulesHeading))
                    .filter({ hasText: "E2E_KEY" })
                    .first();
                await expect(row).toContainText(`${t("dos_Type")}: DISPLAYKEYVALUEPAIR`);
                await expect(row).toContainText(t("dos_KeyLabel"));
            }
        );
    });

    test("`ERRORONCOMPLETE`, `WARNINGONCOMPLETE`, `SHOWERROR`, `SHOWWARNING`", async ({
        programs,
        api,
    }) => {
        await withRule(
            api,
            "E2E_WARN",
            [{ programRuleActionType: "WARNINGONCOMPLETE", content: "E2E warning" }],
            async () => {
                await select(programs, boat.name);
                const row = rowsOf(tableAfter(programs.rulesHeading))
                    .filter({ hasText: "E2E_WARN" })
                    .first();
                await expect(row).toContainText(`${t("dos_Type")}: WARNINGONCOMPLETE`);
                await expect(row).toContainText(t("dos_StaticText"));
            }
        );
    });

    test("`SCHEDULEMESSAGE`, `SENDMESSAGE`, `SETMANDATORYFIELD`, `SHOWOPTIONGROUP`", async ({
        programs,
        api,
    }) => {
        const { programStages } = await api.get(`programs/${boat.id}`, {
            fields: "programStages[id,programStageDataElements[dataElement[id,optionSet[id]]]]",
        });
        const elements = programStages[0].programStageDataElements.map((e: any) => e.dataElement);
        const templateId = api.uid();
        const element = elements[0];
        const withOptions = elements.find((e: any) => e.optionSet);
        const groupId = api.uid();
        const options = withOptions
            ? (await api.get(`optionSets/${withOptions.optionSet.id}`, { fields: "options[id]" }))
                  .options
            : [];
        await api.withMetadata(
            {
                programNotificationTemplates: [
                    {
                        id: templateId,
                        name: `E2E_template_${templateId}`,
                        messageTemplate: "m",
                        notificationTrigger: "PROGRAM_RULE",
                        notificationRecipient: "USER_GROUP",
                    },
                ],
                ...(withOptions
                    ? {
                          optionGroups: [
                              {
                                  id: groupId,
                                  name: `E2E_${groupId}`,
                                  shortName: `E2E_${groupId}`,
                                  optionSet: { id: withOptions.optionSet.id },
                                  options: [{ id: options[0].id }],
                              },
                          ],
                      }
                    : {}),
            },
            () =>
                withRule(
                    api,
                    "E2E_MSG",
                    [
                        { programRuleActionType: "SENDMESSAGE", templateUid: templateId },
                        {
                            programRuleActionType: "SCHEDULEMESSAGE",
                            templateUid: templateId,
                            data: "V{current_date}",
                        },
                        {
                            programRuleActionType: "SETMANDATORYFIELD",
                            dataElement: { id: element.id },
                        },
                        ...(withOptions
                            ? [
                                  {
                                      programRuleActionType: "SHOWOPTIONGROUP",
                                      dataElement: { id: withOptions.id },
                                      optionGroup: { id: groupId },
                                  },
                              ]
                            : []),
                    ],
                    async () => {
                        await select(programs, boat.name);
                        const row = rowsOf(tableAfter(programs.rulesHeading))
                            .filter({ hasText: "E2E_MSG" })
                            .first();
                        for (const type of [
                            "SENDMESSAGE",
                            "SCHEDULEMESSAGE",
                            "SETMANDATORYFIELD",
                        ]) {
                            await expect(row, type).toContainText(`${t("dos_Type")}: ${type}`);
                        }
                        await expect(row).toContainText(t("dos_MessageTemplate"));
                        await expect(row).toContainText(`E2E_template_${templateId}`);
                        await expect(row).toContainText(t("dos_DateToSendMessage"));
                        if (withOptions)
                            await expect(row).toContainText(`${t("dos_Type")}: SHOWOPTIONGROUP`);
                    }
                )
        );
    });

    test("Message actions show the notification template name", async ({ programs, api }) => {
        const templateId = api.uid();
        await api.withMetadata(
            {
                programNotificationTemplates: [
                    {
                        id: templateId,
                        name: `E2E_template_${templateId}`,
                        messageTemplate: "m",
                        notificationTrigger: "PROGRAM_RULE",
                        notificationRecipient: "USER_GROUP",
                    },
                ],
            },
            () =>
                withRule(
                    api,
                    "E2E_TPL",
                    [{ programRuleActionType: "SENDMESSAGE", templateUid: templateId }],
                    async () => {
                        await select(programs, boat.name);
                        const row = rowsOf(tableAfter(programs.rulesHeading))
                            .filter({ hasText: "E2E_TPL" })
                            .first();
                        await expect(row).toContainText(`E2E_template_${templateId}`);
                    }
                )
        );
    });

    test.describe("Resources", () => {
        const dashboardAndVisualization = [
            ["dashboards", "Dashboards", "dhis-web-dashboard"],
            ["visualizations", "Visualizations", "dhis-web-data-visualizer"],
        ] as const;

        async function withResources(
            api: any,
            fn: (items: any[]) => Promise<void>,
            types: ReadonlyArray<readonly [string, string, string]> = dashboardAndVisualization
        ) {
            const resources: any[] = [];
            for (const [resource, type, path] of types) {
                const data = await api.get(resource, { fields: "id,displayName", pageSize: 50 });
                const item = (data[resource] ?? []).find((x: any) => x.displayName.trim());
                if (item) resources.push({ ...item, type, path });
            }
            await api.withProgramAttributes(
                boat.id,
                [
                    {
                        value: resources.map(r => r.id).join(";"),
                        attribute: { id: fixtures.resourcesAttribute },
                    },
                ],
                () => fn(resources)
            );
        }

        test("Table lists the resources from the `HMIS-Dict_Resources` attribute, with its count", async ({
            programs,
            api,
        }) => {
            const filter = `program.id:eq:${boat.id}`;
            const events = [
                ...(await api.list("eventCharts", { fields: "id", filter })),
                ...(await api.list("eventReports", { fields: "id", filter })),
            ];
            await withResources(api, async resources => {
                const total = resources.length + events.length;
                await select(programs, boat.name);
                await expect(programs.resourcesHeading).toBeVisible();
                await expect(programs.pageText).toContainText(
                    `${t("dos_ResourcesNumber")}: ${total}`
                );
                await expect(rowsOf(tableAfter(programs.resourcesHeading))).toHaveCount(total);
                await expect(programs.tocLink("Program Resources")).toBeVisible();
            });
        });

        test("Event chart and event report resources are listed, with their label and a link to the right app and id", async ({
            programs,
            api,
        }) => {
            await withResources(
                api,
                async resources => {
                    await select(programs, boat.name);
                    const table = tableAfter(programs.resourcesHeading);
                    for (const resource of resources) {
                        const row = rowsOf(table).filter({ hasText: resource.displayName }).first();
                        await expect(row).toContainText(resource.type);
                        expect(await row.getByRole("link").getAttribute("href")).toContain(
                            resource.path
                        );
                    }
                },
                [
                    ["eventCharts", "Event Charts", "dhis-web-event-visualizer"],
                    ["eventReports", "Event Reports", "dhis-web-event-reports"],
                ]
            );
        });

        test("Dashboard and visualization resources show their label and link to the right app and id", async ({
            programs,
            api,
        }) => {
            await withResources(api, async resources => {
                await select(programs, boat.name);
                const table = tableAfter(programs.resourcesHeading);
                for (const resource of resources) {
                    const row = rowsOf(table).filter({ hasText: resource.displayName }).first();
                    await expect(row).toContainText(resource.type);
                    const href = await row.getByRole("link").getAttribute("href");
                    expect(href).toContain(resource.path);
                    expect(href).toContain(resource.id);
                }
            });
        });
    });
});

async function withRule(api: any, name: string, actions: object[], fn: () => Promise<void>) {
    const ruleId = api.uid();
    const withIds = actions.map(action => ({
        ...action,
        id: api.uid(),
        programRule: { id: ruleId },
    }));
    await api.withMetadata(
        {
            programRules: [
                {
                    id: ruleId,
                    name,
                    condition: "true",
                    program: { id: fixtures.programs.boat.id },
                    programRuleActions: withIds.map(a => ({ id: a.id })),
                },
            ],
            programRuleActions: withIds,
        },
        fn
    );
}
