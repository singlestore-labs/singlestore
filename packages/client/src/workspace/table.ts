import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { AI } from "@singlestore/ai";
import { WorkspaceColumn, type WorkspaceColumnSchema, type WorkspaceColumnType } from "./column";
import { WorkspaceConnection } from "./connection";
import { QueryBuilder, type QueryBuilderArgs } from "../query/builder";
import type { QueryFilters } from "../query/filters/builder";
import type { ExtractQueryColumns, ExtractQueryOptions } from "../query/types";
import type { QuerySchema } from "../query/schema";

export interface WorkspaceTableType {
  columns: Record<string, WorkspaceColumnType>;
}

export interface WorkspaceTableSchema<T extends WorkspaceTableType> {
  name: string;
  columns: { [K in keyof T["columns"]]: Omit<WorkspaceColumnSchema, "name"> };
  primaryKeys?: string[];
  fulltextKeys?: string[];
  clauses?: string[];
}

export class WorkspaceTable<T extends WorkspaceTableType> {
  private _path: string;

  constructor(
    private _connection: WorkspaceConnection,
    public databaseName: string,
    public name: string,
    private _ai?: AI,
  ) {
    this._path = [databaseName, name].join(".");
  }

  private get ai() {
    if (!this._ai) {
      throw new Error("AI instance is undefined. Ensure ai is properly initialized before accessing.");
    }

    return this._ai;
  }

  static schemaToClauses(schema: WorkspaceTableSchema<any>) {
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
    databaseName: string,
    schema: WorkspaceTableSchema<T>,
    ai?: AI,
  ) {
    const clauses = WorkspaceTable.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${databaseName}.${schema.name} (${clauses})
    `);
    return new WorkspaceTable<T>(connection, databaseName, schema.name, ai);
  }

  static drop(connection: WorkspaceConnection, databaseName: string, name: string) {
    return connection.client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${databaseName}.${name}
    `);
  }

  drop() {
    return WorkspaceTable.drop(this._connection, this.databaseName, this.name);
  }

  column(name: Extract<keyof T["columns"], string>) {
    return new WorkspaceColumn(this._connection, this.databaseName, this.name, name);
  }

  addColumn(schema: WorkspaceColumnSchema) {
    return WorkspaceColumn.add(this._connection, this.databaseName, this.name, schema);
  }

  dropColumn(name: ({} & string) | Extract<keyof T["columns"], string>) {
    return WorkspaceColumn.drop(this._connection, this.databaseName, this.name, name);
  }

  truncate() {
    return this._connection.client.execute<ResultSetHeader>(`\
      TRUNCATE TABLE ${this._path}
    `);
  }

  rename(newName: string) {
    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);
  }

  insert(data: Partial<T["columns"]> | Partial<T["columns"]>[]) {
    const _data = Array.isArray(data) ? data : [data];
    const keys = Object.keys(_data[0]!);
    const placeholders = `(${keys.map(() => "?").join(", ")})`;

    return Promise.all(
      _data.map((data) => {
        const query = `INSERT INTO ${this._path} (${keys}) VALUES ${placeholders}`;
        return this._connection.client.execute<ResultSetHeader>(query, Object.values(data));
      }),
    );
  }

  select<U extends QueryBuilderArgs<T["columns"]>>(...args: U) {
    type Options = ExtractQueryOptions<U>;
    type SelectedColumns = ExtractQueryColumns<T["columns"], Options> & { v_score: number };
    const { columns, clause, values } = new QueryBuilder(...args);
    const query = `SELECT ${columns} FROM ${this._path} ${clause}`;
    return this._connection.client.execute<(SelectedColumns & RowDataPacket)[]>(query, values);
  }

  update(data: Partial<T["columns"]>, filters: QueryFilters<T["columns"]>) {
    const { clause, values } = new QueryBuilder(filters);
    const columnAssignments = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const query = `UPDATE ${this._path} SET ${columnAssignments} ${clause}`;
    return this._connection.client.execute<ResultSetHeader>(query, [...Object.values(data), ...values]);
  }

  delete(filters: QueryFilters<T["columns"]>) {
    const { clause, values } = new QueryBuilder(filters);
    const query = `DELETE FROM ${this._path} ${clause}`;
    return this._connection.client.execute<ResultSetHeader>(query, values);
  }

  async vectorSearch<U extends QueryBuilderArgs<_S>, _S extends QuerySchema = T["columns"] & { v_score: number }>(
    ...[search, ...args]: [search: { prompt: string; vColumn: Extract<keyof T["columns"], string> }, ...U]
  ) {
    type Options = ExtractQueryOptions<U>;
    type SelectedColumns = ExtractQueryColumns<_S, Options> & { v_score: number };
    const { columns, clauses, values } = new QueryBuilder<_S>(...args);
    const promptEmbedding = (await this.ai.embeddings.create(search.prompt))[0] || [];
    const vScoreKey = "v_score";
    let orderByClause = `ORDER BY ${vScoreKey} DESC`;

    if (clauses.orderBy) {
      if (clauses.orderBy.includes(vScoreKey)) {
        orderByClause = clauses.orderBy;
      } else {
        orderByClause += clauses.orderBy.replace(/^ORDER BY /, ", ");
      }
    }

    const query = `\
      SET @promptEmbedding = '${JSON.stringify(promptEmbedding)}' :> vector(${promptEmbedding.length}) :> blob;
      SELECT ${[columns, `${search.vColumn} <*> @promptEmbedding AS ${vScoreKey}`].join(", ")}
      FROM ${this._path}
      ${[clauses.where, clauses.groupBy, orderByClause, clauses.limit].join(" ")}
    `;

    const result = await this._connection.client.execute<[any, (SelectedColumns & RowDataPacket)[]]>(query, values);
    return result[0][1];
  }
}
