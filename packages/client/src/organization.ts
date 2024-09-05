import type { ManagementApi } from "./management-api";

export class Organization<TName extends string> {
  constructor(
    public id: string,
    public name: TName,
  ) {}

  static async get<TName extends string>(api: ManagementApi) {
    const respnose = await api.execute<{ orgID: string; name: TName }>("/organizations/current");
    return new Organization(respnose.orgID, respnose.name);
  }
}
