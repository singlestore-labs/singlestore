import type { Connection } from "./connection";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

/**
 * Represents a type for database column definitions.
 * This is currently set to `any` to allow flexibility in defining various column types.
 *
 * @typedef {any} ColumnType
 */
export type ColumnType = any;

/**
 * Interface representing the schema of a database column.
 *
 * @interface ColumnSchema
 * @property {string} name - The name of the column.
 * @property {string} type - The SQL data type of the column.
 * @property {boolean} [nullable] - Indicates whether the column allows NULL values.
 * @property {boolean} [primaryKey] - Indicates whether the column is a primary key.
 * @property {boolean} [autoIncrement] - Indicates whether the column is auto-incremented.
 * @property {any} [default] - The default value for the column.
 * @property {string[]} [clauses] - Additional SQL clauses for the column definition.
 */
export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  default?: any;
  clauses?: string[];
}

/**
 * Interface representing information about a column in the database.
 *
 * @interface ColumnInfo
 * @typeParam T - A string literal representing the column name.
 * @property {T} name - The name of the column.
 * @property {string} type - The SQL data type of the column.
 * @property {string} null - Indicates whether the column allows NULL values (`"YES"` or `"NO"`).
 * @property {string} key - The key type of the column (`"PRI"` for primary key, `"UNI"` for unique key, etc.).
 * @property {any} default - The default value for the column.
 * @property {string} extra - Any extra information about the column (e.g., `auto_increment`).
 */
export interface ColumnInfo<T extends string = string> {
  name: T;
  type: string;
  null: string;
  key: string;
  default: any;
  extra: string;
}

/**
 * Class representing a database column and providing methods to manage its schema.
 */
export class Column {
  private _path: string;

  /**
   * Constructs a new `Column` instance.
   *
   * @param {Connection} _connection - The database connection used to execute queries.
   * @param {string} databaseName - The name of the database containing the column.
   * @param {string} tableName - The name of the table containing the column.
   * @param {string} name - The name of the column.
   */
  constructor(
    private _connection: Connection,
    public databaseName: string,
    public tableName: string,
    public name: string,
  ) {
    this._path = [databaseName, tableName].join(".");
  }

  /**
   * Normalizes raw database column information into a structured `ColumnInfo` object.
   *
   * @typeParam T - A string literal representing the column name.
   * @param {any} info - Raw column information from the database.
   * @returns {ColumnInfo<T>} A structured `ColumnInfo` object.
   */
  static normalizeInfo<T extends string = string>(info: any): ColumnInfo<T> {
    return {
      name: info.Field,
      type: info.Type,
      null: info.Null,
      key: info.Key,
      default: info.Default,
      extra: info.Extra,
    };
  }

  /**
   * Converts a `ColumnSchema` object into an SQL column definition string.
   *
   * @param {ColumnSchema} schema - The schema of the column to be converted.
   * @returns {string} An SQL string representing the column definition.
   */
  static schemaToClauses(schema: ColumnSchema): string {
    const clauses: string[] = [`\`${schema.name}\``];
    if (schema.type) clauses.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) clauses.push("NOT NULL");
    if (schema.primaryKey) clauses.push("PRIMARY KEY");
    if (schema.autoIncrement) clauses.push("AUTO_INCREMENT");
    if (schema.default !== undefined) clauses.push(`DEFAULT ${schema.default}`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(" ");
  }

  /**
   * Adds a new column to a specified table in the database.
   *
   * @param {Connection} connection - The database connection used to execute the query.
   * @param {string} databaseName - The name of the database where the table is located.
   * @param {string} tableName - The name of the table where the column will be added.
   * @param {ColumnSchema} schema - The schema of the column to be added.
   * @returns {Promise<Column>} A promise that resolves to the created `Column` instance.
   */
  static async add(connection: Connection, databaseName: string, tableName: string, schema: ColumnSchema): Promise<Column> {
    const clauses = Column.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} ADD COLUMN ${clauses}
    `);

    return new Column(connection, databaseName, tableName, schema.name);
  }

  /**
   * Drops a column from a specified table in the database.
   *
   * @param {Connection} connection - The database connection used to execute the query.
   * @param {string} databaseName - The name of the database where the table is located.
   * @param {string} tableName - The name of the table containing the column.
   * @param {string} name - The name of the column to be dropped.
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the column is dropped.
   */
  static drop(
    connection: Connection,
    databaseName: string,
    tableName: string,
    name: string,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} DROP COLUMN ${name}
    `);
  }

  /**
   * Retrieves information about the current column from the database.
   *
   * @returns {Promise<ColumnInfo<string>>} A promise that resolves to the `ColumnInfo` object containing details about the column.
   */
  async showInfo(): Promise<ColumnInfo<string>> {
    const [rows] = await this._connection.client.query<any[]>(
      `SHOW COLUMNS IN ${this.tableName} IN ${this.databaseName} LIKE '${this.name}'`,
    );

    return Column.normalizeInfo<string>(rows[0]);
  }

  /**
   * Drops the current column from the table.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the column is dropped.
   */
  drop(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Column.drop(this._connection, this.databaseName, this.tableName, this.name);
  }

  /**
   * Modifies the current column in the table based on the provided schema.
   *
   * @param {Partial<Omit<ColumnSchema, "name">>} schema - The schema containing modifications to be applied to the column.
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the column is modified.
   */
  modify(schema: Partial<Omit<ColumnSchema, "name">>): Promise<[ResultSetHeader, FieldPacket[]]> {
    const clauses = Column.schemaToClauses({ type: "", ...schema, name: this.name });

    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} MODIFY COLUMN ${clauses}
    `);
  }

  /**
   * Renames the current column in the table.
   *
   * @param {string} newName - The new name for the column.
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the column is renamed.
   */
  async rename(newName: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} CHANGE ${this.name} ${newName}
    `);

    this.name = newName;

    return result;
  }
}
