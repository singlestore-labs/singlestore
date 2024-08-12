import type { AI } from "@singlestore/ai";
import { Workspace, type WorkspaceType } from "./workspace";

export type * from "./types";

export class SingleStoreClient<U extends AI = AI> {
  private _ai;

  constructor(config?: { ai?: U }) {
    this._ai = config?.ai;
  }

  workspace<T extends WorkspaceType>(config: Omit<Parameters<typeof Workspace.connect>[0], "ai">) {
    return Workspace.connect<T, U>({ ...config, ai: this._ai });
  }
}
