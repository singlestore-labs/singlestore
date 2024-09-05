import { ManagementApi } from "./management-api";

export class Organization<TId extends string, TName extends string> {
  constructor(
    private _api: ManagementApi,
    public id: TId,
    public name: TName,
  ) {}

  static async get<TId extends string, TName extends string>(api: ManagementApi) {
    const respnose = await api.execute<{ orgID: TId; name: TName }>("/organizations/current");
    return new Organization(api, respnose.orgID, respnose.name);
  }
}
