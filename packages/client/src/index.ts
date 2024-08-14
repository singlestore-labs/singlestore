import type { AI, AIBase } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";

export interface SingleStoreClientConfig<T extends AIBase> {
  ai?: T;
}

export interface WorkspaceConfig<T extends WorkspaceType = WorkspaceType, U extends AIBase = AI>
  extends Omit<ConnectWorkspaceConfig<T, U>, "ai"> {}

export class SingleStoreClient<T extends AIBase = AI> {
  private _ai;

  constructor(config?: SingleStoreClientConfig<T>) {
    this._ai = config?.ai;
  }

  workspace<U extends WorkspaceType = WorkspaceType>(config: WorkspaceConfig<U, T>) {
    return Workspace.connect<U, T>({ ...config, ai: this._ai });
  }
}
