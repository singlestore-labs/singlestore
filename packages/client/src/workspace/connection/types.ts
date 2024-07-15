import { WorkspaceType } from "../types";
import { KaiWorkspaceConnection } from "./kai";
import { SQLWorkspaceConnection } from "./sql";

export type WorkspaceConnection<T extends WorkspaceType = any> = T extends "sql"
  ? SQLWorkspaceConnection
  : KaiWorkspaceConnection;
