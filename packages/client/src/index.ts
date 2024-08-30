import { AnyAI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";
export { escape } from "mysql2";
export { QueryBuilder } from "./query/builder";

export interface SingleStoreClientConfig<TAi extends AnyAI | undefined> {
  ai?: TAi;
}

export interface WorkspaceConfig<TWorkspaceType extends WorkspaceType, TAi extends AnyAI | undefined>
  extends Omit<ConnectWorkspaceConfig<TWorkspaceType, TAi>, "ai"> {}

export class SingleStoreClient<TAi extends AnyAI | undefined = undefined> {
  private _ai: TAi;

  constructor(config?: SingleStoreClientConfig<TAi>) {
    this._ai = config?.ai as TAi;
  }

  workspace<TWorkspaceType extends WorkspaceType = WorkspaceType>(
    config: WorkspaceConfig<TWorkspaceType, TAi>,
  ): Workspace<TWorkspaceType, TAi> {
    return Workspace.connect({ ...config, ai: this._ai });
  }
}
