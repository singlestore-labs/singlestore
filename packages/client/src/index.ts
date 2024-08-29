import { AnyAI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";
export { escape } from "mysql2";
export { QueryBuilder } from "./query/builder";

/**
 * Configuration object for initializing a `SingleStoreClient` instance.
 *
 * @typeParam TAi - The type of AI functionalities integrated with the client, which can be undefined.
 *
 * @property {TAi} [ai] - Optional AI functionalities to associate with the `SingleStoreClient`.
 */
export interface SingleStoreClientConfig<TAi extends AnyAI | undefined> {
  ai?: TAi;
}

/**
 * Configuration object for connecting to a workspace within `SingleStoreClient`.
 *
 * @typeParam TWorkspaceType - The type of the workspace to connect to.
 * @typeParam TAi - The type of AI functionalities integrated with the workspace, which can be undefined.
 */
export interface WorkspaceConfig<TWorkspaceType extends WorkspaceType, TAi extends AnyAI | undefined>
  extends Omit<ConnectWorkspaceConfig<TWorkspaceType, TAi>, "ai"> {}

/**
 * Main client class for interacting with SingleStore, including the ability to connect to workspaces.
 *
 * @typeParam TAi - The type of AI functionalities integrated with the client, which can be undefined.
 *
 * @property {TAi} _ai - The AI functionalities associated with the `SingleStoreClient`.
 */
export class SingleStoreClient<TAi extends AnyAI | undefined = undefined> {
  private _ai: TAi;

  /**
   * Constructs a new `SingleStoreClient` instance.
   *
   * @param {SingleStoreClientConfig<TAi>} [config] - The configuration object for initializing the `SingleStoreClient`.
   */
  constructor(config?: SingleStoreClientConfig<TAi>) {
    this._ai = config?.ai as TAi;
  }

  /**
   * Connects to a workspace within the SingleStore environment.
   *
   * @typeParam TWorkspaceType - The type of the workspace to connect to.
   *
   * @param {WorkspaceConfig<TWorkspaceType, TAi>} config - The configuration object for connecting to the workspace.
   *
   * @returns {Workspace<TWorkspaceType, TAi>} A `Workspace` instance representing the connected workspace.
   */
  workspace<TWorkspaceType extends WorkspaceType = WorkspaceType>(
    config: WorkspaceConfig<TWorkspaceType, TAi>,
  ): Workspace<TWorkspaceType, TAi> {
    return Workspace.connect<TWorkspaceType, TAi>({ ...config, ai: this._ai });
  }
}
