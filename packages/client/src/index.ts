import { AI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";

export interface SingleStoreClientConfig {
  ai?: AI;
}

export interface WorkspaceConfig<T extends WorkspaceType = WorkspaceType, U extends AI | undefined = undefined>
  extends Omit<ConnectWorkspaceConfig<T, U>, "ai"> {}

export class SingleStoreClient<T extends SingleStoreClientConfig = SingleStoreClientConfig> {
  public _ai: T["ai"] extends AI ? T["ai"] : undefined;

  constructor(config?: T) {
    this._ai = config?.ai as this["_ai"];
  }

  workspace<U extends WorkspaceType = WorkspaceType>(config: WorkspaceConfig<U, T["ai"]>) {
    return Workspace.connect<U, T["ai"]>({ ...config, ai: this._ai });
  }
}
