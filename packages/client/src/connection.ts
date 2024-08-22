import { createPool, type Pool, type PoolOptions } from "mysql2/promise";

/**
 * Configuration object for initializing a database connection.
 *
 * Extends `Partial<Omit<PoolOptions, "name" | "database">>` to allow the configuration of any `PoolOptions`
 * properties except `name` and `database`, which are omitted.
 */
export interface ConnectionConfig extends Partial<Omit<PoolOptions, "name" | "database">> {}

/**
 * Class representing a database connection, providing methods to manage the connection pool.
 *
 * @property {Pool} client - The MySQL connection pool created with the provided configuration.
 */
export class Connection {
  client: Pool;

  /**
   * Constructs a new `Connection` instance and initializes the connection pool.
   *
   * @param {ConnectionConfig} config - The configuration object for the connection pool.
   */
  constructor(public config: ConnectionConfig) {
    this.client = createPool({ multipleStatements: true, ...this.config });
  }

  /**
   * Factory method to create a new `Connection` instance.
   *
   * @param {ConnectionConfig} config - The configuration object for the connection pool.
   *
   * @returns {Connection} A new `Connection` instance.
   */
  static create(config: ConnectionConfig): Connection {
    return new Connection(config);
  }

  /**
   * Disconnects from the database by closing the connection pool.
   *
   * @returns {Promise<void>} A promise that resolves when the connection pool is closed.
   */
  async disconnect(): Promise<void> {
    await this.client.end();
  }
}
