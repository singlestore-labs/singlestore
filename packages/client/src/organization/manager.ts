import type { Organization, OrganizationSchema } from ".";

import { APIManager } from "../api/manager";

export class OrganizationManager extends APIManager {
  protected _baseURL: string = "/organizations";

  async get(): Promise<Organization> {
    const respnose = await this._execute<OrganizationSchema>("/current");

    return {
      id: respnose.orgID,
      name: respnose.name,
    };
  }
}
