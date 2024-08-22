import type { QueryFilters } from "./query/filters/builder";
import type { ExtractQueryColumns, ExtractQueryOptions } from "./query/types";
import type { AnyAI, CreateChatCompletionResult } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { Column, ColumnInfo, type ColumnSchema, type ColumnType } from "./column";
import { Connection } from "./connection";
import { QueryBuilder, type QueryBuilderArgs } from "./query/builder";

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
 * @typeParam T - A type extending `TableType` that defines the structure of the table.
 *
 * @property {string} name - The name of the table.
 * @property {Object} columns - An object where each key is a column name and each value is the schema of that column, excluding the name.
 * @property {string[]} [primaryKeys] - An optional array of column names that form the primary key.
 * @property {string[]} [fulltextKeys] - An optional array of column names that form full-text keys.
 * @property {string[]} [clauses] - An optional array of additional SQL clauses for the table definition.
 */
export interface TableSchema<T extends TableType> {
  name: string;
  columns: { [K in keyof T["columns"]]: Omit<ColumnSchema, "name"> };
  primaryKeys?: string[];
  fulltextKeys?: string[];
  clauses?: string[];
}

/**
 * Interface representing basic information about a table.
 *
 * @typeParam T - A string literal representing the table name.
 *
 * @property {T} name - The name of the table.
 */
export interface TableInfo<T extends string> {
  name: T;
}

/**
 * Interface extending `TableInfo` to include additional details about the table's type, distribution, and storage.
 *
 * @typeParam T - A string literal representing the table name.
 *
 * @property {string} tableType - The type of the table.
 * @property {boolean} distributed - Indicates whether the table is distributed.
 * @property {string} storageType - The storage type of the table.
 */
export interface TableInfoExtended<T extends string> extends TableInfo<T> {
  tableType: string;
  distributed: boolean;
  storageType: string;
}

/**
 * Type representing the name of a column within a specific table type.
 *
 * @typeParam T - The type of the table.
 */
export type TableColumnName<T extends TableType> = Extract<keyof T["columns"], string>;

/**
 * Type representing a key used for vector scoring in vector search queries.
 */
type VectorScoreKey = "v_score";

/**
 * Class representing a table in SingleStore, providing methods to manage its columns, query data, and perform vector search.
 *
 * @typeParam T - The type of the table, which extends `TableType`.
 * @typeParam U - The type of AI functionalities integrated with the table, which can be undefined.
 *
 * @property {Connection} _connection - The connection to the database containing the table.
 * @property {string} databaseName - The name of the database containing the table.
 * @property {string} name - The name of the table.
 * @property {U} [ai] - Optional AI functionalities associated with the table.
 * @property {string} _path - The full path of the table, composed of the database name and table name.
 * @property {VectorScoreKey} vScoreKey - The key used for vector scoring in vector search queries, defaulting to `"v_score"`.
 */
