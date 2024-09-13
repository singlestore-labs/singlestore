import type { AnyAI } from "@singlestore/ai";

import { WorkspaceSchema } from "..";
import { Connection, ConnectionConfig } from "../../connection";

export interface CreateWorkspaceConnectionConfig<
  TName extends WorkspaceSchema["name"] | undefined,
  TAI extends AnyAI | undefined,
> extends ConnectionConfig {
  name: TName;
  ai: TAI;
}

export class WorkspaceConnection<
  TName extends WorkspaceSchema["name"] | undefined,
  TAI extends AnyAI | undefined,
> extends Connection {
  public name: TName;
  private _ai: TAI;

  constructor({ name, ai, ...config }: CreateWorkspaceConnectionConfig<TName, TAI>) {
    super(config);
    this.name = name;
    this._ai = ai;
  }

  static create<TName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined>(
    config: CreateWorkspaceConnectionConfig<TName, TAI>,
  ) {
    return new WorkspaceConnection(config);
  }
}
