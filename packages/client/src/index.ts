import { AnyAI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";
export { escape } from "mysql2";

/**
 * Configuration object for initializing a `SingleStoreClient` instance.
 *
 * @typeParam TAI - The type of AI functionalities integrated with the client, which can be undefined.
 *
 * @property {TAI} [ai] - Optional AI functionalities to associate with the `SingleStoreClient`.
 */
export interface SingleStoreClientConfig<TAI extends AnyAI | undefined> {
  ai?: TAI;
}

/**
 * Configuration object for connecting to a workspace within `SingleStoreClient`.
 *
 * @typeParam TWorkspaceType - The type of the workspace to connect to.
 * @typeParam TAI - The type of AI functionalities integrated with the workspace, which can be undefined.
 */
export interface WorkspaceConfig<TWorkspaceType extends WorkspaceType, TAI extends AnyAI | undefined>
  extends Omit<ConnectWorkspaceConfig<TWorkspaceType, TAI>, "ai"> {}

/**
 * Main client class for interacting with SingleStore, including the ability to connect to workspaces.
 *
 * @typeParam TAI - The type of AI functionalities integrated with the client, which can be undefined.
 *
 * @property {TAI} _ai - The AI functionalities associated with the `SingleStoreClient`.
 */
export class SingleStoreClient<TAI extends AnyAI | undefined = undefined> {
  private _ai: TAI;

  /**
   * Constructs a new `SingleStoreClient` instance.
   *
   * @param {SingleStoreClientConfig<TAI>} [config] - The configuration object for initializing the `SingleStoreClient`.
   */
  constructor(config?: SingleStoreClientConfig<TAI>) {
    this._ai = config?.ai as TAI;
  }

  /**
   * Connects to a workspace within the SingleStore environment.
   *
   * @typeParam TWorkspaceType - The type of the workspace to connect to.
   *
   * @param {WorkspaceConfig<TWorkspaceType, TAI>} config - The configuration object for connecting to the workspace.
   *
   * @returns {Workspace<TWorkspaceType, TAI>} A `Workspace` instance representing the connected workspace.
   */
  workspace<TWorkspaceType extends WorkspaceType = WorkspaceType>(
    config: WorkspaceConfig<TWorkspaceType, TAI>,
  ): Workspace<TWorkspaceType, TAI> {
    return Workspace.connect<TWorkspaceType, TAI>({ ...config, ai: this._ai });
  }
}