export class Table<T extends TableType = TableType, U extends AnyAI | undefined = undefined> {
  private _path: string;
  vScoreKey: VectorScoreKey = "v_score";

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
      throw new Error("AnyAI instance is undefined. Ensure ai is properly initialized before accessing.");
    }

    return this._ai;
  }

  /**
   * Normalizes raw table information into a structured object.
   *
   * @typeParam T - A string literal representing the table name.
   * @typeParam U - A boolean indicating whether extended information is requested.
   *
   * @param {any} info - The raw table information to normalize.
   * @param {U} [extended] - Whether to include extended information.
   *
   * @returns {U extends true ? TableInfoExtended<T> : TableInfo<T>} A structured object containing normalized table information.
   */
  static normalizeInfo<T extends string, U extends boolean>(
    info: any,
    extended?: U,
  ): U extends true ? TableInfoExtended<T> : TableInfo<T> {
    const name = info[Object.keys(info).find((key) => key.startsWith("Tables_in_")) as string];
    if (!extended) return { name } as U extends true ? TableInfoExtended<T> : TableInfo<T>;

    return {
      name,
      tableType: info.Table_type,
      distributed: !!info.distributed,
      storageType: info.Storage_type,
    } as U extends true ? TableInfoExtended<T> : TableInfo<T>;
  }

  /**
   * Converts a `TableSchema` object into an SQL table definition string.
   *
   * @param {TableSchema<any>} schema - The schema of the table to be converted.
   *
   * @returns {string} An SQL string representing the table definition.
   */
  static schemaToClauses(schema: TableSchema<any>): string {
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
   * @typeParam T - The type of the table to create.
   * @typeParam U - The type of AI functionalities associated with the table, which can be undefined.
   *
   * @param {Connection} connection - The connection to the database.
   * @param {string} databaseName - The name of the database where the table will be created.
   * @param {TableSchema<T>} schema - The schema defining the structure of the table.
   * @param {U} [ai] - Optional AI functionalities to associate with the table.
   *
   * @returns {Promise<Table<T, U>>} A promise that resolves to the created `Table` instance.
   */
  static async create<T extends TableType = TableType, U extends AnyAI | undefined = undefined>(
    connection: Connection,
    databaseName: string,
    schema: TableSchema<T>,
    ai?: U,
  ): Promise<Table<T, U>> {
    const clauses = Table.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${databaseName}.${schema.name} (${clauses})
    `);

    return new Table<T, U>(connection, databaseName, schema.name, ai);
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
   * @typeParam K - A boolean indicating whether extended information is requested.
   *
   * @param {K} [extended] - Whether to include extended information.
   *
   * @returns {Promise<K extends true ? TableInfoExtended<string> : TableInfo<string>>} A promise that resolves to the table information.
   */
  async showInfo<K extends boolean = false>(
    extended?: K,
  ): Promise<K extends true ? TableInfoExtended<string> : TableInfo<string>> {
    const clauses = [`SHOW TABLES IN ${this.databaseName}`];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Table.normalizeInfo<string, K>(rows[0], extended);
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
   * @param {TableColumnName<T> | (string & {})} name - The name of the column to retrieve.
   *
   * @returns {Column} A `Column` instance representing the specified column.
   */
  column(name: TableColumnName<T> | (string & {})): Column {
    return new Column(this._connection, this.databaseName, this.name, name as string);
  }

  /**
   * Retrieves information about all columns in the table.
   *
   * @returns {Promise<ColumnInfo<TableColumnName<T>>[]>} A promise that resolves to an array of column information objects.
   */
  async showColumnsInfo(): Promise<ColumnInfo<TableColumnName<T>>[]> {
    const [rows] = await this._connection.client.query<any[]>(`SHOW COLUMNS IN ${this.name} IN ${this.databaseName}`);
    return rows.map((row) => Column.normalizeInfo<TableColumnName<T>>(row));
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
   * @param {TableColumnName<T> | (string & {})} name - The name of the column to drop.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the column is dropped.
   */
  dropColumn(name: TableColumnName<T> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
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

    this.name = newName;
    this._path = [this.databaseName, newName].join(".");

    return result;
  }

  /**
   * Inserts one or more rows into the table.
   *
   * @param {Partial<T["columns"]> | Partial<T["columns"]>[]} values - The values to insert into the table. Can be a single row or an array of rows.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]][]>} A promise that resolves to an array of `ResultSetHeader` objects for each inserted row.
   */
  insert(values: Partial<T["columns"]> | Partial<T["columns"]>[]): Promise<[ResultSetHeader, FieldPacket[]][]> {
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
   * Selects rows from the table based on the specified query arguments.
   *
   * @typeParam K - The type of the query builder arguments.
   *
   * @param {...K} args - The arguments defining the query, including selected columns, filters, and other options.
   *
   * @returns {Promise<(ExtractQueryColumns<T["columns"], ExtractQueryOptions<K>> & RowDataPacket)[]>} A promise that resolves to an array of selected rows.
   */
  async select<K extends QueryBuilderArgs<T["columns"]>>(...args: K) {
    type Options = ExtractQueryOptions<K>;
    type SelectedColumns = ExtractQueryColumns<T["columns"], Options>;
    const { columns, clause, values } = new QueryBuilder(...args);
    const query = `SELECT ${columns} FROM ${this._path} ${clause}`;
    const [rows] = await this._connection.client.execute<(SelectedColumns & RowDataPacket)[]>(query, values);
    return rows;
  }

  /**
   * Updates rows in the table based on the specified values and filters.
   *
   * @param {Partial<T["columns"]>} values - The values to update in the table.
   * @param {QueryFilters<T["columns"]>} filters - The filters to apply to the update query.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the update is complete.
   */
  update(values: Partial<T["columns"]>, filters: QueryFilters<T["columns"]>): Promise<[ResultSetHeader, FieldPacket[]]> {
    const { clause, values: _values } = new QueryBuilder(filters);

    const columnAssignments = Object.keys(values)
      .map((key) => `${key} = ?`)
      .join(", ");

    const query = `UPDATE ${this._path} SET ${columnAssignments} ${clause}`;
    return this._connection.client.execute<ResultSetHeader>(query, [...Object.values(values), ..._values]);
  }

  /**
   * Deletes rows from the table based on the specified filters. If no filters are provided, the table is truncated.
   *
   * @param {QueryFilters<T["columns"]>} [filters] - The filters to apply to the delete query.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the delete operation is complete.
   */
  delete(filters?: QueryFilters<T["columns"]>): Promise<[ResultSetHeader, FieldPacket[]]> {
    if (!filters) return this.truncate();
    const { clause, values } = new QueryBuilder(filters);
    const query = `DELETE FROM ${this._path} ${clause}`;
    return this._connection.client.execute<ResultSetHeader>(query, values);
  }

  /**
   * Performs a vector search on the table using a prompt and a vector column.
   *
   * @typeParam K - The parameters required for the vector search, including the prompt and vector column.
   * @typeParam V - The query builder arguments used to refine the search.
   *
   * @param {...[params: K, ...V]} args - The arguments defining the vector search, including the prompt, vector column, and query options.
   *
   * @returns {Promise<(ExtractQueryColumns<T["columns"], ExtractQueryOptions<V>> & { [K in VectorScoreKey]: number } & RowDataPacket)[]>} A promise that resolves to an array of rows matching the vector search.
   */
  async vectorSearch<
    K extends {
      prompt: string;
      vectorColumn: TableColumnName<T>;
      embeddingParams?: U extends AnyAI ? Parameters<U["embeddings"]["create"]>[1] : never;
    },
    V extends QueryBuilderArgs<T["columns"]>,
  >(...args: [params: K, ...V]) {
    const [{ prompt, vectorColumn }, ...queryBuilderArgs] = args;

    type _QueryBuilderArgs = V extends QueryBuilderArgs<T["columns"]> ? V : never;
    type Options = ExtractQueryOptions<_QueryBuilderArgs>;
    type SelectedColumns = ExtractQueryColumns<T["columns"], Options> & { [K in VectorScoreKey]: number };

    const { columns, clauses, values } = new QueryBuilder<T["columns"]>(...queryBuilderArgs);
    const promptEmbedding = (await this.ai.embeddings.create(prompt))[0] || [];
    let orderByClause = `ORDER BY ${this.vScoreKey} DESC`;

    if (clauses.orderBy) {
      orderByClause += clauses.orderBy.replace(/^ORDER BY /, ", ");
    }

    const query = `\
      SET @promptEmbedding = '${JSON.stringify(promptEmbedding)}' :> vector(${promptEmbedding.length}) :> blob;
      SELECT ${[columns, `${vectorColumn} <*> @promptEmbedding AS ${this.vScoreKey}`].join(", ")}
      FROM ${this._path}
      ${[clauses.where, clauses.groupBy, orderByClause, clauses.limit].join(" ")}
    `;

    const [rows] = await this._connection.client.execute<[any, (SelectedColumns & RowDataPacket)[]]>(query, values);
    return rows[1];
  }

  /**
   * Creates a chat completion using a vector search to provide context, and generates a response based on the prompt.
   *
   * @typeParam K - The parameters required for the vector search and chat completion, including the prompt and vector column.
   * @typeParam V - The query builder arguments used to refine the search.
   *
   * @param {...[params: K, ...V]} args - The arguments defining the chat completion, including the prompt, vector column, and query options.
   *
   * @returns {Promise<CreateChatCompletionResult<K["stream"]>>} A promise that resolves to the chat completion result.
   */
  async createChatCompletion<
    K extends Parameters<this["vectorSearch"]>[0] &
      (U extends AnyAI ? Parameters<U["chatCompletions"]["create"]>[0] : never) & { template?: string },
    V extends QueryBuilderArgs<T["columns"]>,
  >(...args: [params: K, ...V]): Promise<CreateChatCompletionResult<K["stream"]>> {
    const [
      { prompt, vectorColumn, template, systemRole, embeddingParams, ...createChatCompletionParams },
      ...vectorSearchArgs
    ] = args;

    const _systemRole =
      systemRole ??
      `\
      You are a helpful assistant.\
      Answer the user's question based on the context provided.\
      If the context provided doesn't answer the question asked don't answer the user's question.\
      `;

    const _template = template ?? `The user asked: <question>\nThe most similar context: <context>`;
    const context = prompt ? await this.vectorSearch({ prompt, vectorColumn, embeddingParams }, ...vectorSearchArgs) : "";
    const _prompt = _template.replace("<question>", prompt).replace("<context>", JSON.stringify(context));
    return (await this.ai.chatCompletions.create({
      ...createChatCompletionParams,
      prompt: _prompt,
      systemRole: _systemRole,
    })) as CreateChatCompletionResult<K["stream"]>;
  }
}
