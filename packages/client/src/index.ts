import { AnyAI } from "@singlestore/ai";

import { Workspace, type ConnectWorkspaceConfig, type WorkspaceType } from "./workspace";

export type * from "./types";

export * from "./query.1/builder";

/**
 * Configuration object for initializing a `SingleStoreClient` instance.
 *
 * @typeParam T - The type of AI functionalities integrated with the client, which can be undefined.
 *
 * @property {T} [ai] - Optional AI functionalities to associate with the `SingleStoreClient`.
 */
export interface SingleStoreClientConfig<T extends AnyAI | undefined> {
  ai?: T;
}

/**
 * Configuration object for connecting to a workspace within `SingleStoreClient`.
 *
 * Extends `Omit<ConnectWorkspaceConfig<T, U>, "ai">` to include all properties of `ConnectWorkspaceConfig`
 * except `ai`, which is provided by the `SingleStoreClient` itself.
 *
 * @typeParam T - The type of the workspace to connect to.
 * @typeParam U - The type of AI functionalities integrated with the workspace, which can be undefined.
 */
export interface WorkspaceConfig<T extends WorkspaceType, U extends AnyAI | undefined>
  extends Omit<ConnectWorkspaceConfig<T, U>, "ai"> {}

/**
 * Main client class for interacting with SingleStore, including the ability to connect to workspaces.
 *
 * @typeParam T - The type of AI functionalities integrated with the client, which can be undefined.
 *
 * @property {T} _ai - The AI functionalities associated with the `SingleStoreClient`.
 */
export class SingleStoreClient<T extends AnyAI | undefined = undefined> {
  private _ai: T;

  /**
   * Constructs a new `SingleStoreClient` instance.
   *
   * @param {SingleStoreClientConfig<T>} [config] - The configuration object for initializing the `SingleStoreClient`.
   */
  constructor(config?: SingleStoreClientConfig<T>) {
    this._ai = config?.ai as T;
  }

  /**
   * Connects to a workspace within the SingleStore environment.
   *
   * @typeParam U - The type of the workspace to connect to.
   *
   * @param {WorkspaceConfig<U, T>} config - The configuration object for connecting to the workspace.
   *
   * @returns {Workspace<U, T>} A `Workspace` instance representing the connected workspace.
   */
  workspace<U extends WorkspaceType = WorkspaceType>(config: WorkspaceConfig<U, T>): Workspace<U, T> {
    return Workspace.connect<U, T>({ ...config, ai: this._ai });
  }
}
