import { APIManager } from "../api/manager";

import { Organization } from ".";

export class OrganizationManager extends APIManager {
  protected _baseUrl: string = "/organizations";

  async getCurrent<TName extends string>() {
    const respnose = await this.execute<{ orgID: string; name: TName }>("/current");
    return new Organization(respnose.orgID, respnose.name);
  }
}
