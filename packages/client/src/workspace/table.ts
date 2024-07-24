import { ResultSetHeader, RowDataPacket } from "mysql2";
import { FlexKeyOf } from "../types/helpers";
import { WorkspaceColumn, WorkspaceColumnSchema, WorkspaceColumnType } from "./column";
import { WorkspaceConnection } from "./connection";
import { QueryBuilder } from "../query/builder";
import { QueryFilters } from "../query/filters/builder";

export interface WorkspaceTableType {
  name?: string;
  columns: Record<string, WorkspaceColumnType>;
}

export interface WorkspaceTableSchema<T extends WorkspaceTableType = WorkspaceTableType> {
  name: Exclude<T["name"], undefined>;
  columns: { [K in keyof T["columns"]]: Omit<WorkspaceColumnSchema<T["columns"][K]>, "name"> };
  primaryKeys?: string[];
  fulltextKeys?: string[];
  clauses?: string[];
}

export class WorkspaceTable<T extends WorkspaceTableType = WorkspaceTableType> {
  private _path: string;

  constructor(
    private _connection: WorkspaceConnection,
    private _dbName: string,
    public name: WorkspaceTableSchema["name"],
  ) {
    this._path = `${this._dbName}.${this.name}`;
  }

  static schemaToClauses(schema: WorkspaceTableSchema) {
    const clauses: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return WorkspaceColumn.schemaToClauses({ ...schema, name });
      }),
    ];
    if (schema.primaryKeys?.length) clauses.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) clauses.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(", ");
  }

  static async create<T extends WorkspaceTableType>(
    connection: WorkspaceConnection,
    dbName: string,
    schema: WorkspaceTableSchema<T>,
  ) {
    const clauses = WorkspaceTable.schemaToClauses(schema);
    await connection.client.execute(`\
      CREATE TABLE IF NOT EXISTS ${dbName}.${schema.name} (${clauses})
    `);
    return new WorkspaceTable<T>(connection, dbName, schema.name);
  }

  static async drop(connection: WorkspaceConnection, dbName: string, name: WorkspaceTableSchema["name"]) {
    await connection.client.execute(`\
      DROP TABLE IF EXISTS ${dbName}.${name}
    `);
  }

  async drop() {
    await WorkspaceTable.drop(this._connection, this._dbName, this.name);
  }

  column(name: FlexKeyOf<T["columns"]>) {
    return new WorkspaceColumn(this._connection, this._path, name);
  }

  addColumn<T extends WorkspaceColumnType>(schema: WorkspaceColumnSchema<T>) {
    return WorkspaceColumn.add<T>(this._connection, this._path, schema);
  }

  dropColumn(name: FlexKeyOf<T["columns"]>) {
    return WorkspaceColumn.drop(this._connection, this._path, name);
  }

  async truncate() {
    await this._connection.client.execute(`\
      TRUNCATE TABLE ${this._path}
    `);
  }

  async rename(newName: WorkspaceTableSchema["name"]) {
    await this._connection.client.execute(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);
  }

  async find(...args: ConstructorParameters<typeof QueryBuilder<T["columns"]>>) {
    const { clause, values } = new QueryBuilder(...args);
    const query = `SELECT * FROM ${this._path} ${clause}`;
    const [rows] = await this._connection.client.execute<(T["columns"] & RowDataPacket)[]>(query, values);
    return rows;
  }

  async update(filters: QueryFilters<T["columns"]>) {
    const { clause, values } = new QueryBuilder(filters);
    const query = `SELECT * FROM ${this._path} ${clause}`;
  }

  async delete(filters: QueryFilters<T["columns"]>) {
    const { clause, values } = new QueryBuilder(filters);
    const query = `DELETE FROM ${this._path} ${clause}`;
    const [rows] = await this._connection.client.execute<ResultSetHeader>(query, values);
    return rows;
  }
}
