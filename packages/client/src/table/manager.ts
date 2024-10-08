import { ResultSetHeader } from "mysql2/promise";

import type { ConnectionClient } from "../connection";
import type { DatabaseType, DatabaseTableName } from "../database";
import type { AnyAI } from "@singlestore/ai";

import { type TableName, type TableType, type CreateTableSchema, Table } from "./table";

export class TableManager<TDatabaseType extends DatabaseType, TAI extends AnyAI | undefined> {
  constructor(
    private _client: ConnectionClient,
    private _ai: TAI,
    public databaseName: TDatabaseType["name"],
  ) {}

  static async create<
    TName extends TableName,
    TType extends TableType,
    TDatabaseType extends DatabaseType,
    TAI extends AnyAI | undefined,
  >(client: ConnectionClient, databaseName: TDatabaseType["name"], schema: CreateTableSchema<TName, TType>, ai?: TAI) {
    const clauses = Table.schemaToClauses(schema);

    await client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${databaseName}.${schema.name} (${clauses})
    `);

    return new Table<TName, TType, TDatabaseType, TAI>(client, schema.name as TType["name"], databaseName, ai);
  }

  use<TName extends DatabaseTableName<TDatabaseType> | (TableName & {}), TType>(name: TName) {
    return new Table<
      TName,
      TType extends TableType
        ? TType
        : TName extends DatabaseTableName<TDatabaseType>
          ? TDatabaseType["tables"][TName]
          : TableType,
      TDatabaseType,
      TAI
    >(this._client, name as TName, this.databaseName, this._ai);
  }

  async create<TName extends TableName, TType extends TableType>(schema: CreateTableSchema<TName, TType>) {
    return TableManager.create<TName, TType, TDatabaseType, TAI>(this._client, this.databaseName, schema, this._ai);
  }

  async drop(
    name: DatabaseTableName<TDatabaseType> | (TableName & {}),
    ...args: Parameters<typeof Table.drop> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Table.drop(this._client, this.databaseName, name, ...args);
  }

  async truncate(
    name: DatabaseTableName<TDatabaseType> | (TableName & {}),
    ...args: Parameters<typeof Table.truncate> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Table.truncate(this._client, this.databaseName, name, ...args);
  }

  async rename(
    name: DatabaseTableName<TDatabaseType> | (TableName & {}),
    ...args: Parameters<typeof Table.rename> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Table.rename(this._client, this.databaseName, name, ...args);
  }
}
