import type { DatabaseType } from "./database";
import type { AnyAI, CreateChatCompletionResult } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { Column, type ColumnInfo, type ColumnSchema, type ColumnType } from "./column";
import { Connection } from "./connection";
import {
  type ExtractQuerySelectedColumn,
  QueryBuilder,
  type WhereClause,
  type QueryBuilderParams,
  type JoinClauseRecord,
} from "./query/builder";

/**
 * Interface representing the structure of a table type, including its columns.
 *
 * @property {Record<string, ColumnType>} columns - A record where the keys are column names and the values are their respective column types.
 */
export interface TableType {
  columns: Record<string, ColumnType>;
}

/**
 * Interface representing the schema of a table, including its columns, primary keys, full-text keys, and additional clauses.
 *
 * @typeParam TName - A type extending `string` that defines the name of the table.
 * @typeParam TType - A type extending `TableType` that defines the structure of the table.
 *
 * @property {TName} name - The name of the table.
 * @property {Object} columns - An object where each key is a column name and each value is the schema of that column, excluding the name.
 * @property {string[]} [primaryKeys] - An optional array of column names that form the primary key.
 * @property {string[]} [fulltextKeys] - An optional array of column names that form full-text keys.
 * @property {string[]} [clauses] - An optional array of additional SQL clauses for the table definition.
 */
export interface TableSchema<TName extends string, TType extends TableType> {
  name: TName;
  columns: { [K in keyof TType["columns"]]: Omit<ColumnSchema, "name"> };
  primaryKeys?: string[];
  fulltextKeys?: string[];
  clauses?: string[];
}

/**
 * Interface representing basic information about a table.
 *
 * @typeParam TName - A string literal representing the table name.
 *
 * @property {TName} name - The name of the table.
 */
export interface TableInfo<TName extends string> {
  name: TName;
}

/**
 * Interface extending `TableInfo` to include additional details about the table's type, distribution, and storage.
 *
 * @typeParam TName - A string literal representing the table name.
 *
 * @property {string} tableType - The type of the table.
 * @property {boolean} distributed - Indicates whether the table is distributed.
 * @property {string} storageType - The storage type of the table.
 */
export interface TableInfoExtended<TName extends string> extends TableInfo<TName> {
  tableType: string;
  distributed: boolean;
  storageType: string;
}

/**
 * Type representing the name of a column within a specific table type.
 *
 * @typeParam TType - The type of the table.
 */
export type TableColumnName<TType extends TableType> = Extract<keyof TType["columns"], string>;

/**
 * Type representing a key used for vector scoring in vector search queries.
 */
type VectorScoreKey = "v_score";

/**
 * Class representing a table in SingleStore, providing methods to manage its columns, query data, and perform vector search.
 *
 * @typeParam TDatabaseType - The type of the database, which extends `DatabaseType`.
 * @typeParam TType - The type of the table, which extends `TableType`.
 * @typeParam TAi - The type of AI functionalities integrated with the table, which can be undefined.
 *
 * @property {Connection} _connection - The connection to the database containing the table.
 * @property {string} databaseName - The name of the database containing the table.
 * @property {string} name - The name of the table.
 * @property {U} [ai] - Optional AI functionalities associated with the table.
 * @property {string} _path - The full path of the table, composed of the database name and table name.
 * @property {VectorScoreKey} vScoreKey - The key used for vector scoring in vector search queries, defaulting to `"v_score"`.
 */
export class Table<
  TName extends string = string,
  TType extends TableType = TableType,
  TDatabaseType extends DatabaseType = DatabaseType,
  TAi extends AnyAI | undefined = undefined,
