import { Struct } from "./generic/Struct";
import { Id, NamedRef } from "./Ref";

export type UserAttrs = {
    id: Id;
    name: string;
    username: string;
    userGroups: NamedRef[];
};

export class User extends Struct<UserAttrs>() {
    belongsToAnyGroup(ids: Id[]): boolean {
        return this.userGroups.some(group => ids.includes(group.id));
    }

    belongsToGroupNamed(name: string): boolean {
        return this.userGroups.some(group => group.name === name);
    }
}
