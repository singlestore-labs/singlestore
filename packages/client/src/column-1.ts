import type { Connection } from "./connection";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

export type ColumnType = any;

export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  default?: any;
  clauses?: string[];
}

export interface ColumnInfo<T extends string = string> {
  name: T;
  type: string;
  null: string;
  key: string;
  default: any;
  extra: string;
}

export class Column {
  private _path: string;

  constructor(
    private _connection: Connection,
    public databaseName: string,
    public tableName: string,
    public name: string,
  ) {
    this._path = [databaseName, tableName].join(".");
  }

  static normalizeInfo<T extends string = string>(info: any): ColumnInfo<T> {
    return {
      name: info.Field,
      type: info.Type,
      null: info.Null,
      key: info.Key,
      default: info.Default,
      extra: info.Extra,
    };
  }

  static schemaToClauses(schema: ColumnSchema): string {
    const clauses: string[] = [`\`${schema.name}\``];
    if (schema.type) clauses.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) clauses.push("NOT NULL");
    if (schema.primaryKey) clauses.push("PRIMARY KEY");
    if (schema.autoIncrement) clauses.push("AUTO_INCREMENT");
    if (schema.default !== undefined) clauses.push(`DEFAULT ${schema.default}`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(" ");
  }

  static async add(connection: Connection, databaseName: string, tableName: string, schema: ColumnSchema): Promise<Column> {
    const clauses = Column.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} ADD COLUMN ${clauses}
    `);

    return new Column(connection, databaseName, tableName, schema.name);
  }

  static drop(
    connection: Connection,
    databaseName: string,
    tableName: string,
    name: string,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} DROP COLUMN ${name}
    `);
  }

  async showInfo(): Promise<ColumnInfo<string>> {
    const [rows] = await this._connection.client.query<any[]>(
      `SHOW COLUMNS IN ${this.tableName} IN ${this.databaseName} LIKE '${this.name}'`,
    );

    return Column.normalizeInfo<string>(rows[0]);
  }

  drop(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Column.drop(this._connection, this.databaseName, this.tableName, this.name);
  }

  modify(schema: Partial<Omit<ColumnSchema, "name">>): Promise<[ResultSetHeader, FieldPacket[]]> {
    const clauses = Column.schemaToClauses({ type: "", ...schema, name: this.name });

    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} MODIFY COLUMN ${clauses}
    `);
  }

  async rename(newName: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} CHANGE ${this.name} ${newName}
    `);

    this.name = newName;

    return result;
  }
}
