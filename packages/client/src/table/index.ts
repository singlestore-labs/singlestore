import type { ConnectionClient } from "../connection";
import type { DatabaseSchema } from "../database";
import type { AnyAI, CreateChatCompletionResult } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { Column, type ColumnSchema } from "../column";
import { ColumnManager } from "../column/manager";
import {
  type ExtractSelectedQueryColumns,
  type JoinClause,
  QueryBuilder,
  type QueryBuilderParams,
  type SelectClause,
  type WhereClause,
} from "../query/builder";

export interface TableSchema {
  name: string;
  columns: Record<string, ColumnSchema>;
  primaryKeys: string[];
  fulltextKeys: string[];
  clauses: string[];
}

export interface TableInfo<TName extends TableSchema["name"]> {
  name: TName;
}

export interface TableInfoExtended<TName extends TableSchema["name"]> extends TableInfo<TName> {
  tableType: string;
  distributed: boolean;
  storageType: string;
}

export type TableColumnName<TSchema extends TableSchema> = Extract<keyof TSchema["columns"], string>;

export type VectorScoreKey = "v_score";

export class Table<TSchema extends TableSchema, TDatabaseSchema extends DatabaseSchema, TAI extends AnyAI | undefined> {
  private _path: string;
  vScoreKey: VectorScoreKey = "v_score";
  column: ColumnManager<TSchema, TDatabaseSchema["name"]>;

  constructor(
    private _client: ConnectionClient,
    public databaseName: TDatabaseSchema["name"],
    public name: TSchema["name"],
    private _ai?: TAI,
  ) {
    this._path = [databaseName, name].join(".");
    this.column = new ColumnManager(this._client, this.name, this.databaseName);
  }

  private get ai() {
    if (!this._ai) {
      throw new Error("AI instance is undefined. Ensure ai is properly initialized before accessing.");
    }

    return this._ai;
  }

