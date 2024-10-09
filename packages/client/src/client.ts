import type { AnyAI } from "@singlestore/ai";

import { API } from "./api";
import { BillingManager } from "./billing";
import { JobManager } from "./job";
import { OrganizationManager } from "./organization";
import { RegionManager } from "./region";
import { SecretManager } from "./secret";
import { TeamManager } from "./team";
import { type CreateWorkspaceConnectionConfig, WorkspaceConnection, type WorkspaceSchema } from "./workspace";
import { WorkspaceGroupManager } from "./workspace-group";

export interface SingleStoreClientConfig<TAI extends AnyAI | undefined> {
  ai?: TAI;
  apiKey?: string;
}

export interface ConnectConfig<TName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined>
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

  connect<TName extends WorkspaceSchema["name"] | undefined = undefined>(config: ConnectConfig<TName, TAI>) {
    return WorkspaceConnection.create({ ...config, ai: this._ai });
  }
}
