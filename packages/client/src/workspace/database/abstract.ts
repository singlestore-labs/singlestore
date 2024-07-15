import { KaiWorkspaceConnection } from "../connection/kai";
import { SQLWorkspaceConnection } from "../connection/sql";
import { WorkspaceType } from "../types";

export abstract class AbstractWorkspaceDatabase<T extends WorkspaceType = any> {
  constructor(protected connection: T extends "sql" ? SQLWorkspaceConnection : KaiWorkspaceConnection) {}

  abstract create(): Promise<void>;

  abstract drop(): Promise<void>;
}
