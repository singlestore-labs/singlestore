export class BillingUsage {
  constructor(
    public resourceId: string,
    public resourceName: string,
    public resourceType: string,
    public startTime: string,
    public endTime: string,
    public value: string,
  ) {}
}
