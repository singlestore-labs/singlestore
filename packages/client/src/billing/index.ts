export type BillingMetric = "ComputeCredit" | "StorageAvgByte";

export interface BillingUsage {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  startTime: string;
  endTime: string;
  value: string;
}

export interface ComputeCreditBillingUsage extends BillingUsage {
  ownerId: string | null | undefined;
}

export interface StorageAvgByteBillingUsage extends BillingUsage {}

export interface Billing<TMetric extends BillingMetric, TUsage extends ComputeCreditBillingUsage | StorageAvgByteBillingUsage> {
  metric: TMetric;
  description: string;
  usage: TUsage[];
}

export interface ComputeCreditBilling extends Billing<"ComputeCredit", ComputeCreditBillingUsage> {}

export interface StorageAvgByteBilling extends Billing<"StorageAvgByte", StorageAvgByteBillingUsage> {}

export type BillingByMetric<T extends BillingMetric> = T extends "ComputeCredit"
  ? ComputeCreditBilling[]
  : StorageAvgByteBilling[];
