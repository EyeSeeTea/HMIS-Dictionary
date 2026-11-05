import { Struct } from "./generic/Struct";
import { Id } from "./Ref";
import { Maybe } from "$/utils/ts-utils";

export type StageWithOptions = {
    id: Id;
    optionName(dataElementId: Id, code: string): Maybe<string>;
};

export type ProgramExpressionAttrs = { expression: string };

export class ProgramExpression extends Struct<ProgramExpressionAttrs>() {
    isEmpty(): boolean {
        return this.expression === "";
    }

    stageIds(): Id[] {
        const regexes = [
            /V\{program_stage_id\} *== *'(\w{11})'/g,
            /#\{(\w+)\.\w+\}/g,
            /PS_EVENTDATE: *(\w{11})/g,
        ];

        return unique(regexes.flatMap(regex => this.captures(regex)));
    }

    stageNames(): string[] {
        return unique(this.captures(/V\{program_stage_name\} *== *['"](.*?)['"]/g));
    }

    /**
     * Replaces option codes in #{stage.de} == 'code' by the option name. It only matches codes of
     * one character on purpose: bug P11 is kept until the end, so do not "correct" this regex.
     */
    withOptionNames(stages: StageWithOptions[]): ProgramExpression {
        const regex = /#\{(\w+).(\w+)\} *?(!=|==) ?'(.?)'/g;

        const expression = this.expression.replaceAll(
            regex,
            (match, stageId: string, dataElementId: string, operator: string, code: string) => {
                const stage = stages.find(stage => stage.id === stageId);
                const optionName = stage?.optionName(dataElementId, code);
                return optionName
                    ? `#{${stageId}.${dataElementId}} ${operator} '${optionName}'`
                    : match;
            }
        );

        return this._update({ expression });
    }

    private captures(regex: RegExp): string[] {
        return Array.from(this.expression.matchAll(regex)).flatMap(([, value]) =>
            value ? [value] : []
        );
    }
}

function unique<T>(values: T[]): T[] {
    return Array.from(new Set(values));
}
