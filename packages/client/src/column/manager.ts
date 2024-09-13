import { ResultSetHeader } from "mysql2/promise";

import type { ConnectionClient } from "../connection";
import type { TableColumnName, TableSchema } from "../table";

import { Column, type ColumnSchema } from ".";

export class ColumnManager<TTableSchema extends TableSchema, TDatabaseName extends string> {
  private _path: string;

  constructor(
    private _client: ConnectionClient,
    public tableName: TTableSchema["name"],
    public databaseName: TDatabaseName,
  ) {
    this._path = [databaseName, tableName].join(".");
  }

  use<TName extends TableColumnName<TTableSchema> | (ColumnSchema["name"] & {})>(name: TName) {
    return new Column(this._client, this._path, this.databaseName, this.tableName, name);
  }

  async add<TSchema extends ColumnSchema>(schema: TSchema) {
    const clauses = Column.schemaToClauses(schema);

    await this._client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this.databaseName}.${this.tableName} ADD COLUMN ${clauses}
    `);

    return new Column(this._client, this._path, schema.name as TSchema["name"], this.tableName, this.databaseName);
  }

  async drop(name: TableColumnName<TTableSchema> | (ColumnSchema["name"] & {})) {
    return Column.drop(this._client, this.databaseName, this.tableName, name);
  }

  async modify(
    name: TableColumnName<TTableSchema> | (ColumnSchema["name"] & {}),
    ...args: Parameters<typeof Column.modify> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Column.modify(this._client, this._path, name, ...args);
  }

  async rename(
    name: TableColumnName<TTableSchema> | (ColumnSchema["name"] & {}),
    ...args: Parameters<typeof Column.rename> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Column.rename(this._client, this._path, name, ...args);
  }

  async showInfo<TSchema extends ColumnSchema>(
    name: TableColumnName<TTableSchema> | (ColumnSchema["name"] & {}),
    ...args: Parameters<typeof Column.showInfo> extends [any, any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Column.showInfo<TSchema>(this._client, this.tableName, this.databaseName, name, ...args);
  }
}
