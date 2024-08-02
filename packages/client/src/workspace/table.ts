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
  vScoreKey = "v_score";

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

  column(name: keyof T["columns"] | (string & {})) {
    return new WorkspaceColumn(this._connection, this.databaseName, this.name, name as string);
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

  async rename(newName: string) {
    const result = await this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);

    this.name = newName;
    this._path = [this.databaseName, newName].join(".");

    return result;
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

  async select<U extends QueryBuilderArgs<T["columns"]>>(...args: U) {
    type Options = ExtractQueryOptions<U>;
    type SelectedColumns = ExtractQueryColumns<T["columns"], Options> & { v_score: number };
    const { columns, clause, values } = new QueryBuilder(...args);
    const query = `SELECT ${columns} FROM ${this._path} ${clause}`;
    const result = await this._connection.client.execute<(SelectedColumns & RowDataPacket)[]>(query, values);
    return result[0];
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
    let orderByClause = `ORDER BY ${this.vScoreKey} DESC`;

    if (clauses.orderBy) {
      if (clauses.orderBy.includes(this.vScoreKey)) {
        orderByClause = clauses.orderBy;
      } else {
        orderByClause += clauses.orderBy.replace(/^ORDER BY /, ", ");
      }
    }

    const query = `\
      SET @promptEmbedding = '${JSON.stringify(promptEmbedding)}' :> vector(${promptEmbedding.length}) :> blob;
      SELECT ${[columns, `${search.vColumn} <*> @promptEmbedding AS ${this.vScoreKey}`].join(", ")}
      FROM ${this._path}
      ${[clauses.where, clauses.groupBy, orderByClause, clauses.limit].join(" ")}
    `;

    const result = await this._connection.client.execute<[any, (SelectedColumns & RowDataPacket)[]]>(query, values);
    return result[0][1];
  }

  async createChatCompletion<
    U extends QueryBuilderArgs<_S>,
    _S extends QuerySchema = T["columns"] & { v_score: number },
    _O extends Parameters<AI["llm"]["createChatCompletion"]>[1] = Parameters<AI["llm"]["createChatCompletion"]>[1],
  >(
    ...[{ prompt, vColumn, template, systemRole, ...createChatCompletionOptions }, ...args]: [
      search: { prompt: string; vColumn: Extract<keyof T["columns"], string>; template?: string } & _O,
      ...U,
    ]
  ) {
    const _systemRole =
      systemRole ||
      `\
      You are a helpful assistant.\
      Answer the user's question based on the context provided.\
      If the context provided doesn't answer the question asked don't answer the user's question.\
      `;

    const _template = template || `The user asked: <question>\nThe most similar context: <context>`;
    const context = await this.vectorSearch<U, _S>({ prompt, vColumn }, ...args);
    const _prompt = _template.replace("<question>", prompt).replace("<context>", JSON.stringify(context));

    return this.ai.llm.createChatCompletion(_prompt, { ...createChatCompletionOptions, systemRole: _systemRole });
  }
}
