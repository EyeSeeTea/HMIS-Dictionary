import { NamedRef } from "$/domain/entities/Ref";
import { User } from "$/domain/entities/User";

export function createUser(options: { userGroups?: NamedRef[] } = {}): User {
    return new User({
        id: "kQiwoyMYHBS",
        name: "John Traore",
        username: "user",
        userGroups: options.userGroups ?? [],
    });
}
