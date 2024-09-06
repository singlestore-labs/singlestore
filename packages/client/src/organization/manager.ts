import type { Organization } from ".";

import { APIManager } from "../api/manager";

export class OrganizationManager extends APIManager {
  protected _baseUrl: string = "/organizations";

  async getCurrent<TName extends string>(): Promise<Organization<TName>> {
    const respnose = await this._execute<{
      orgID: string;
      name: TName;
    }>("/current");

    return {
      id: respnose.orgID,
      name: respnose.name,
    };
  }
}
