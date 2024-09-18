import type { ConnectionClient } from "../connection";
import type { DatabaseType, DatabaseName } from "../database";
import type { Optional } from "@repo/utils";
import type { AnyAI } from "@singlestore/ai";
import type { CreateChatCompletionResult } from "@singlestore/ai/chat-completions";
import type { FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { type ColumnType, type AddColumnSchema, ColumnManager, Column, type ColumnName } from "../column";
import {
  type JoinClause,
  type SelectClause,
  type QueryBuilderParams,
  type ExtractSelectedQueryColumns,
  QueryBuilder,
  type WhereClause,
} from "../query";

export type TableName = string;

export interface TableType extends Record<ColumnName, ColumnType> {}

export interface TableSchema<TName extends TableName, TType extends TableType> {
  name: TName;
  columns: {
    [K in keyof TType]: Omit<AddColumnSchema, "name">;
  };
  primaryKeys: string[];
  fulltextKeys: string[];
  clauses: string[];
}

export interface CreateTableSchema<TName extends TableName, TType extends TableType>
  extends Optional<TableSchema<TName, TType>, "primaryKeys" | "fulltextKeys" | "clauses"> {}

export interface TableInfo<TName extends TableName> {
  name: TName;
}

export interface TableInfoExtended<TName extends TableName> extends TableInfo<TName> {
  tableType: string;
  distributed: boolean;
  storageType: string;
}

export type TableColumnName<TType extends TableType> = Extract<keyof TType, string>;

export type VectorScoreKey = "v_score";

export class Table<
  TName extends TableName,
  TType extends TableType,
  TDatabaseType extends DatabaseType,
  TAI extends AnyAI | undefined,
> {
  private _path: string;
  vScoreKey: VectorScoreKey = "v_score";
  column: ColumnManager<TName, TType, TDatabaseType["name"]>;

  constructor(
    private _client: ConnectionClient,
    public name: TName,
    public databaseName: TDatabaseType["name"],
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

  static schemaToClauses(schema: CreateTableSchema<TableName, TableType>): string {
    const clauses: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return Column.schemaToClauses({ ...schema, name });
      }),
    ];

    if (schema.primaryKeys?.length) clauses.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) clauses.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);

    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(", ");
  }

  static normalizeInfo<
    TName extends TableName,
    TExtended extends boolean,
    _ReturnType = TExtended extends true ? TableInfoExtended<TName> : TableInfo<TName>,
  >(info: any, extended?: TExtended): _ReturnType {
    const name = info[Object.keys(info).find((key) => key.startsWith("Tables_in_")) as string];
    if (!extended) return { name } as _ReturnType;

    return {
      name,
      tableType: info.Table_type,
      distributed: !!info.distributed,
      storageType: info.Storage_type,
    } as _ReturnType;
  }

  static async drop<TName extends TableName, TDatabaseName extends DatabaseName>(
    client: ConnectionClient,
    databaseName: TDatabaseName,
    name: TName,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${databaseName}.${name}
    `);
  }

  static async truncate<TName extends TableName, TDatabaseName extends DatabaseName>(
    client: ConnectionClient,
    databaseName: TDatabaseName,
    tableName: TName,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      TRUNCATE TABLE ${databaseName}.${tableName}
    `);
  }

  static async rename<TName extends TableName, TDatabaseName extends DatabaseName>(
    client: ConnectionClient,
    databaseName: TDatabaseName,
    name: TName,
    newName: TableName,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${name} RENAME TO ${newName}
    `);
  }

  async drop() {
    return Table.drop(this._client, this.databaseName, this.name);
  }

  async showInfo<TExtended extends boolean = false>(extended?: TExtended) {
    const clauses = [`SHOW TABLES IN ${this.databaseName}`];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._client.query<any[]>(clauses.join(" "));
    return Table.normalizeInfo<TName, TExtended>(rows[0], extended);
  }

  async showColumnsInfo() {
    const [rows] = await this._client.query<any[]>(`SHOW COLUMNS IN ${this.name} IN ${this.databaseName}`);
    return rows.map((row) => Column.normalizeInfo<TableColumnName<TType>>(row));
  }

  async truncate() {
    return Table.truncate(this._client, this.databaseName, this.name);
  }

  async rename(...[newName, ...args]: Parameters<typeof Table.rename> extends [any, any, any, ...infer Rest] ? Rest : never) {
    const result = await Table.rename(this._client, this.databaseName, this.name, newName, ...args);
    this.name = newName as TName;
    return result;
  }

  async insert(values: Partial<TType> | Partial<TType>[]) {
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
    TJoinClauses extends JoinClause<TType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
  >(params?: QueryBuilderParams<TType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    type SelectedColumn = ExtractSelectedQueryColumns<TType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>;
    const queryBuilder = new QueryBuilder<TType, TDatabaseType>(this.databaseName, this.name);
    const query = queryBuilder.buildQuery(params);
    const [rows] = await this._client.execute<(SelectedColumn & RowDataPacket)[]>(query);
    return rows as SelectedColumn[];
  }

  async update(values: Partial<TType>, where: WhereClause<TType, TDatabaseType, any, any>) {
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);

    const columnAssignments = Object.keys(values)
      .map((key) => `${key} = ?`)
      .join(", ");

    const query = `UPDATE ${this._path} SET ${columnAssignments} ${_where}`;
    return this._client.execute<ResultSetHeader>(query, Object.values(values));
  }

  delete(where?: WhereClause<TType, TDatabaseType, any, any>) {
    if (!where) return this.truncate();
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);
    const query = `DELETE FROM ${this._path} ${_where}`;
    return this._client.execute<ResultSetHeader>(query);
  }

  async vectorSearch<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    TParams extends {
      prompt: string;
      vectorColumn: TableColumnName<TType>;
      embeddingParams?: TAI extends AnyAI ? Parameters<TAI["embeddings"]["create"]>[1] : never;
    },
  >(params: TParams, queryParams?: QueryBuilderParams<TType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    type SelectedColumn = ExtractSelectedQueryColumns<TType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>;
    type ResultColumn = SelectedColumn & { [K in VectorScoreKey]: number };

    const clauses = new QueryBuilder<TType, TDatabaseType>(this.databaseName, this.name).buildClauses(queryParams);
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
    TJoinClauses extends JoinClause<TType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    TParams extends Parameters<this["vectorSearch"]>[0] &
      (TAI extends AnyAI ? Parameters<TAI["chatCompletions"]["create"]>[0] : never) & { template?: string },
  >(
    params: TParams,
    queryParams?: QueryBuilderParams<TType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>,
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
