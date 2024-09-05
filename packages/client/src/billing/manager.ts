import { APIManager } from "../api/manager";

import { ComputeCreditBilling } from "./compute-credit";
import { StorageAvgByteBilling } from "./storage-avg-byte";
import { ComputeCreditBillingUsage } from "./usage-compute-credit";
import { StorageAvgByteBillingUsage } from "./usage-storage-avg-byte";

import { type BillingMetric } from ".";

export interface GetBillingParams {
  metric: BillingMetric;
  startTime: Date;
  endTime: Date;
  aggregateBy?: "hour" | "day" | "month";
}

export class BillingManager extends APIManager {
  protected _baseUrl: string = "/billing";

  async get<T extends GetBillingParams>({
    metric,
    startTime,
    endTime,
    aggregateBy,
  }: T): Promise<T["metric"] extends "ComputeCredit" ? ComputeCreditBilling[] : StorageAvgByteBilling[]> {
    const params = new URLSearchParams({ metric });

    Object.entries({ startTime, endTime }).forEach(([key, value]) => {
      params.set(key, value.toISOString().split(".")[0] + "Z");
    });

    if (aggregateBy) {
      params.set("aggregateBy", aggregateBy);
    }

    const response = await this.execute<{
      billingUsage: {
        metric: T["metric"];
        description: string;
        Usage: {
          ownerID: T["metric"] extends "ComputeCredit" ? string : never;
          resourceID: string;
          resourceName: string;
          resourceType: string;
          startTime: string;
          endTime: string;
          value: string;
        }[];
      }[];
    }>(`/usage?${params.toString()}`);

    return response.billingUsage.map((data) => {
      const usage = data.Usage.map((usage) => {
        const args = [
          usage.resourceID,
          usage.resourceName,
          usage.resourceType,
          usage.startTime,
          usage.endTime,
          usage.value,
        ] as const;

        if (metric === "ComputeCredit") {
          return new ComputeCreditBillingUsage(usage.ownerID, ...args);
        }

        return new StorageAvgByteBillingUsage(...args);
      });

      if (metric === "ComputeCredit") {
        return new ComputeCreditBilling(data.description, usage as ComputeCreditBillingUsage[]);
      }

      return new StorageAvgByteBilling(data.description, usage as StorageAvgByteBillingUsage[]);
    }) as T["metric"] extends "ComputeCredit" ? ComputeCreditBilling[] : StorageAvgByteBilling[];
  }
}
