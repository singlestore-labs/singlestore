import { WorkspaceConnectionClient, WorkspaceConnectionClientType } from "./client";
import { isKaiWorkspaceClientConfig, KaiWorkspaceConnectionClient } from "./client/kai";
import { isSQLWorkspaceClientConfig, SQLWorkspaceConnectionClient } from "./client/sql";

export class WorkspaceConnection<T extends WorkspaceConnectionClientType = any> {
  constructor(private _client: SQLWorkspaceConnectionClient | KaiWorkspaceConnectionClient) {
    this._client = _client;
  }

  static async create<T extends WorkspaceConnectionClientType>(type: T, config: WorkspaceConnectionClient<T>["config"]) {
    let client: SQLWorkspaceConnectionClient | KaiWorkspaceConnectionClient;

    if (type === "sql") {
      if (!isSQLWorkspaceClientConfig(config)) throw new Error("Invalid config");
      client = new SQLWorkspaceConnectionClient(config);
    } else if (type === "kai") {
      if (!isKaiWorkspaceClientConfig(config)) throw new Error("Invalid config");
      client = new KaiWorkspaceConnectionClient(config);
    } else {
      throw new Error("Unsupported connection type");
    }

    await client.connect();
    return new WorkspaceConnection<T>(client);
  }

  get client(): WorkspaceConnectionClient<T>["connection"] {
    return this._client.connection;
  }

  get type(): WorkspaceConnectionClient<T>["type"] {
    return this._client.type;
  }

  get config(): WorkspaceConnectionClient<T>["config"] {
    return this._client.config;
  }
}
