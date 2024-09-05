import type { StorageAvgByteBillingUsage } from "./usage-storage-avg-byte";

import { Billing } from ".";

export class StorageAvgByteBilling extends Billing<"StorageAvgByte", StorageAvgByteBillingUsage> {
  constructor(description: string, usage: StorageAvgByteBillingUsage[]) {
    super("StorageAvgByte", description, usage);
  }
}
