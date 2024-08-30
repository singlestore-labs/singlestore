import { createPool, type Pool, type PoolOptions } from "mysql2/promise";

/**
 * Configuration object for initializing a database connection.
 *
 * This interface extends `Partial<Omit<PoolOptions, "name" | "database">>`, allowing customization
 * of any connection pool options provided by the `mysql2` library, except for the `name` and `database`
 * properties which are explicitly omitted.
 *
 * @interface ConnectionConfig
 */
export interface ConnectionConfig extends Partial<Omit<PoolOptions, "name" | "database">> {}

/**
 * Class representing a MySQL database connection, utilizing a connection pool for efficient
 * management of multiple connections. Provides methods to establish and close connections.
 */
export class Connection {
  /**
   * The MySQL connection pool instance created using the provided configuration options.
   *
   * @type {Pool}
   */
  client: Pool;

  /**
   * Initializes a new instance of the `Connection` class and sets up a connection pool with the specified
   * configuration options.
   *
   * @param {ConnectionConfig} config - The configuration object containing options for the connection pool.
   * This allows customization of settings such as host, port, user, password, and other connection-related parameters.
   */
  constructor(public config: ConnectionConfig) {
    this.client = createPool({ multipleStatements: true, ...this.config });
  }

  /**
   * Factory method to create a new `Connection` instance.
   *
   * @param {ConnectionConfig} config - The configuration object containing options for the connection pool.
   * This includes settings for customizing the connection pool behavior.
   *
   * @returns {Connection} A new `Connection` instance with an initialized connection pool.
   */
  static create(config: ConnectionConfig): Connection {
    return new Connection(config);
  }

  /**
   * Closes the connection pool, effectively disconnecting from the MySQL database.
   * This method should be called when the database connection is no longer needed to release resources.
   *
   * @returns {Promise<void>} A promise that resolves when the connection pool has been successfully closed.
   */
  async disconnect(): Promise<void> {
    await this.client.end();
  }
}
