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
    await connection.client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${dbName}.${schema.name} (${clauses})
    `);
    return new WorkspaceTable<T>(connection, dbName, schema.name);
  }

  static drop(connection: WorkspaceConnection, dbName: string, name: WorkspaceTableSchema["name"]) {
    return connection.client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${dbName}.${name}
    `);
  }

  drop() {
    return WorkspaceTable.drop(this._connection, this._dbName, this.name);
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

  truncate() {
    return this._connection.client.execute<ResultSetHeader>(`\
      TRUNCATE TABLE ${this._path}
    `);
  }

  rename(newName: WorkspaceTableSchema["name"]) {
    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);
  }

  select(...args: ConstructorParameters<typeof QueryBuilder<T["columns"]>>) {
    const { columns, clauses, values } = new QueryBuilder(...args);
    const query = `SELECT ${columns} FROM ${this._path} ${Object.values(clauses).join(" ")}`;
    return this._connection.client.execute<(T["columns"] & RowDataPacket)[]>(query, values);
  }

  update(set: Partial<T["columns"]>, filters: QueryFilters<T["columns"]>) {
    const { clauses, values } = new QueryBuilder(filters);
    const setAssignment = QueryBuilder.toColumnValueAssignment(set);
    const query = `UPDATE ${this._path} SET ${setAssignment.columns} ${Object.values(clauses).join(" ")}`;
    return this._connection.client.execute<ResultSetHeader>(query, [...setAssignment.values, ...values]);
  }

  delete(filters: QueryFilters<T["columns"]>) {
    const { clauses, values } = new QueryBuilder(filters);
    const query = `DELETE FROM ${this._path} ${Object.values(clauses).join(" ")}`;
    return this._connection.client.execute<ResultSetHeader>(query, values);
  }
}
