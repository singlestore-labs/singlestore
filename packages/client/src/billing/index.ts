export type BillingMetric = "ComputeCredit" | "StorageAvgByte";

export interface BillingUsageSchema {
  resourceID: string;
  resourceName: string;
  resourceType: string;
  startTime: string;
  endTime: string;
  value: string;
}

export interface StorageAvgByteBillingUsageSchema extends BillingUsageSchema {}

export interface StorageAvgByteBillingUsage extends Omit<StorageAvgByteBillingUsageSchema, "startTime" | "endTime"> {
  startTime: Date;
  endTime: Date;
}

export interface ComputeCreditBillingUsageSchema extends BillingUsageSchema {
  ownerID: string | null | undefined;
}

export interface ComputeCreditBillingUsage extends Omit<ComputeCreditBillingUsageSchema, "startTime" | "endTime"> {
  startTime: Date;
  endTime: Date;
}

export interface BillingSchema<T extends BillingMetric> {
  metric: T;
  description: string;
  Usage: (T extends "ComputeCredit" ? ComputeCreditBillingUsageSchema : StorageAvgByteBillingUsageSchema)[];
}

export interface Billing<TMetric extends BillingMetric, TUsage extends StorageAvgByteBillingUsage | ComputeCreditBillingUsage> {
  metric: TMetric;
  description: string;
  usage: TUsage[];
}

export interface StorageAvgByteBilling extends Billing<"StorageAvgByte", StorageAvgByteBillingUsage> {}

export interface ComputeCreditBilling extends Billing<"ComputeCredit", ComputeCreditBillingUsage> {}
