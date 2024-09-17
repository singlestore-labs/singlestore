import type {
  BillingMetric,
  BillingSchema,
  ComputeCreditBilling,
  ComputeCreditBillingUsage,
  StorageAvgByteBilling,
  StorageAvgByteBillingUsage,
} from "./billing";

import { APIManager } from "../api/manager";

export interface GetBillingParams {
  metric: BillingMetric;
  startTime: Date;
  endTime: Date;
  aggregateBy?: "hour" | "day" | "month";
}

export class BillingManager extends APIManager {
  protected _baseURL: string = "/billing";

  async get<
    T extends GetBillingParams,
    _TReturnType = T["metric"] extends "ComputeCredit" ? ComputeCreditBilling[] : StorageAvgByteBilling[],
  >({ metric, startTime, endTime, aggregateBy }: T): Promise<_TReturnType> {
    const params = new URLSearchParams({ metric });

    Object.entries({ startTime, endTime }).forEach(([key, value]) => {
      params.set(key, value.toISOString().split(".")[0] + "Z");
    });

    if (aggregateBy) {
      params.set("aggregateBy", aggregateBy);
    }

    const response = await this._execute<{ billingUsage: BillingSchema<T["metric"]>[] }>(`/usage?${params.toString()}`);

    return response.billingUsage.map((data) => {
      const usage = data.Usage.map((usage) => {
        return {
          ...usage,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        };
      });

      if (metric === "ComputeCredit") {
        return {
          metric: "ComputeCredit",
          description: data.description,
          usage: usage as unknown as ComputeCreditBillingUsage[],
        } satisfies ComputeCreditBilling;
      }

      return {
        metric: "StorageAvgByte",
        description: data.description,
        usage: usage as unknown as StorageAvgByteBillingUsage[],
      } satisfies StorageAvgByteBilling;
    }) as _TReturnType;
  }
}
