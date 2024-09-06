import type {
  BillingByMetric,
  BillingMetric,
  BillingUsage,
  ComputeCreditBilling,
  ComputeCreditBillingUsage,
  StorageAvgByteBilling,
  StorageAvgByteBillingUsage,
} from ".";

import { APIManager } from "../api/manager";

export interface GetBillingParams {
  metric: BillingMetric;
  startTime: Date;
  endTime: Date;
  aggregateBy?: "hour" | "day" | "month";
}

export class BillingManager extends APIManager {
  protected _baseUrl: string = "/billing";

  async get<T extends GetBillingParams>({ metric, startTime, endTime, aggregateBy }: T): Promise<BillingByMetric<T["metric"]>> {
    const params = new URLSearchParams({ metric });

    Object.entries({ startTime, endTime }).forEach(([key, value]) => {
      params.set(key, value.toISOString().split(".")[0] + "Z");
    });

    if (aggregateBy) {
      params.set("aggregateBy", aggregateBy);
    }

    const response = await this._execute<{
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
      const usage = data.Usage.map(({ ownerID: ownerId, resourceID: resourceId, startTime, endTime, ...usage }) => {
        const _usage = {
          ...usage,
          resourceId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        } satisfies BillingUsage;

        if (metric === "ComputeCredit") {
          return { ..._usage, ownerId } satisfies ComputeCreditBillingUsage;
        }

        return _usage satisfies StorageAvgByteBillingUsage;
      });

      if (metric === "ComputeCredit") {
        return {
          metric: "ComputeCredit",
          description: data.description,
          usage: usage as ComputeCreditBillingUsage[],
        } satisfies ComputeCreditBilling;
      }

      return {
        metric: "StorageAvgByte",
        description: data.description,
        usage: usage as StorageAvgByteBillingUsage[],
      } satisfies StorageAvgByteBilling;
    }) as BillingByMetric<T["metric"]>;
  }
}
