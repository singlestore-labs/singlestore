import type { AnyAI } from "@singlestore/ai";

import { Connection, ConnectionConfig } from "../connection";
import { DatabaseManager } from "../database/manager";

import { WorkspaceSchema } from ".";

export interface CreateWorkspaceConnectionConfig<
  TName extends WorkspaceSchema["name"] | undefined,
  TAI extends AnyAI | undefined,
> extends ConnectionConfig {
  name?: TName;
  ai?: TAI;
}

export class WorkspaceConnection<
  TName extends WorkspaceSchema["name"] | undefined,
  TAI extends AnyAI | undefined,
> extends Connection {
  public name: TName;
  private _ai: TAI;
  database: DatabaseManager<TName, TAI>;

  constructor({ name, ai, ...config }: CreateWorkspaceConnectionConfig<TName, TAI>) {
    super(config);
    this.name = name as TName;
    this._ai = ai as TAI;
    this.database = new DatabaseManager(this.client, this._ai, this.name);
  }

  static create<TName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined>(
    config: CreateWorkspaceConnectionConfig<TName, TAI>,
  ) {
    return new WorkspaceConnection(config);
  }
}
