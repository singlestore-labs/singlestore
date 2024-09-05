import type { ComputeCreditBillingUsage } from "./usage-compute-credit";

import { Billing } from ".";

export class ComputeCreditBilling extends Billing<"ComputeCredit", ComputeCreditBillingUsage> {
  constructor(description: string, usage: ComputeCreditBillingUsage[]) {
    super("ComputeCredit", description, usage);
  }
}
