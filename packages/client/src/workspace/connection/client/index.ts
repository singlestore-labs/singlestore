import { KaiWorkspaceConnectionClient } from "./kai";
import { SQLWorkspaceConnectionClient } from "./sql";

export type WorkspaceConnectionClientType = SQLWorkspaceConnectionClient["type"] | KaiWorkspaceConnectionClient["type"];

export type WorkspaceConnectionClient<T extends WorkspaceConnectionClientType> = T extends "sql"
  ? SQLWorkspaceConnectionClient
  : KaiWorkspaceConnectionClient;