> {
  private _path: string;
  vScoreKey: VectorScoreKey = "v_score";

  constructor(
    private _connection: Connection,
    public databaseName: string,
    public name: TName,
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

  /**
   * Normalizes raw table information into a structured object.
   *
   * @typeParam TName - A string literal representing the table name.
   * @typeParam TExtended - A boolean indicating whether extended information is requested.
   *
   * @param {any} info - The raw table information to normalize.
   * @param {TExtended} [extended] - Whether to include extended information.
   *
   * @returns {TExtended extends true ? TableInfoExtended<TName> : TableInfo<TName>} A structured object containing normalized table information.
   */
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

  /**
   * Converts a `TableSchema` object into an SQL table definition string.
   *
   * @param {TableSchema<any>} schema - The schema of the table to be converted.
   *
   * @returns {string} An SQL string representing the table definition.
   */
  static schemaToClauses(schema: TableSchema<any, any>): string {
    const clauses: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return Column.schemaToClauses({ ...schema, name });
      }),
    ];

    if (schema.primaryKeys?.length) clauses.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) clauses.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);

    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(", ");
  }

  /**
   * Creates a new table in the database with the specified schema.
   *
   * @typeParam TName - The name of the table, which extends `string`.
   * @typeParam TType - The type of the table, which extends `TableType`.
   * @typeParam TDatabaseType - The type of the database, which extends `DatabaseType`.
   * @typeParam TAi - The type of AI functionalities integrated with the table, which can be undefined.
   *
   * @param {Connection} connection - The connection to the database.
   * @param {string} databaseName - The name of the database where the table will be created.
   * @param {TableSchema<TType>} schema - The schema defining the structure of the table.
   * @param {TAi} [ai] - Optional AI functionalities to associate with the table.
   *
   * @returns {Promise<Table<TName, TType, TDatabaseType, TAi>>} A promise that resolves to the created `Table` instance.
   */
  static async create<
    TName extends string = string,
    TType extends TableType = TableType,
    TDatabaseType extends DatabaseType = DatabaseType,
    TAi extends AnyAI | undefined = undefined,
  >(
    connection: Connection,
    databaseName: string,
    schema: TableSchema<TName, TType>,
    ai?: TAi,
  ): Promise<Table<TName, TType, TDatabaseType, TAi>> {
    const clauses = Table.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${databaseName}.${schema.name} (${clauses})
    `);

    return new Table<TName, TType, TDatabaseType, TAi>(connection, databaseName, schema.name, ai);
  }

  /**
   * Drops an existing table from the database by name.
   *
   * @param {Connection} connection - The connection to the database.
   * @param {string} databaseName - The name of the database where the table is located.
   * @param {string} name - The name of the table to drop.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the table is dropped.
   */
  static drop(connection: Connection, databaseName: string, name: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    return connection.client.execute<ResultSetHeader>(`\
      DROP TABLE IF EXISTS ${databaseName}.${name}
    `);
  }

  /**
   * Retrieves information about the table, optionally including extended details.
   *
   * @typeParam TExtended - A boolean indicating whether extended information is requested.
   *
   * @param {TExtended} [extended] - Whether to include extended information.
   *
   * @returns {Promise<TExtended extends true ? TableInfoExtended<string> : TableInfo<string>>} A promise that resolves to the table information.
   */
  async showInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<TExtended extends true ? TableInfoExtended<string> : TableInfo<string>> {
    const clauses = [`SHOW TABLES IN ${this.databaseName}`];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Table.normalizeInfo<string, TExtended>(rows[0], extended);
  }

  /**
   * Drops the current table from the database.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the table is dropped.
   */
  drop(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Table.drop(this._connection, this.databaseName, this.name);
  }

  /**
   * Retrieves a `Column` instance representing a specific column in the table.
   *
   * @param {TableColumnName<TType> | (string & {})} name - The name of the column to retrieve.
   *
   * @returns {Column} A `Column` instance representing the specified column.
   */
  column(name: TableColumnName<TType> | (string & {})): Column {
    return new Column(this._connection, this.databaseName, this.name, name as string);
  }

  /**
   * Retrieves information about all columns in the table.
   *
   * @returns {Promise<ColumnInfo<TableColumnName<TType>>[]>} A promise that resolves to an array of column information objects.
   */
  async showColumnsInfo(): Promise<ColumnInfo<TableColumnName<TType>>[]> {
    const [rows] = await this._connection.client.query<any[]>(`SHOW COLUMNS IN ${this.name} IN ${this.databaseName}`);
    return rows.map((row) => Column.normalizeInfo<TableColumnName<TType>>(row));
  }

  /**
   * Adds a new column to the table with the specified schema.
   *
   * @param {ColumnSchema} schema - The schema defining the structure of the column to be added.
   *
   * @returns {Promise<Column>} A promise that resolves to the created `Column` instance.
   */
  addColumn(schema: ColumnSchema): Promise<Column> {
    return Column.add(this._connection, this.databaseName, this.name, schema);
  }

  /**
   * Drops a specific column from the table by name.
   *
   * @param {TableColumnName<TType> | (string & {})} name - The name of the column to drop.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the column is dropped.
   */
  dropColumn(name: TableColumnName<TType> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Column.drop(this._connection, this.databaseName, this.name, name);
  }

  /**
   * Truncates the table, removing all rows while keeping the table structure intact.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the table is truncated.
   */
  truncate(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return this._connection.client.execute<ResultSetHeader>(`\
      TRUNCATE TABLE ${this._path}
    `);
  }

  /**
   * Renames the current table to a new name.
   *
   * @param {string} newName - The new name for the table.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the table is renamed.
   */
  async rename(newName: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);

    this.name = newName as any;
    this._path = [this.databaseName, newName].join(".");

    return result;
  }

  /**
   * Inserts one or more rows into the table.
   *
   * @param {Partial<TType["columns"]> | Partial<TType["columns"]>[]} values - The values to insert into the table. Can be a single row or an array of rows.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]][]>} A promise that resolves to an array of `ResultSetHeader` objects for each inserted row.
   */
  insert(values: Partial<TType["columns"]> | Partial<TType["columns"]>[]): Promise<[ResultSetHeader, FieldPacket[]][]> {
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

  /**
   * Finds rows from the table based on the specified query arguments.
   *
   * @typeParam TParams - The type of the query builder arguments.
   *
   * @param {TParams} params - The arguments defining the query, including selected columns, filters, and other options.
   *
   * @returns {Promise<(ExtractQuerySelectedColumn<TType["columns"], TParams> & RowDataPacket)[]>} A promise that resolves to an array of selected rows.
   */
  async find<TJoinAs extends string, TJoin extends JoinClauseRecord<TName, TDatabaseType, TJoinAs>[] | undefined = undefined>(
    params?: QueryBuilderParams<TName, TDatabaseType, TJoin>,
  ) {
    type SelectedColumn = ExtractQuerySelectedColumn<TType["columns"], any>;
    const queryBuilder = new QueryBuilder<TName, TDatabaseType>(this.databaseName, this.name);
    const query = queryBuilder.buildQuery(params);
    const [rows] = await this._connection.client.execute<(SelectedColumn & RowDataPacket)[]>(query);
    return rows;
  }

  /**
   * Updates rows in the table based on the specified values and filters.
   *
   * @param {Partial<TType["columns"]>} values - The values to update in the table.
   * @param {WhereClause<TName, TDatabaseType>} where - The where clause to apply to the update query.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the update is complete.
   */
  update(
    values: Partial<TType["columns"]>,
    where: WhereClause<TName, TDatabaseType>,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);

    const columnAssignments = Object.keys(values)
      .map((key) => `${key} = ?`)
      .join(", ");

    const query = `UPDATE ${this._path} SET ${columnAssignments} ${_where}`;
    return this._connection.client.execute<ResultSetHeader>(query, Object.values(values));
  }

  /**
   * Deletes rows from the table based on the specified filters. If no filters are provided, the table is truncated.
   *
   * @param {WhereClause<TName, TDatabaseType>} [where] - The where clause to apply to the delete query.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the delete operation is complete.
   */
  delete(where?: WhereClause<TName, TDatabaseType>): Promise<[ResultSetHeader, FieldPacket[]]> {
    if (!where) return this.truncate();
    const _where = new QueryBuilder(this.databaseName, this.name).buildWhereClause(where);
    const query = `DELETE FROM ${this._path} ${_where}`;
    return this._connection.client.execute<ResultSetHeader>(query);
  }

  /**
   * Performs a vector search on the table using a prompt and a specified vector column.
   *
   * This method generates an embedding for the provided prompt, then performs a vector similarity search
   * using the specified vector column of the table. The search results are ordered by vector similarity score
   * in descending order, unless an additional ordering is specified in the query builder parameters.
   *
   * @typeParam TSearch - The parameters required for the vector search, including the prompt, vector column,
   * and optional embedding parameters specific to the AI model being used.
   * @typeParam TParams - The query builder parameters used to refine the search query, such as filters,
   * groupings, orderings, limits, and offsets.
   *
   * @param {TParams} params - The search parameters object containing:
   *   - `prompt`: The search prompt to be converted into an embedding.
   *   - `vectorColumn`: The name of the vector column in the table to compare against the prompt embedding.
   *   - `embeddingParams` (optional): Additional parameters for creating the prompt embedding, if supported by the AI model.
   * @param {TQueryParams} [queryParams] - Optional query builder parameters to refine the search, such as filters,
   * groupings, orderings, limits, and offsets.
   *
   * @returns {Promise<(ExtractQuerySelectedColumn<TType["columns"], TQueryParams> & { [K in VectorScoreKey]: number } & RowDataPacket)[]>}
   * A promise that resolves to an array of rows matching the vector search criteria, each row including
   * the selected columns and a vector similarity score.
   */
  async vectorSearch<
    TParams extends {
      prompt: string;
      vectorColumn: TableColumnName<TType>;
      embeddingParams?: TAi extends AnyAI ? Parameters<TAi["embeddings"]["create"]>[1] : never;
    },
    TQueryParams extends QueryBuilderParams<TName, TDatabaseType, any>,
  >(
    params: TParams,
    queryParams?: TQueryParams,
  ): Promise<
    (ExtractQuerySelectedColumn<TType["columns"], TQueryParams> & { [K in VectorScoreKey]: number } & RowDataPacket)[]
  > {
    type SelectedColumn = ExtractQuerySelectedColumn<TType["columns"], TQueryParams>;
    type ResultColumn = SelectedColumn & { [K in VectorScoreKey]: number };

    const clauses = new QueryBuilder<TName, TDatabaseType>(this.databaseName, this.name).buildClauses(queryParams);
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

  /**
   * Creates a chat completion based on a provided prompt, system role, and optional template.
   *
   * This method first performs a vector search to find the most relevant context for the given prompt.
   * It then formats the prompt using a template and generates a chat completion using an AI model.
   * The system role can be customized to guide the AI's behavior during the completion.
   *
   * @typeParam TParams - The parameters required to create a chat completion, including the prompt, vector search parameters,
   * optional system role, template, and additional parameters specific to the AI model being used.
   * @typeParam TQueryParams - The query builder parameters used to refine the vector search query, such as filters,
   * groupings, orderings, limits, and offsets.
   *
   * @param {TParams} params - The parameters object containing:
   *   - `prompt`: The initial user prompt to generate a response for.
   *   - `systemRole` (optional): The system role for guiding the AI's behavior during the chat completion.
   *   - `template` (optional): A template to structure the prompt for the chat completion.
   *   - `vectorColumn`: The name of the vector column to be used in the vector search.
   *   - `embeddingParams` (optional): Additional parameters for creating the prompt embedding, if supported by the AI model.
   *   - Additional parameters required by the AI's `chatCompletions.create` method.
   * @param {TQueryParams} [queryParams] - Optional query builder parameters to refine the vector search, such as filters,
   * groupings, orderings, limits, and offsets.
   *
   * @returns {Promise<CreateChatCompletionResult<TParams["stream"]>>}
   * A promise that resolves to the result of the chat completion, containing the generated response
   * based on the input parameters and the provided context.
   */

  async createChatCompletion<
    TParams extends Parameters<this["vectorSearch"]>[0] &
      (TAi extends AnyAI ? Parameters<TAi["chatCompletions"]["create"]>[0] : never) & { template?: string },
    TQueryParams extends QueryBuilderParams<TName, TDatabaseType, any>,
  >(params: TParams, queryParams?: TQueryParams): Promise<CreateChatCompletionResult<TParams["stream"]>> {
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
