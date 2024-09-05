import { BillingUsage } from "./usage";

export class ComputeCreditBillingUsage extends BillingUsage {
  constructor(
    public ownerId: string | null | undefined,
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
