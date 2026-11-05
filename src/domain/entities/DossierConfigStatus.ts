import { AppSettings } from "./AppSettings";
import { Struct } from "./generic/Struct";
import { HealthService } from "./HealthService";
import { NamedRef } from "./Ref";

export type Attribute = NamedRef & { dataSetAttribute: boolean; indicatorGroupAttribute: boolean };

export type DossierConfigStatusAttrs = {
    adminGroup: boolean;
    healthServiceGroupSet: boolean;
    healthServiceCodes: boolean;
    healthServiceAttribute: boolean;
};

export class DossierConfigStatus extends Struct<DossierConfigStatusAttrs>() {
    isComplete(): boolean {
        return (
            this.adminGroup &&
            this.healthServiceGroupSet &&
            this.healthServiceCodes &&
            this.healthServiceAttribute
        );
    }

    static build(
        settings: AppSettings,
        healthServices: HealthService[],
        attributes: Attribute[]
    ): DossierConfigStatus {
        return DossierConfigStatus.create({
            adminGroup: Boolean(settings.adminGroup),
            healthServiceGroupSet: Boolean(settings.healthServiceGroupSet),
            healthServiceCodes:
                healthServices.length > 0 && healthServices.every(service => service.code !== ""),
            healthServiceAttribute: attributes.some(
                attribute =>
                    attribute.name === "serviceCode" &&
                    attribute.dataSetAttribute &&
                    attribute.indicatorGroupAttribute
            ),
        });
    }
}
