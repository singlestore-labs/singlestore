import type { ConnectionClient } from "../connection";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

import { type DatabaseSchema } from "../database";

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  default: any;
  clauses: string[];
}

export interface ColumnInfo<TSchema extends ColumnSchema> {
  name: TSchema["name"];
  type: string;
  null: string;
  key: string;
  default: any;
  extra: string;
}

export class Column<TSchema extends ColumnSchema, TTableName extends string, TDatabaseName extends DatabaseSchema["name"]> {
  constructor(
    private _client: ConnectionClient,
    private _path: string,
    public name: TSchema["name"],
    public tableName: TTableName,
    public databaseName: TDatabaseName,
  ) {}

  static schemaToClauses(schema: Partial<ColumnSchema>): string {
    const clauses: string[] = [`\`${schema.name}\``];
    if (schema.type) clauses.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) clauses.push("NOT NULL");
    if (schema.primaryKey) clauses.push("PRIMARY KEY");
    if (schema.autoIncrement) clauses.push("AUTO_INCREMENT");
    if (schema.default !== undefined) clauses.push(`DEFAULT ${schema.default}`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(" ");
  }

  static async drop(
    client: ConnectionClient,
    databaseName: DatabaseSchema["name"],
    tableName: string,
    name: ColumnSchema["name"],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} DROP COLUMN ${name}
    `);
  }

  static normalizeInfo<T extends ColumnSchema>(info: any): ColumnInfo<T> {
    return {
      name: info.Field,
      type: info.Type,
      null: info.Null,
      key: info.Key,
      default: info.Default,
      extra: info.Extra,
    };
  }

  static async modify(
    client: ConnectionClient,
    path: string,
    name: ColumnSchema["name"],
    schema: Partial<Omit<ColumnSchema, "name">>,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const clauses = Column.schemaToClauses({ type: "", ...schema, name });

    return client.execute<ResultSetHeader>(`\
      ALTER TABLE ${path} MODIFY COLUMN ${clauses}
    `);
  }

  static async rename(
    client: ConnectionClient,
    path: string,
    name: ColumnSchema["name"],
    newName: ColumnSchema["name"],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await client.execute<ResultSetHeader>(`\
      ALTER TABLE ${path} CHANGE ${name} ${newName}
    `);

    return result;
  }

  static async showInfo<TSchema extends ColumnSchema>(
    client: ConnectionClient,
    tableName: string,
    databaseName: DatabaseSchema["name"],
    name: TSchema["name"],
  ): Promise<ColumnInfo<TSchema>> {
    const [rows] = await client.query<any[]>(`SHOW COLUMNS IN ${tableName} IN ${databaseName} LIKE '${name}'`);
    return Column.normalizeInfo<TSchema>(rows[0]);
  }

  async drop() {
    return Column.drop(this._client, this.databaseName, this.tableName, this.name);
  }

  async modify(...args: Parameters<typeof Column.modify> extends [any, any, any, ...infer Rest] ? Rest : never) {
    return Column.modify(this._client, this._path, this.name, ...args);
  }

  async rename(...[newName, ...args]: Parameters<typeof Column.rename> extends [any, any, any, ...infer Rest] ? Rest : never) {
    const result = await Column.rename(this._client, this._path, this.name, newName, ...args);
    this.name = newName as TSchema["name"];
    return result;
  }

  async showInfo() {
    return Column.showInfo<TSchema>(this._client, this.tableName, this.databaseName, this.name);
  }
}
