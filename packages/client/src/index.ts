import type { WorkspaceSchema } from "./workspace";
import type { AnyAI } from "@singlestore/ai";

import { API } from "./api";
import { BillingManager } from "./billing/manager";
import { JobManager } from "./job/manager";
import { OrganizationManager } from "./organization/manager";
import { RegionManager } from "./region/manager";
import { SecretManager } from "./secret/manager";
import { TeamManager } from "./team/manager";
import { CreateWorkspaceConnectionConfig, WorkspaceConnection } from "./workspace/connection";
import { WorkspaceGroupManager } from "./workspace-group/manager";

export type * from "./types";
export { escape } from "mysql2";
export { QueryBuilder } from "./query/builder";

export interface SingleStoreClientConfig<TAi extends AnyAI | undefined> {
  ai?: TAi;
  apiKey?: string;
}

export interface ConnectWorkspaceConfig<TName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined>
  extends Omit<CreateWorkspaceConnectionConfig<TName, TAI>, "ai"> {}

export class SingleStoreClient<TAI extends AnyAI | undefined = undefined> {
  private _ai: TAI;
  private _api: API;

  billing: BillingManager;
  job: JobManager;
  organization: OrganizationManager;
  region: RegionManager;
  secret: SecretManager;
  team: TeamManager;
  workspaceGroup: WorkspaceGroupManager<TAI>;

  constructor(config?: SingleStoreClientConfig<TAI>) {
    this._ai = config?.ai as TAI;
    this._api = new API(config?.apiKey);

    this.billing = new BillingManager(this._api);
    this.job = new JobManager(this._api);
    this.organization = new OrganizationManager(this._api);
    this.region = new RegionManager(this._api);
    this.secret = new SecretManager(this._api);
    this.team = new TeamManager(this._api);
    this.workspaceGroup = new WorkspaceGroupManager(this._api, this._ai, this.organization, this.region);
  }

  connect<TName extends WorkspaceSchema["name"] | undefined = undefined>(config: ConnectWorkspaceConfig<TName, TAI>) {
    return WorkspaceConnection.create({ ...config, ai: this._ai });
  }
}

const x = new SingleStoreClient();
const xx = x.connect({ name: "Test" });
