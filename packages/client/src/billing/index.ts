import type { ComputeCreditBillingUsage } from "./usage-compute-credit";
import type { StorageAvgByteBillingUsage } from "./usage-storage-avg-byte";

export type BillingMetric = "ComputeCredit" | "StorageAvgByte";
export type BillingUsage = ComputeCreditBillingUsage | StorageAvgByteBillingUsage;

export class Billing<TMetric extends BillingMetric, TUsage extends BillingUsage> {
  constructor(
    public metric: TMetric,
    public description: string,
    public usage: TUsage[],
  ) {}
}