  static schemaToClauses(schema: TableSchema): string {
    const clauses: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return Column.schemaToClauses({ ...schema, name });
      }),
    ];

    if (schema.primaryKeys?.length) clauses.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) clauses.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);

    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(", ");
  }

  static normalizeInfo<TName extends TableSchema["name"], TExtended extends boolean>(
    info: any,
    extended?: TExtended,
  ): TExtended extends true ? TableInfoExtended<TName> : TableInfo<TName> {
    const name = info[Object.keys(info).find((key) => key.startsWith("Tables_in_")) as string];
    if (!extended) return { name } as TExtended extends true ? TableInfoExtended<TName> : TableInfo<TName>;

    return {
      name,
      tableType: info.Table_type,
      distributed: !!info.distributed,
      storageType: info.Storage_type,
    } as TExtended extends true ? TableInfoExtended<TName> : TableInfo<TName>;
  }

  static async drop(
    client: ConnectionClient,
    databaseName: DatabaseSchema["name"],
    name: TableSchema["name"],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${databaseName}.${name}
    `);
  }

  static async truncate(
    client: ConnectionClient,
    databaseName: DatabaseSchema["name"],
    tableName: TableSchema["name"],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      TRUNCATE TABLE ${databaseName}.${tableName}
    `);
  }

  static async rename(
    client: ConnectionClient,
    databaseName: DatabaseSchema["name"],
    tableName: TableSchema["name"],
    newName: TableSchema["name"],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} RENAME TO ${newName}
    `);
  }

  async drop() {
    return Table.drop(this._client, this.databaseName, this.name);
  }

  async showInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<TExtended extends true ? TableInfoExtended<string> : TableInfo<string>> {
    const clauses = [`SHOW TABLES IN ${this.databaseName}`];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._client.query<any[]>(clauses.join(" "));
    return Table.normalizeInfo<string, TExtended>(rows[0], extended);
  }

  async truncate() {
    return Table.truncate(this._client, this.databaseName, this.name);
  }

  async rename(...args: Parameters<typeof Table.rename> extends [any, any, any, ...infer Rest] ? Rest : never) {
    return Table.rename(this._client, this.databaseName, this.name, ...args);
  }

  async insert(
    values: Partial<TSchema["columns"]> | Partial<TSchema["columns"]>[],
  ): Promise<[ResultSetHeader, FieldPacket[]][]> {
    const _values = Array.isArray(values) ? values : [values];
    const keys = Object.keys(_values[0]!);
    const placeholders = `(${keys.map(() => "?").join(", ")})`;

    return Promise.all(
      _values.map((data) => {
        const query = `INSERT INTO ${this._path} (${keys}) VALUES ${placeholders}`;
        return this._client.execute<ResultSetHeader>(query, Object.values(data));
      }),
    );
  }

  async find<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TSchema, TDatabaseSchema, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses>,
  >(params?: QueryBuilderParams<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    type SelectedColumn = ExtractSelectedQueryColumns<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses, TSelectClause>;
    const queryBuilder = new QueryBuilder<TSchema, TDatabaseSchema>(this.databaseName, this.name);
    const query = queryBuilder.buildQuery(params);
    const [rows] = await this._client.execute<(SelectedColumn & RowDataPacket)[]>(query);
    return rows as SelectedColumn[];
  }

  async update(
    values: Partial<TSchema["columns"]>,
    where: WhereClause<TSchema, TDatabaseSchema, any, any>,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);

    const columnAssignments = Object.keys(values)
      .map((key) => `${key} = ?`)
      .join(", ");

    const query = `UPDATE ${this._path} SET ${columnAssignments} ${_where}`;
    return this._client.execute<ResultSetHeader>(query, Object.values(values));
  }

  delete(where?: WhereClause<TSchema, TDatabaseSchema, any, any>): Promise<[ResultSetHeader, FieldPacket[]]> {
    if (!where) return this.truncate();
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);
    const query = `DELETE FROM ${this._path} ${_where}`;
    return this._client.execute<ResultSetHeader>(query);
  }

  async vectorSearch<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TSchema, TDatabaseSchema, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses>,
    TParams extends {
      prompt: string;
      vectorColumn: TableColumnName<TSchema>;
      embeddingParams?: TAI extends AnyAI ? Parameters<TAI["embeddings"]["create"]>[1] : never;
    },
  >(params: TParams, queryParams?: QueryBuilderParams<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    type SelectedColumn = ExtractSelectedQueryColumns<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses, TSelectClause>;
    type ResultColumn = SelectedColumn & { [K in VectorScoreKey]: number };

    const clauses = new QueryBuilder<TSchema, TDatabaseSchema>(this.databaseName, this.name).buildClauses(queryParams);
    const promptEmbedding = (await this.ai.embeddings.create(params.prompt, params.embeddingParams))[0] || [];
    let orderByClause = `ORDER BY ${this.vScoreKey} DESC`;

    if (clauses.orderBy) {
      orderByClause += clauses.orderBy.replace(/^ORDER BY /, ", ");
    }

    const query = `\
      SET @promptEmbedding = '${JSON.stringify(promptEmbedding)}' :> vector(${promptEmbedding.length}) :> blob;
      ${[clauses.select, `${params.vectorColumn} <*> @promptEmbedding AS ${this.vScoreKey}`].join(", ")}
      FROM ${this._path}
      ${[clauses.where, clauses.groupBy, orderByClause, clauses.limit, clauses.offset].join(" ")}
    `;

    const [rows] = await this._client.execute<[any, (ResultColumn & RowDataPacket)[]]>(query);
    return rows[1] as ResultColumn[];
  }

  async createChatCompletion<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TSchema, TDatabaseSchema, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses>,
    TParams extends Parameters<this["vectorSearch"]>[0] &
      (TAI extends AnyAI ? Parameters<TAI["chatCompletions"]["create"]>[0] : never) & { template?: string },
  >(
    params: TParams,
    queryParams?: QueryBuilderParams<TSchema, TDatabaseSchema, TJoinClauseAs, TJoinClauses, TSelectClause>,
  ): Promise<CreateChatCompletionResult<TParams["stream"]>> {
    const { prompt, systemRole, template, vectorColumn, embeddingParams, ...createChatCompletionParams } = params;

    const _systemRole =
      systemRole ??
      `\
      You are a helpful assistant.\
      Answer the user's question based on the context provided.\
      If the context provided doesn't answer the question asked don't answer the user's question.\
      `;

    const _template = template ?? `The user asked: <question>\nThe most similar context: <context>`;
    const context = prompt ? await this.vectorSearch({ prompt, vectorColumn, embeddingParams }, queryParams) : "";
    const _prompt = _template.replace("<question>", prompt).replace("<context>", JSON.stringify(context));
    return (await this.ai.chatCompletions.create({
      ...createChatCompletionParams,
      prompt: _prompt,
      systemRole: _systemRole,
    })) as CreateChatCompletionResult<TParams["stream"]>;
  }
}
