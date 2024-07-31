import type { AI } from "@singlestore/ai";
import { Workspace, type WorkspaceType } from "./workspace";

export type * from "./types";

export class SingleStoreClient {
  private _ai;

  constructor(config?: { ai?: AI }) {
    this._ai = config?.ai;
  }

  workspace<T extends WorkspaceType>(config: Omit<Parameters<typeof Workspace.connect>[0], "ai">) {
    return Workspace.connect<T>({ ...config, ai: this._ai });
  }
}
