import { FutureData } from "$/domain/entities/generic/Future";
import { SessionRepository } from "$/domain/repositories/SessionRepository";

export class CheckSessionUseCase {
    constructor(private sessionRepository: SessionRepository) {}

    execute(): FutureData<boolean> {
        return this.sessionRepository.isActive();
    }
}
