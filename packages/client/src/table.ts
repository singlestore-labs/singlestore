import type { DatabaseType } from "./database";
import type { AnyAI, CreateChatCompletionResult } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { Column, type ColumnInfo, type ColumnSchema, type ColumnType } from "./column";
import { Connection } from "./connection";
import {
  type ExtractSelectedQueryColumns,
  QueryBuilder,
  type WhereClause,
  type QueryBuilderParams,
  JoinClause,
  SelectClause,
} from "./query/builder";

export interface TableType {
  name: string;
  columns: Record<string, ColumnType>;
}

export interface TableSchema<TType extends TableType> {
  name: TType["name"];
  columns: { [K in keyof TType["columns"]]: Omit<ColumnSchema, "name"> };
  primaryKeys?: string[];
  fulltextKeys?: string[];
  clauses?: string[];
}

export interface TableInfo<TName extends string> {
  name: TName;
}

export interface TableInfoExtended<TName extends string> extends TableInfo<TName> {
  tableType: string;
  distributed: boolean;
  storageType: string;
}

export type TableColumnName<TType extends TableType> = Extract<keyof TType["columns"], string>;

type VectorScoreKey = "v_score";

export class Table<
  TTableType extends TableType = TableType,
  TDatabaseType extends DatabaseType = DatabaseType,
  TAi extends AnyAI | undefined = undefined,
> {
  private _path: string;
  vScoreKey: VectorScoreKey = "v_score";

  constructor(
    private _connection: Connection,
    public databaseName: string,
    public name: TTableType["name"],
    private _ai?: TAi,
  ) {
    this._path = [databaseName, name].join(".");
  }

  private get ai() {
    if (!this._ai) {
      throw new Error("AnyAI instance is undefined. Ensure ai is properly initialized before accessing.");
    }

    return this._ai;
  }

  static normalizeInfo<TName extends string, TExtended extends boolean>(
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

  static schemaToClauses(schema: TableSchema<TableType>): string {
    const clauses: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return Column.schemaToClauses({ ...schema, name });
      }),
    ];

    if (schema.primaryKeys?.length) clauses.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) clauses.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);

    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(", ");
  }

  static async create<
    TType extends TableType = TableType,
    TDatabaseType extends DatabaseType = DatabaseType,
    TAi extends AnyAI | undefined = undefined,
  >(
    connection: Connection,
    databaseName: string,
    schema: TableSchema<TType>,
    ai?: TAi,
  ): Promise<Table<TType, TDatabaseType, TAi>> {
    const clauses = Table.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${databaseName}.${schema.name} (${clauses})
    `);

    return new Table(connection, databaseName, schema.name, ai);
  }

  static drop(connection: Connection, databaseName: string, name: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    return connection.client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${databaseName}.${name}
    `);
  }

  async showInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<TExtended extends true ? TableInfoExtended<string> : TableInfo<string>> {
    const clauses = [`SHOW TABLES IN ${this.databaseName}`];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Table.normalizeInfo<string, TExtended>(rows[0], extended);
  }

  drop(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Table.drop(this._connection, this.databaseName, this.name);
  }

  column(name: TableColumnName<TTableType> | (string & {})): Column {
    return new Column(this._connection, this.databaseName, this.name, name as string);
  }

  async showColumnsInfo(): Promise<ColumnInfo<TableColumnName<TTableType>>[]> {
    const [rows] = await this._connection.client.query<any[]>(`SHOW COLUMNS IN ${this.name} IN ${this.databaseName}`);
    return rows.map((row) => Column.normalizeInfo<TableColumnName<TTableType>>(row));
  }

  addColumn(schema: ColumnSchema): Promise<Column> {
    return Column.add(this._connection, this.databaseName, this.name, schema);
  }

  dropColumn(name: TableColumnName<TTableType> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Column.drop(this._connection, this.databaseName, this.name, name);
  }

  truncate(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return this._connection.client.execute<ResultSetHeader>(`\
      TRUNCATE TABLE ${this._path}
    `);
  }

  async rename(newName: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);

    this.name = newName as any;
    this._path = [this.databaseName, newName].join(".");

    return result;
  }

  insert(
    values: Partial<TTableType["columns"]> | Partial<TTableType["columns"]>[],
  ): Promise<[ResultSetHeader, FieldPacket[]][]> {
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

  async find<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
  >(params?: QueryBuilderParams<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    type SelectedColumn = ExtractSelectedQueryColumns<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>;
    const queryBuilder = new QueryBuilder<TTableType, TDatabaseType>(this.databaseName, this.name);
    const query = queryBuilder.buildQuery(params);
    const [rows] = await this._connection.client.execute<(SelectedColumn & RowDataPacket)[]>(query);
    return rows;
  }

  update(
    values: Partial<TTableType["columns"]>,
    where: WhereClause<TTableType, TDatabaseType, any, any>,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);

    const columnAssignments = Object.keys(values)
      .map((key) => `${key} = ?`)
      .join(", ");

    const query = `UPDATE ${this._path} SET ${columnAssignments} ${_where}`;
    return this._connection.client.execute<ResultSetHeader>(query, Object.values(values));
  }

  delete(where?: WhereClause<TTableType, TDatabaseType, any, any>): Promise<[ResultSetHeader, FieldPacket[]]> {
    if (!where) return this.truncate();
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);
    const query = `DELETE FROM ${this._path} ${_where}`;
    return this._connection.client.execute<ResultSetHeader>(query);
  }

  async vectorSearch<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    TParams extends {
      prompt: string;
      vectorColumn: TableColumnName<TTableType>;
      embeddingParams?: TAi extends AnyAI ? Parameters<TAi["embeddings"]["create"]>[1] : never;
    },
  >(params: TParams, queryParams?: QueryBuilderParams<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    type SelectedColumn = ExtractSelectedQueryColumns<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>;
    type ResultColumn = SelectedColumn & { [K in VectorScoreKey]: number };

    const clauses = new QueryBuilder<TTableType, TDatabaseType>(this.databaseName, this.name).buildClauses(queryParams);
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

    const [rows] = await this._connection.client.execute<[any, (ResultColumn & RowDataPacket)[]]>(query);
    return rows[1];
  }

  async createChatCompletion<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    TParams extends Parameters<this["vectorSearch"]>[0] &
      (TAi extends AnyAI ? Parameters<TAi["chatCompletions"]["create"]>[0] : never) & { template?: string },
  >(
    params: TParams,
    queryParams?: QueryBuilderParams<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>,
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
