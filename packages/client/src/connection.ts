import { createPool, type Pool, type PoolOptions } from "mysql2/promise";

export interface ConnectionConfig extends Partial<Omit<PoolOptions, "name">> {}

export type ConnectionClient = Pool;

export class Connection {
  client: ConnectionClient;

  constructor(public config: ConnectionConfig) {
    this.client = createPool({ multipleStatements: true, ...this.config });
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }
}
