import type { AI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";

export interface SingleStoreClientConfig<T extends AI> {
  ai?: T;
}

export interface WorkspaceConfig<T extends WorkspaceType, U extends AI> extends Omit<ConnectWorkspaceConfig<T, U>, "ai"> {}

export class SingleStoreClient<T extends AI<any, any> = AI> {
  private _ai;

  constructor(config?: SingleStoreClientConfig<T>) {
    this._ai = config?.ai;
  }

  workspace<U extends WorkspaceType = any>(config: WorkspaceConfig<U, T>) {
    return Workspace.connect<U, T>({ ...config, ai: this._ai });
  }
}
