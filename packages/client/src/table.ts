import type { Connection } from "./connection";
import type { QueryFilters } from "./query/filters/builder";
import type { QuerySchema } from "./query/schema";
import type { ExtractQueryColumns, ExtractQueryOptions } from "./query/types";
import type { AI } from "@singlestore/ai";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { Column, type ColumnSchema, type ColumnType } from "./column";
import { QueryBuilder, type QueryBuilderArgs } from "./query/builder";

export interface TableType {
  columns: Record<string, ColumnType>;
}

export interface TableSchema<T extends TableType> {
  name: string;
  columns: { [K in keyof T["columns"]]: Omit<ColumnSchema, "name"> };
  primaryKeys?: string[];
  fulltextKeys?: string[];
  clauses?: string[];
}

export interface TableInfo<T extends string> {
  name: T;
}

export interface TableInfoExtended<T extends string> extends TableInfo<T> {
  tableType: string;
  distributed: boolean;
  storageType: string;
}

export type ExtractTableColumnName<T extends TableType> = Extract<keyof T["columns"], string>;

export type TableColumnName<T extends TableType> = ExtractTableColumnName<T> | (string & {});

export type InsertTableValues<T extends TableType> = Partial<T["columns"]> | Partial<T["columns"]>[];

export type SelectTableArgs<T extends TableType> = QueryBuilderArgs<T["columns"]>;

export type UpdateTableValues<T extends TableType> = Partial<T["columns"]>;
export type UpdateTableFilters<T extends TableType> = QueryFilters<T["columns"]>;

export type DeleteTableFilters<T extends TableType> = QueryFilters<T["columns"]>;

export class Table<T extends TableType = any, U extends AI = AI> {
  private _path: string;
  vScoreKey = "v_score" as const;

  constructor(
    private _connection: Connection,
    public databaseName: string,
    public name: string,
    private _ai?: U,
  ) {
    this._path = [databaseName, name].join(".");
  }

  private get ai() {
    if (!this._ai) {
      throw new Error("AI instance is undefined. Ensure ai is properly initialized before accessing.");
    }

    return this._ai;
  }

  static normalizeInfo<T extends string, U extends boolean>(info: any, extended?: U) {
    type Result<T extends string, U extends boolean> = U extends true ? TableInfoExtended<T> : TableInfo<T>;

    const name = info[Object.keys(info).find((key) => key.startsWith("Tables_in_")) as string];
    if (!extended) return { name } as Result<T, U>;

    return {
      name,
      tableType: info.Table_type,
      distributed: !!info.distributed,
      storageType: info.Storage_type,
    } as Result<T, U>;
  }

  static schemaToClauses(schema: TableSchema<any>) {
    const clauses: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return Column.schemaToClauses({ ...schema, name });
      }),
    ];
    if (schema.primaryKeys?.length) clauses.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) clauses.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(", ");
  }

  static async create<T extends TableType = any, U extends AI = AI>(
    connection: Connection,
    databaseName: string,
    schema: TableSchema<T>,
    ai?: U,
  ) {
    const clauses = Table.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${databaseName}.${schema.name} (${clauses})
    `);
    return new Table<T, U>(connection, databaseName, schema.name, ai);
  }

  static drop(connection: Connection, databaseName: string, name: string) {
    return connection.client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${databaseName}.${name}
    `);
  }

  async showInfo<T extends boolean>(extended?: T) {
    const clauses = [`SHOW TABLES IN ${this.databaseName}`];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Table.normalizeInfo<string, T>(rows[0], extended);
  }

  drop() {
    return Table.drop(this._connection, this.databaseName, this.name);
  }

  column(name: TableColumnName<T>) {
    return new Column(this._connection, this.databaseName, this.name, name as string);
  }

  async showColumnsInfo() {
    const [rows] = await this._connection.client.query<any[]>(`SHOW COLUMNS IN ${this.name} IN ${this.databaseName}`);
    return rows.map((row) => Column.normalizeInfo<ExtractTableColumnName<T>>(row));
  }

  addColumn(schema: ColumnSchema) {
    return Column.add(this._connection, this.databaseName, this.name, schema);
  }

  dropColumn(name: TableColumnName<T>) {
    return Column.drop(this._connection, this.databaseName, this.name, name);
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

  insert(values: InsertTableValues<T>) {
    const _values = Array.isArray(values) ? values : [values];
    const keys = Object.keys(_values[0]!);
    const placeholders = `(${keys.map(() => "?").join(", ")})`;

    return Promise.all(
      _values.map((data) => {
        const query = `INSERT INTO ${this._path} (${keys}) VALUES ${placeholders}`;
        return this._connection.client.execute<ResultSetHeader>(query, Object.values(data));
      }),
    );
  }

  async select<U extends SelectTableArgs<T>>(...args: U) {
    type Options = ExtractQueryOptions<U>;
    type SelectedColumns = ExtractQueryColumns<T["columns"], Options>;
    const { columns, clause, values } = new QueryBuilder(...args);
    const query = `SELECT ${columns} FROM ${this._path} ${clause}`;
    const result = await this._connection.client.execute<(SelectedColumns & RowDataPacket)[]>(query, values);
    return result[0];
  }

  update(values: UpdateTableValues<T>, filters: UpdateTableFilters<T>) {
    const { clause, values: _values } = new QueryBuilder(filters);
    const columnAssignments = Object.keys(values)
      .map((key) => `${key} = ?`)
      .join(", ");
    const query = `UPDATE ${this._path} SET ${columnAssignments} ${clause}`;
    return this._connection.client.execute<ResultSetHeader>(query, [...Object.values(values), ..._values]);
  }

  delete(filters?: DeleteTableFilters<T>) {
    if (!filters) return this.truncate();

    const { clause, values } = new QueryBuilder(filters);
    const query = `DELETE FROM ${this._path} ${clause}`;
    return this._connection.client.execute<ResultSetHeader>(query, values);
  }

  async vectorSearch<U extends QueryBuilderArgs<_S>, _S extends QuerySchema = T["columns"] & { v_score: number }>(
    ...[search, ...args]: [search: { prompt: string; vectorColumn: ExtractTableColumnName<T> }, ...U]
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
      SELECT ${[columns, `${search.vectorColumn} <*> @promptEmbedding AS ${this.vScoreKey}`].join(", ")}
      FROM ${this._path}
      ${[clauses.where, clauses.groupBy, orderByClause, clauses.limit].join(" ")}
    `;

    const result = await this._connection.client.execute<[any, (SelectedColumns & RowDataPacket)[]]>(query, values);
    return result[0][1];
  }

  async createChatCompletion<
    Q extends QueryBuilderArgs<_S>,
    _S extends QuerySchema = T["columns"] & { v_score: number },
    _O extends Exclude<Parameters<U["chatCompletions"]["create"]>[1], undefined> = Exclude<
      Parameters<U["chatCompletions"]["create"]>[1],
      undefined
    >,
  >(
    ...[{ prompt, vectorColumn, template, systemRole, ...createChatCompletionOptions }, ...args]: [
      search: { prompt: string; vectorColumn: ExtractTableColumnName<T>; template?: string } & _O,
      ...Q,
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
    const context = await this.vectorSearch<Q, _S>({ prompt, vectorColumn }, ...args);
    const _prompt = _template.replace("<question>", prompt).replace("<context>", JSON.stringify(context));

    return this.ai.chatCompletions.create(_prompt, { ...createChatCompletionOptions, systemRole: _systemRole });
  }
}
