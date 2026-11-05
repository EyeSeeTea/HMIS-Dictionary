import { FutureData } from "$/domain/entities/generic/Future";

export interface SessionRepository {
    isActive(): FutureData<boolean>;
}
