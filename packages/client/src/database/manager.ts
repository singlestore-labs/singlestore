import { type AnyAI } from "@singlestore/ai";

import type { ConnectionClient } from "../connection";
import type { WorkspaceSchema } from "../workspace";
import type { Tail } from "@repo/utils";
import type { ResultSetHeader } from "mysql2/promise";

import { TableManager } from "../table";

import { type DatabaseType, Database, type DatabaseSchema } from "./database";

export class DatabaseManager<TWorkspaceName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined> {
  constructor(
    private _client: ConnectionClient,
    private _ai: TAI,
    public workspaceName: TWorkspaceName,
  ) {}

  use<TType extends DatabaseType>(name: TType["name"]) {
    return new Database<TType, TWorkspaceName, TAI>(this._client, this._ai, name, this.workspaceName);
  }

  async create<TType extends DatabaseType>(schema: DatabaseSchema<TType>) {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (this.workspaceName) clauses.push(`ON WORKSPACE \`${this.workspaceName}\``);
    await this._client.execute<ResultSetHeader>(clauses.join(" "));

    if (schema.tables) {
      await Promise.all(
        Object.entries(schema.tables).map(([name, tableSchema]) => {
          return TableManager.create(this._client, schema.name, { ...tableSchema, name }, this._ai);
        }),
      );
    }

    return new Database<TType, TWorkspaceName, TAI>(this._client, this._ai, schema.name, this.workspaceName);
  }

  async drop(...args: Tail<Parameters<typeof Database.drop>>) {
    return Database.drop(this._client, ...args);
  }
}
