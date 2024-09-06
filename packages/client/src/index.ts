import { AnyAI } from "@singlestore/ai";

import { API } from "./api";
import { BillingManager } from "./billing/manager";
import { JobManager } from "./job/manager";
import { OrganizationManager } from "./organization/manager";
import { RegionManager } from "./region/manager";
import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";
export { escape } from "mysql2";
export { QueryBuilder } from "./query/builder";

export interface SingleStoreClientConfig<TAi extends AnyAI | undefined> {
  ai?: TAi;
  apiKey?: string;
}

export interface WorkspaceConfig<TWorkspaceType extends WorkspaceType, TAi extends AnyAI | undefined>
  extends Omit<ConnectWorkspaceConfig<TWorkspaceType, TAi>, "ai"> {}

export class SingleStoreClient<TAi extends AnyAI | undefined = undefined> {
  private _ai: TAi;
  private _api: API;

  billing: BillingManager;
  organization: OrganizationManager;
  region: RegionManager;
  job: JobManager;

  constructor(config?: SingleStoreClientConfig<TAi>) {
    this._ai = config?.ai as TAi;
    this._api = new API(config?.apiKey);

    this.billing = new BillingManager(this._api);
    this.organization = new OrganizationManager(this._api);
    this.region = new RegionManager(this._api);
    this.job = new JobManager(this._api);
  }

  workspace<TWorkspaceType extends WorkspaceType = WorkspaceType>(
    config: WorkspaceConfig<TWorkspaceType, TAi>,
  ): Workspace<TWorkspaceType, TAi> {
    return Workspace.connect({ ...config, ai: this._ai });
  }
}
