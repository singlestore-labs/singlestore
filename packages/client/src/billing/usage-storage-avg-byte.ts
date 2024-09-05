import { BillingUsage } from "./usage";

export class StorageAvgByteBillingUsage extends BillingUsage {
  constructor(
    resourceId: string,
    resourceName: string,
    resourceType: string,
    startTime: string,
    endTime: string,
    value: string,
  ) {
    super(resourceId, resourceName, resourceType, startTime, endTime, value);
  }
}
