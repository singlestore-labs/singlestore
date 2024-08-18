import { AnyAI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";

export interface SingleStoreClientConfig<T extends AnyAI | undefined> {
  ai?: T;
}

export interface WorkspaceConfig<T extends WorkspaceType, U extends AnyAI | undefined>
  extends Omit<ConnectWorkspaceConfig<T, U>, "ai"> {}

export class SingleStoreClient<T extends AnyAI | undefined = undefined> {
  private _ai: T;

  constructor(config?: SingleStoreClientConfig<T>) {
    this._ai = config?.ai as T;
  }

  workspace<U extends WorkspaceType = WorkspaceType>(config: WorkspaceConfig<U, T>) {
    return Workspace.connect<U, T>({ ...config, ai: this._ai });
  }
}
