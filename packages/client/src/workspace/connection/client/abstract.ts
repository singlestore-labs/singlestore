export abstract class WorkspaceConnectionClient {
  abstract readonly type: string;
  readonly config: any;
  protected abstract _connection: any;

  constructor(config: any) {
    this.config = config;
  }

  get connection() {
    if (!this._connection) throw new Error("Not connected");
    return this._connection;
  }

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;
}
